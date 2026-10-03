import { useCallback, useEffect, useState } from 'react';

import {
  checkWalletNetwork,
  connectWallet,
  disconnectWallet,
  initWallet,
  rememberedAddress,
} from '../lib/wallet';

export interface WalletController {
  readonly address: string | null;
  readonly connecting: boolean;
  readonly error: string | null;
  /** null until the wallet has been asked; false blocks every write. */
  readonly onTestnet: boolean | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshNetwork: () => Promise<boolean>;
}

/**
 * Wallet state for the app.
 *
 * The app only ever learns a public address here. No secret key or seed phrase
 * is requested, received, stored or logged anywhere in this hook or the adapter
 * under it.
 */
export function useWallet(): WalletController {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onTestnet, setOnTestnet] = useState<boolean | null>(null);

  const refreshNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const network = await checkWalletNetwork();
      setOnTestnet(network.onTestnet);
      return network.onTestnet;
    } catch {
      // A wallet that cannot report its network must not be trusted.
      setOnTestnet(false);
      return false;
    }
  }, []);

  // On load, remember an address the wallet already authorised and re-check the
  // network, so a returning session cannot silently be on the wrong chain.
  useEffect(() => {
    initWallet();
    void (async () => {
      const existing = await rememberedAddress();
      if (existing !== null) {
        setAddress(existing);
        await refreshNetwork();
      }
    })();
  }, [refreshNetwork]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const connected = await connectWallet();
      setAddress(connected);
      await refreshNetwork();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'The wallet did not connect.');
    } finally {
      setConnecting(false);
    }
  }, [refreshNetwork]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await disconnectWallet();
    } catch {
      // Nothing useful to show: the kit clears its own state either way.
    }
    setAddress(null);
    setOnTestnet(null);
  }, []);

  return { address, connecting, error, onTestnet, connect, disconnect, refreshNetwork };
}
