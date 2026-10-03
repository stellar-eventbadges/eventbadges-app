import { describe, expect, it, vi } from 'vitest';

// The write path goes through lib/wallet; mock it so no test can reach a real
// wallet. Only the two functions flow.ts imports are stubbed.
vi.mock('./wallet', () => ({
  checkWalletNetwork: vi.fn(),
  signWithWallet: vi.fn(async (xdr: string) => `signed:${xdr}`),
}));

import { checkWalletNetwork, signWithWallet } from './wallet';

import type { ContractClient } from './contract';
import { runWrite, WrongNetworkError } from './flow';

function fakeClient(): ContractClient {
  return {
    getEvent: async () => {
      throw new Error('not used');
    },
    hasBadge: async () => {
      throw new Error('not used');
    },
    badgesOf: async () => {
      throw new Error('not used');
    },
    prepareCreateEvent: async () => ({ xdr: 'prepared:create_event' }),
    prepareClaim: async () => ({ xdr: 'prepared:claim' }),
    prepareAward: async () => ({ xdr: 'prepared:award' }),
    prepareRevoke: async () => ({ xdr: 'prepared:revoke' }),
    submit: async (_signedXdr) => ({ hash: 'f'.repeat(64) }),
  };
}

describe('runWrite', () => {
  it('refuses to prepare anything when the wallet is not on testnet', async () => {
    vi.mocked(checkWalletNetwork).mockResolvedValue({
      onTestnet: false,
      passphrase: 'Public Global Stellar Network ; September 2015',
    });

    const client = fakeClient();
    const prepare = vi.fn(async () => ({ xdr: 'should-never-happen' }));

    const error = await runWrite(client, 'GAAA', 'any', prepare).then(
      () => null,
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(WrongNetworkError);
    if (!(error instanceof WrongNetworkError)) return;
    expect(error.message).toContain('testnet');
    expect(error.passphrase).toContain('Public Global');
    // The refusal happens before a transaction is even built.
    expect(prepare).not.toHaveBeenCalled();
    expect(signWithWallet).not.toHaveBeenCalled();
  });

  it('prepares, signs and submits in order when the wallet is on testnet', async () => {
    vi.mocked(checkWalletNetwork).mockResolvedValue({
      onTestnet: true,
      passphrase: 'Test SDF Network ; September 2015',
    });

    const client = fakeClient();
    const submit = vi.spyOn(client, 'submit');

    const result = await runWrite(client, 'GAAA', 'Test SDF Network ; September 2015', async () =>
      client.prepareAward({ source: 'GAAA', eventId: 1n, attendee: 'GAAA' }),
    );

    expect(result.hash).toBe('f'.repeat(64));
    expect(submit).toHaveBeenCalledWith('signed:prepared:award');
  });
});
