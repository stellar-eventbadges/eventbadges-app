import { Networks, StrKey } from '@stellar/stellar-sdk';

/**
 * The only network this app will ever operate on. Testnet only, by project
 * rule: `AGENTS.md` says "Testnet only. Never mainnet."
 */
export const SUPPORTED_NETWORK = 'testnet';

/** The passphrase for that network, taken from the SDK rather than typed out. */
export const TESTNET_PASSPHRASE: string = Networks.TESTNET;

/** Raw values as they come out of the environment (`.env` via Vite). */
export interface RawAppEnv {
  readonly network?: string | undefined;
  readonly rpcUrl?: string | undefined;
  readonly contractId?: string | undefined;
  readonly explorerBaseUrl?: string | undefined;
}

export interface AppConfig {
  readonly network: typeof SUPPORTED_NETWORK;
  readonly passphrase: string;
  readonly rpcUrl: string;
  readonly contractId: string;
  readonly explorerBaseUrl: string;
}

export type ConfigResult =
  | { readonly ok: true; readonly config: AppConfig }
  | { readonly ok: false; readonly problems: readonly string[] };

/** True only for the testnet passphrase. Used to refuse every other network. */
export function isTestnetPassphrase(passphrase: string | undefined): boolean {
  return passphrase === TESTNET_PASSPHRASE;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

/**
 * Validates the raw environment and builds the app configuration.
 *
 * This is deliberately a pure function with no `import.meta.env` access, so it
 * can be unit tested — including the refusal paths, which are the ones that
 * matter: a missing contract id, or a network that is not testnet.
 */
export function resolveNetworkConfig(raw: RawAppEnv): ConfigResult {
  const problems: string[] = [];

  const network = (raw.network ?? '').trim().toLowerCase();
  if (network === '') {
    problems.push('VITE_STELLAR_NETWORK is not set.');
  } else if (network !== SUPPORTED_NETWORK) {
    problems.push(
      `This app only operates on testnet, but VITE_STELLAR_NETWORK is "${network}". ` +
        'It will not run against any other network.',
    );
  }

  const rpcUrl = (raw.rpcUrl ?? '').trim();
  if (rpcUrl === '') {
    problems.push('VITE_SOROBAN_RPC_URL is not set.');
  } else if (!isHttpUrl(rpcUrl)) {
    problems.push('VITE_SOROBAN_RPC_URL must be an http(s) URL.');
  }

  const contractId = (raw.contractId ?? '').trim();
  if (contractId === '') {
    problems.push('VITE_CONTRACT_ID is not set.');
  } else if (!StrKey.isValidContract(contractId)) {
    problems.push(
      'VITE_CONTRACT_ID is not a valid contract id. It must be a C... address of a ' +
        'deployed contract, not a placeholder.',
    );
  }

  const explorerBaseUrl = (raw.explorerBaseUrl ?? '').trim().replace(/\/+$/, '');
  if (explorerBaseUrl === '') {
    problems.push('VITE_EXPLORER_BASE_URL is not set.');
  } else if (!isHttpUrl(explorerBaseUrl)) {
    problems.push('VITE_EXPLORER_BASE_URL must be an http(s) URL.');
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    config: {
      network: SUPPORTED_NETWORK,
      passphrase: TESTNET_PASSPHRASE,
      rpcUrl,
      contractId,
      explorerBaseUrl,
    },
  };
}
