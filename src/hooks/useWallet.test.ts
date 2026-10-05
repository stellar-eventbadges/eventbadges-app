// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The hook is the only place the app connects a wallet. Mock lib/wallet so no
// test can reach a real kit, a browser extension, or a key. Every function the
// hook imports must be stubbed: a missing one would be `undefined`, and the
// mount effect would fail on a TypeError rather than the behaviour under test.
vi.mock('../lib/wallet', () => ({
  connectWallet: vi.fn(),
  checkWalletNetwork: vi.fn(),
  disconnectWallet: vi.fn(),
  initWallet: vi.fn(),
  prefetchWallet: vi.fn(),
  rememberedAddress: vi.fn(),
}));

import {
  checkWalletNetwork,
  connectWallet,
  disconnectWallet,
  initWallet,
  prefetchWallet,
  rememberedAddress,
} from '../lib/wallet';

import { useWallet } from './useWallet';

/** A 56-character address-shaped string. Never a real account. */
const ADDRESS = `G${'A'.repeat(55)}`;

const TESTNET = { onTestnet: true, passphrase: 'Test SDF Network ; September 2015' };
const MAINNET = { onTestnet: false, passphrase: 'Public Global Stellar Network ; September 2015' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(initWallet).mockResolvedValue(undefined);
  vi.mocked(prefetchWallet).mockResolvedValue(undefined);
  vi.mocked(rememberedAddress).mockResolvedValue(null);
  vi.mocked(checkWalletNetwork).mockResolvedValue(TESTNET);
  vi.mocked(connectWallet).mockResolvedValue(ADDRESS);
  vi.mocked(disconnectWallet).mockResolvedValue(undefined);
});

describe('useWallet', () => {
  it('initialises the kit on mount and restores a remembered address', async () => {
    vi.mocked(rememberedAddress).mockResolvedValue(ADDRESS);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => expect(result.current.address).toBe(ADDRESS));
    expect(initWallet).toHaveBeenCalledTimes(1);
    expect(result.current.onTestnet).toBe(true);
  });

  it('starts disconnected when the wallet remembers nothing', async () => {
    const { result } = renderHook(() => useWallet());

    await waitFor(() => expect(initWallet).toHaveBeenCalledTimes(1));
    expect(result.current.address).toBeNull();
    expect(result.current.onTestnet).toBeNull();
  });

  it('warms the kit chunk from prepare() without attempting a connect', () => {
    const { result } = renderHook(() => useWallet());

    act(() => result.current.prepare());

    expect(prefetchWallet).toHaveBeenCalledTimes(1);
    expect(connectWallet).not.toHaveBeenCalled();
  });

  it('reports the connected address and the network it is on', async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.address).toBe(ADDRESS);
    expect(result.current.onTestnet).toBe(true);
    expect(result.current.connecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("keeps the kit's own reason when a connect is refused", async () => {
    // The kit rejects with a plain `{ code, message }` object, not an Error.
    // Discarding it would turn every refusal into one generic sentence.
    vi.mocked(connectWallet).mockRejectedValue({
      code: -1,
      message: 'The user closed the modal.',
    });

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBe('The user closed the modal.');
    expect(result.current.address).toBeNull();
    expect(result.current.connecting).toBe(false);
  });

  it('falls back to its own wording when there is no reason to pass on', async () => {
    vi.mocked(connectWallet).mockRejectedValue({});

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBe('The wallet did not connect.');
  });

  it('does not trust a wallet that cannot report its network', async () => {
    vi.mocked(checkWalletNetwork).mockRejectedValue(new Error('the wallet went away'));

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.address).toBe(ADDRESS);
    expect(result.current.onTestnet).toBe(false);
  });

  it('reports a wallet on another network as not on testnet', async () => {
    vi.mocked(checkWalletNetwork).mockResolvedValue(MAINNET);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.onTestnet).toBe(false);
  });

  it('clears the address and the network on disconnect', async () => {
    vi.mocked(rememberedAddress).mockResolvedValue(ADDRESS);
    const { result } = renderHook(() => useWallet());

    await waitFor(() => expect(result.current.address).toBe(ADDRESS));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(disconnectWallet).toHaveBeenCalledTimes(1);
    expect(result.current.address).toBeNull();
    expect(result.current.onTestnet).toBeNull();
  });
});
