import type { EventRecord, EventWindow } from '../lib/badge';
import { slotsLeft, windowSentence, windowState } from '../lib/badge';
import { formatHashHex } from '../lib/claimCode';
import { formatDateTime } from '../lib/datetime';
import { shorten } from '../lib/explorer';

function shortenAddress(address: string): string {
  return shorten(address, 8);
}

const TONE: Record<EventWindow, string> = {
  Open: 'tone-open',
  Full: 'tone-overdue',
  Closed: 'tone-closed',
};

/**
 * Everything the contract stores for an event, plus the window state the app
 * derives from the clock. Nothing is hidden: showing the counters plainly is
 * the point of a public record.
 */
export function EventSummary({
  event,
  nowSeconds,
}: {
  event: EventRecord;
  nowSeconds: number;
}) {
  const state = windowState(event, nowSeconds);
  return (
    <section aria-labelledby="event-summary-heading">
      <h2 id="event-summary-heading">
        Event #{event.id.toString()}{' '}
        <span className={`badge ${TONE[state]}`} title={windowSentence(state)}>
          {state}
          <span className="sr-only">: {windowSentence(state)}</span>
        </span>
      </h2>

      <dl className="summary">
        <div>
          <dt>Badges issued</dt>
          <dd className="mono">
            {event.claimCount} of {event.maxClaims} ({slotsLeft(event)} left)
          </dd>
        </div>
        <div>
          <dt>Claim deadline</dt>
          <dd>{formatDateTime(event.closesAt)}</dd>
        </div>
        <div>
          <dt>Organizer</dt>
          <dd className="mono" title={event.organizer}>
            {shortenAddress(event.organizer)}
            <span className="sr-only"> Full address: {event.organizer}</span>
          </dd>
        </div>
        <div>
          <dt>Name hash</dt>
          <dd className="mono" title={formatHashHex(event.nameHash, 16)}>
            {/* The hash is displayed, not the event name: the chain holds only
                the SHA-256 of whatever the organizer hashed. */}
            {formatHashHex(event.nameHash)}
            <span className="sr-only">
              {' '}
              Full name hash: {formatHashHex(event.nameHash, 16)}
            </span>
          </dd>
        </div>
      </dl>

      <p className="hint">
        The name shown here is the on-chain hash, not a readable name — the contract stores hashes
        only (see the docs book, &ldquo;Privacy: what is on-chain&rdquo;).
      </p>
    </section>
  );
}
