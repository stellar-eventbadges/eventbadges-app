import { explorerTxUrl, shorten } from '../lib/explorer';

/**
 * Shown after every action that produced a transaction: the full hash and a
 * link to the explorer. The hash is the receipt — without it there is nothing
 * to check afterwards.
 */
export function TransactionResult({
  hash,
  explorerBaseUrl,
  label = 'Transaction submitted',
}: {
  hash: string;
  explorerBaseUrl: string;
  label?: string;
}) {
  const url = explorerTxUrl(explorerBaseUrl, hash);

  return (
    // The hash is the receipt — announce the result politely instead of
    // inserting silent content after the submit button.
    <div className="notice notice-ok" role="status">
      <p className="notice-title">{label}</p>
      <p className="mono">
        <span className="hint">Hash: </span>
        <span title={hash}>
          {shorten(hash, 10)}
          {/* The full hash is the receipt; screen-reader and touch users
              cannot reach a title attribute, so expose it as hidden text. */}
          <span className="sr-only"> Full hash: {hash}</span>
        </span>
      </p>
      <p>
        <a href={url} target="_blank" rel="noreferrer noopener">
          Open it in the explorer
        </a>
      </p>
    </div>
  );
}
