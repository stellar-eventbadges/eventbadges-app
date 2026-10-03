import type { ContractClient, PreparedCall, SubmitResult } from './contract';
import { WRONG_NETWORK_MESSAGE } from './contractErrors';
import { checkWalletNetwork, signWithWallet } from './wallet';

/** Thrown when the wallet is not on testnet. The app refuses to go further. */
export class WrongNetworkError extends Error {
  /** The passphrase the wallet reported, for the diagnostic line. */
  readonly passphrase: string;

  constructor(passphrase: string) {
    super(WRONG_NETWORK_MESSAGE);
    this.name = 'WrongNetworkError';
    this.passphrase = passphrase;
  }
}

/**
 * The one path every write takes:
 *
 * 1. re-read the wallet's current network and refuse anything but testnet;
 * 2. ask the contract client to simulate and assemble the call;
 * 3. hand the unsigned XDR to the wallet to sign;
 * 4. submit and wait for the hash.
 *
 * The order matters: the network check happens before any transaction is built,
 * so the app never even prepares a call on a network it will not operate on.
 */
export async function runWrite(
  client: ContractClient,
  address: string,
  passphrase: string,
  prepare: () => Promise<PreparedCall>,
): Promise<SubmitResult> {
  const network = await checkWalletNetwork();
  if (!network.onTestnet) {
    throw new WrongNetworkError(network.passphrase);
  }

  const prepared = await prepare();
  const signedXdr = await signWithWallet(prepared.xdr, address, passphrase);
  return client.submit(signedXdr);
}
