import { BASE_FEE, Contract, scValToNative, TransactionBuilder, rpc, xdr } from '@stellar/stellar-sdk';

import type { BadgeRecord, EventRecord } from './badge';
import type { AppConfig } from './network';
import {
  addressToScVal,
  bytes32ToScVal,
  scValToBadges,
  scValToEvent,
  u32ToScVal,
  u64ToScVal,
} from './scval';

const RPC_TIMEOUT_MS = 15_000;
const RPC_MAX_RETRIES = 3;
const RPC_BACKOFF_BASE_MS = 500;

/**
 * Bounds a single RPC attempt: rejects if `promise` doesn't settle within
 * `ms`. The v17 SDK methods don't accept an `AbortSignal`, so the original
 * promise is left to settle silently in the background.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('the network timed out. Please try again.')), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

/**
 * Retries an RPC call with exponential backoff, bounded by RPC_MAX_RETRIES.
 * Only transient failures (timeouts, connection drops) trigger a retry —
 * contract errors arrive as structured results, not thrown errors.
 */
async function retryRpc<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RPC_MAX_RETRIES; attempt++) {
    try {
      return await withTimeout(fn(), RPC_TIMEOUT_MS);
    } catch (err) {
      lastError = err;
      if (attempt < RPC_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RPC_BACKOFF_BASE_MS * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Talks to the deployed `eventbadges` contract over Stellar RPC.
 *
 * Every method name and argument order below matches `src/lib.rs` in
 * `eventbadges-contracts` one for one: `get_event(u64)`, `has_badge(u64,
 * Address)`, `badges_of(u64, Address)`, `create_event(Address, BytesN<32>,
 * BytesN<32>, u32, u64)`, `claim(u64, Address, Bytes)`, `award(u64, Address)`,
 * `revoke(u64, Address)`.
 *
 * Writes follow the standard Soroban flow: build, simulate, assemble the
 * simulation's footprint and fees, sign with the wallet, submit, poll. Contract
 * errors surface during simulation, which is what makes the mapping in
 * `contractErrors.ts` useful — by the time a transaction is submitted, the
 * contract's own validation has already passed.
 *
 * Nothing here has been exercised against a deployed contract: no testnet
 * deployment exists yet. See the README, "What is proven vs assumed".
 */
export class ContractCallError extends Error {
  /** The raw host or RPC message, read back by `describeContractError`. */
  readonly raw: string;

  constructor(raw: string) {
    super(raw);
    this.name = 'ContractCallError';
    this.raw = raw;
  }
}

export interface PreparedCall {
  /** Unsigned transaction XDR, ready for the wallet to sign. */
  readonly xdr: string;
}

export interface SubmitResult {
  /** The transaction hash — the receipt the user keeps. */
  readonly hash: string;
  /**
   * The contract's return value, when the call returned one. `create_event`
   * returns the new event id here.
   */
  readonly returnValue?: xdr.ScVal;
}

export interface ContractClient {
  getEvent(source: string, eventId: bigint): Promise<EventRecord>;
  hasBadge(source: string, eventId: bigint, attendee: string): Promise<boolean>;
  badgesOf(source: string, eventId: bigint, attendee: string): Promise<BadgeRecord[]>;
  prepareCreateEvent(input: {
    source: string;
    organizer: string;
    nameHash: Uint8Array;
    claimCodeHash: Uint8Array;
    maxClaims: number;
    closesAt: bigint;
  }): Promise<PreparedCall>;
  prepareClaim(input: {
    source: string;
    eventId: bigint;
    attendee: string;
    claimCode: Uint8Array;
  }): Promise<PreparedCall>;
  prepareAward(input: { source: string; eventId: bigint; attendee: string }): Promise<PreparedCall>;
  prepareRevoke(input: { source: string; eventId: bigint; attendee: string }): Promise<PreparedCall>;
  /** Submits a signed transaction and returns its hash and return value. */
  submit(signedXdr: string): Promise<SubmitResult>;
}

const ARCHIVED_MESSAGE =
  'This record has been archived by the network and must be restored before it can be used. ' +
  'This app cannot restore archived records yet.';

export function createContractClient(config: AppConfig): ContractClient {
  const server = new rpc.Server(config.rpcUrl);
  const contract = new Contract(config.contractId);

  /**
   * Builds the unsigned transaction. Reads and writes both need a source
   * account: the app uses the connected wallet's address and never holds a
   * secret key of its own.
   */
  async function buildTransaction(source: string, method: string, args: xdr.ScVal[]) {
    const account = await retryRpc(() => server.getAccount(source));
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.passphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(60)
      .build();
  }

  /**
   * Simulates a call and, on success, returns the assembled transaction XDR.
   * Throws `ContractCallError` for a contract error, an archived record, or any
   * other simulation failure.
   */
  async function assemble(source: string, method: string, args: xdr.ScVal[]): Promise<string> {
    const tx = await buildTransaction(source, method, args);
    const simulation = await retryRpc(() => server.simulateTransaction(tx));

    if (rpc.Api.isSimulationRestore(simulation)) {
      // A record archived after nobody touched it for long enough. v0 has no
      // restore flow, so say that plainly instead of failing cryptically.
      throw new ContractCallError(ARCHIVED_MESSAGE);
    }
    if (rpc.Api.isSimulationError(simulation)) {
      throw new ContractCallError(simulation.error);
    }
    return rpc.assembleTransaction(tx, simulation).build().toXDR();
  }

  /** Simulates a read-only call and returns the raw return value. */
  async function read(source: string, method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
    const tx = await buildTransaction(source, method, args);
    const simulation = await retryRpc(() => server.simulateTransaction(tx));

    if (rpc.Api.isSimulationRestore(simulation)) {
      throw new ContractCallError(ARCHIVED_MESSAGE);
    }
    if (rpc.Api.isSimulationError(simulation)) {
      throw new ContractCallError(simulation.error);
    }
    if (!rpc.Api.isSimulationSuccess(simulation) || simulation.result === undefined) {
      throw new ContractCallError(`the contract returned no result for ${method}`);
    }
    return simulation.result.retval;
  }

  return {
    async getEvent(source, eventId) {
      return scValToEvent(await read(source, 'get_event', [u64ToScVal(eventId)]));
    },

    async hasBadge(source, eventId, attendee) {
      const value = scValToNative(
        await read(source, 'has_badge', [u64ToScVal(eventId), addressToScVal(attendee)]),
      );
      if (typeof value !== 'boolean') {
        throw new Error('the contract returned an unexpected value for has_badge');
      }
      return value;
    },

    async badgesOf(source, eventId, attendee) {
      return scValToBadges(
        await read(source, 'badges_of', [u64ToScVal(eventId), addressToScVal(attendee)]),
      );
    },

    async prepareCreateEvent({ source, organizer, nameHash, claimCodeHash, maxClaims, closesAt }) {
      return {
        xdr: await assemble(source, 'create_event', [
          addressToScVal(organizer),
          bytes32ToScVal(nameHash),
          bytes32ToScVal(claimCodeHash),
          u32ToScVal(maxClaims),
          u64ToScVal(closesAt),
        ]),
      };
    },

    async prepareClaim({ source, eventId, attendee, claimCode }) {
      return {
        xdr: await assemble(source, 'claim', [
          u64ToScVal(eventId),
          addressToScVal(attendee),
          // `claim` takes a variable-length `Bytes`; the code is exactly 32.
          nativeBytesToScVal(claimCode),
        ]),
      };
    },

    async prepareAward({ source, eventId, attendee }) {
      return {
        xdr: await assemble(source, 'award', [
          u64ToScVal(eventId),
          addressToScVal(attendee),
        ]),
      };
    },

    async prepareRevoke({ source, eventId, attendee }) {
      return {
        xdr: await assemble(source, 'revoke', [
          u64ToScVal(eventId),
          addressToScVal(attendee),
        ]),
      };
    },

    async submit(signedXdr) {
      const tx = TransactionBuilder.fromXDR(signedXdr, config.passphrase);
      const sent = await server.sendTransaction(tx);

      // `SendTransactionStatus` is a string union, not an enum, so these are
      // compared as literals (checked by the compiler against the SDK types).
      if (sent.status === 'ERROR') {
        throw new ContractCallError(`the network rejected this transaction (${sent.hash})`);
      }
      if (sent.status === 'TRY_AGAIN_LATER') {
        throw new ContractCallError('the network is busy. Please try again in a moment.');
      }

      const result = await retryRpc(() => server.pollTransaction(sent.hash));
      if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return result.returnValue === undefined
          ? { hash: sent.hash }
          : { hash: sent.hash, returnValue: result.returnValue };
      }
      if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
        // The contract's own checks already ran during simulation, so a failure
        // here is not one of the codes in ERRORS.md. Report the hash rather than
        // inventing wording for it.
        throw new ContractCallError(`this transaction failed on testnet (${sent.hash})`);
      }
      throw new ContractCallError(
        `this transaction was not confirmed in time. Check it before retrying (${sent.hash})`,
      );
    },
  };
}

import { nativeToScVal } from '@stellar/stellar-sdk';

/** `Bytes` (variable length) — used by `claim` for the 32-byte claim code. */
function nativeBytesToScVal(bytes: Uint8Array): xdr.ScVal {
  return nativeToScVal(bytes, { type: 'bytes' });
}
