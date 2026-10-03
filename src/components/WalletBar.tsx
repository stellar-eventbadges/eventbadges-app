import { shorten } from '../lib/explorer';
import type { WalletController } from '../hooks/useWallet';

/**
 * Connect/disconnect, the connected address, and the current network.
 *
 * The network is shown because the app refuses to build a transaction unless
 * the wallet reports the testnet passphrase — a silent wrong-network failure
 * would be much worse than an explicit refusal.
 */
export function WalletBar({ wallet }: { wallet: WalletController }) {
  return (
    <div className="wallet-bar">
      {wallet.address === null ? (
        <button type="button" onClick={() => void wallet.connect()} disabled={wallet.connecting}>
          {wallet.connecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      ) : (
        <>
          <span className="wallet-address mono" title={wallet.address}>
            {shorten(wallet.address, 6)}
            {/* The connected address must survive a screen reader, not only a
                hover tooltip. */}
            <span className="sr-only"> Full address: {wallet.address}</span>
          </span>
          {wallet.onTestnet === true && <span className="badge tone-paid">testnet</span>}
          {wallet.onTestnet === false && <span className="badge tone-overdue">not testnet</span>}
          <button type="button" className="secondary" onClick={() => void wallet.disconnect()}>
            Disconnect
          </button>
        </>
      )}

      {wallet.error !== null && (
        <p className="field-error" role="alert">
          {wallet.error}
        </p>
      )}
      {wallet.onTestnet === false && (
        <p className="field-error" role="alert">
          Your wallet is set to a different network. Switch it to testnet before sending anything.
        </p>
      )}
    </div>
  );
}
