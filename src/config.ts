import { resolveNetworkConfig, type AppConfig, type ConfigResult } from './lib/network';

/**
 * The single place the app reads its environment.
 *
 * Vite types every `VITE_*` value as an untyped string, so they are read once,
 * here, into a plain record and then validated by `resolveNetworkConfig`. The
 * rest of the app only ever sees `AppConfig`, never `any` and never a raw env
 * value. Nothing is hardcoded: the network, RPC URL, contract id and explorer
 * URL all come from `.env` (see `.env.example`).
 */
const env: Record<string, string | undefined> = import.meta.env;

export const configResult: ConfigResult = resolveNetworkConfig({
  network: env.VITE_STELLAR_NETWORK,
  rpcUrl: env.VITE_SOROBAN_RPC_URL,
  contractId: env.VITE_CONTRACT_ID,
  explorerBaseUrl: env.VITE_EXPLORER_BASE_URL,
});

/**
 * Returns the configuration, or throws. Only call this from code that is
 * already rendered behind the `configResult.ok` guard.
 */
export function requireConfig(): AppConfig {
  if (!configResult.ok) {
    throw new Error('The app is not configured. See .env.example.');
  }
  return configResult.config;
}
