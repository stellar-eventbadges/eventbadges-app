import type { WalletController } from '../hooks/useWallet';

/**
 * Shown by any page that needs a wallet. The app reads and writes the contract
 * with the connected address as the transaction source, and it never generates
 * or stores a key of its own, so a connection is required before anything can
 * be looked up or sent.
 */
export function ConnectPrompt({ wallet }: { wallet: WalletController }) {
  return (
    <div className="notice">
      <p className="notice-title">Connect a wallet first</p>
      <p>
        The app uses your wallet&rsquo;s public address to read and send to the contract. It never
        asks for a secret key or seed phrase, and it cannot do anything without your wallet.
      </p>
      <button type="button" onClick={() => void wallet.connect()} disabled={wallet.connecting}>
        {wallet.connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    </div>
  );
}
