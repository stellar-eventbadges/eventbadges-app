import { useCallback, useEffect, useRef, useState } from 'react';

import { messageOf } from '../lib/contractErrors';
import {
  checkWalletNetwork,
  connectWallet,
  disconnectWallet,
  initWallet,
  prefetchWallet,
  rememberedAddress,
} from '../lib/wallet';

export interface WalletController {
  readonly address: string | null;
  readonly connecting: boolean;
  readonly error: string | null;
  /** null until the wallet has been asked; false blocks every write. */
  readonly onTestnet: boolean | null;
  /**
   * Warms the wallet kit's chunk before a connect is asked for. Called from the
   * connect button's hover and focus handlers; must never be required for the
   * connect path itself to work.
   */
  prepare: () => void;
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
  const generation = useRef(0);
  const networkRequest = useRef(0);
  const connectingRef = useRef(false);
  const disconnectingRef = useRef(false);

  const refreshNetwork = useCallback(async (): Promise<boolean> => {
    const session = generation.current;
    const request = ++networkRequest.current;
    try {
      const network = await checkWalletNetwork();
      if (session !== generation.current || request !== networkRequest.current) return false;
      setOnTestnet(network.onTestnet);
      return network.onTestnet;
    } catch {
      // A wallet that cannot report its network must not be trusted.
      if (session === generation.current && request === networkRequest.current) setOnTestnet(false);
      return false;
    }
  }, []);

  // On load, remember an address the wallet already authorised and re-check the
  // network, so a returning session cannot silently be on the wrong chain.
  useEffect(() => {
    const session = generation.current;
    void (async () => {
      try {
        await initWallet();
        const existing = await rememberedAddress();
        if (session !== generation.current) return;
        if (existing !== null) {
          setAddress(existing);
          await refreshNetwork();
        }
      } catch (thrown) {
        if (session === generation.current) setError(messageOf(thrown) || 'The wallet did not connect.');
      }
    })();
    return () => { generation.current += 1; };
  }, [refreshNetwork]);

  const prepare = useCallback(() => {
    void prefetchWallet().catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    if (connectingRef.current || disconnectingRef.current) return;
    connectingRef.current = true;
    const session = ++generation.current;
    setConnecting(true);
    setError(null);
    setOnTestnet(null);
    try {
      const connected = await connectWallet();
      if (session !== generation.current) return;
      setAddress(connected);
      await refreshNetwork();
    } catch (thrown) {
      // The kit rejects with plain `{ code, message }` objects, not Errors —
      // `messageOf` is the one place in the app that knows how to read those.
      // The wording stays the kit's own: it is the only party that can say why
      // the connect failed, and a generic replacement would hide a real reason.
      const reason = messageOf(thrown);
      if (session === generation.current) setError(reason === '' ? 'The wallet did not connect.' : reason);
    } finally {
      connectingRef.current = false;
      if (session === generation.current) setConnecting(false);
    }
  }, [refreshNetwork]);

  const disconnect = useCallback(async () => {
    if (disconnectingRef.current) return;
    disconnectingRef.current = true;
    generation.current += 1;
    setError(null);
    setAddress(null);
    setOnTestnet(null);
    setConnecting(false);
    try {
      await disconnectWallet();
    } catch {
      // Nothing useful to show: the kit clears its own state either way.
    } finally {
      disconnectingRef.current = false;
    }
  }, []);

  return { address, connecting, error, onTestnet, prepare, connect, disconnect, refreshNetwork };
}
