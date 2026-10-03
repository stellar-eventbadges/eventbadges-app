import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';

import {
  isTestnetPassphrase,
  resolveNetworkConfig,
  TESTNET_PASSPHRASE,
  type ConfigResult,
} from './network';

const CONTRACT_ID = StrKey.encodeContract(new Uint8Array(32).fill(3));

const VALID_ENV = {
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  contractId: CONTRACT_ID,
  explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
};

function problemsOf(result: ConfigResult): readonly string[] {
  if (result.ok) {
    throw new Error('expected the configuration to be rejected, but it was accepted');
  }
  return result.problems;
}

describe('resolveNetworkConfig', () => {
  it('accepts a complete testnet configuration', () => {
    const result = resolveNetworkConfig(VALID_ENV);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.config.network).toBe('testnet');
    expect(result.config.passphrase).toBe(TESTNET_PASSPHRASE);
    expect(result.config.contractId).toBe(CONTRACT_ID);
    expect(result.config.explorerBaseUrl).toBe('https://stellar.expert/explorer/testnet');
  });

  it('refuses to run on any network other than testnet', () => {
    const problems = problemsOf(resolveNetworkConfig({ ...VALID_ENV, network: 'mainnet' }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('only operates on testnet');
    expect(problems[0]).toContain('mainnet');
  });

  it('refuses the real-network passphrase even when the name says testnet', () => {
    // The name is not trusted on its own: the passphrase is fixed in code.
    expect(isTestnetPassphrase(TESTNET_PASSPHRASE)).toBe(true);
    expect(isTestnetPassphrase('Public Global Stellar Network ; September 2015')).toBe(false);
    expect(isTestnetPassphrase(undefined)).toBe(false);
  });

  it('rejects a placeholder contract id', () => {
    const problems = problemsOf(
      resolveNetworkConfig({ ...VALID_ENV, contractId: 'YOUR_DEPLOYED_TESTNET_CONTRACT_ID' }),
    );
    expect(problems[0]).toContain('VITE_CONTRACT_ID');
  });

  it('rejects an account address where a contract id belongs', () => {
    const problems = problemsOf(
      resolveNetworkConfig({ ...VALID_ENV, contractId: Keypair.random().publicKey() }),
    );
    expect(problems[0]).toContain('not a valid contract id');
  });

  it('reports every missing value at once instead of stopping at the first', () => {
    const problems = problemsOf(resolveNetworkConfig({}));
    expect(problems).toHaveLength(4);
    expect(problems.join(' ')).toContain('VITE_STELLAR_NETWORK');
    expect(problems.join(' ')).toContain('VITE_SOROBAN_RPC_URL');
    expect(problems.join(' ')).toContain('VITE_CONTRACT_ID');
    expect(problems.join(' ')).toContain('VITE_EXPLORER_BASE_URL');
  });

  it('rejects an RPC URL that is not http(s)', () => {
    const problems = problemsOf(resolveNetworkConfig({ ...VALID_ENV, rpcUrl: 'soroban-testnet' }));
    expect(problems).toEqual(['VITE_SOROBAN_RPC_URL must be an http(s) URL.']);
  });

  it('trims a trailing slash from the explorer base url', () => {
    const result = resolveNetworkConfig({
      ...VALID_ENV,
      explorerBaseUrl: 'https://stellar.expert/explorer/testnet/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.explorerBaseUrl).toBe('https://stellar.expert/explorer/testnet');
  });
});
