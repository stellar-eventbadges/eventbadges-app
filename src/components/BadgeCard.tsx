import { BadgeArt } from './BadgeArt';
import type { BadgeRecord } from '../lib/badge';
import { formatDateTime } from '../lib/datetime';
import { shorten } from '../lib/explorer';

/**
 * One held badge: the artwork, then the record. The record is what the contract
 * stores; the mark is drawn from those same bytes and claims nothing extra.
 */
export function BadgeCard({ badge }: { badge: BadgeRecord }) {
  return (
    <section className="card" aria-labelledby={`badge-${badge.eventId.toString()}-heading`}>
      <BadgeArt badge={badge} />
      <h2 id={`badge-${badge.eventId.toString()}-heading`}>
        Badge for event #{badge.eventId.toString()}
      </h2>
      <dl className="summary">
        <div>
          <dt>Held by</dt>
          <dd className="mono" title={badge.attendee}>
            {shorten(badge.attendee, 8)}
            <span className="sr-only"> Full address: {badge.attendee}</span>
          </dd>
        </div>
        <div>
          <dt>Issued by</dt>
          <dd className="mono" title={badge.organizer}>
            {shorten(badge.organizer, 8)}
            <span className="sr-only"> Full address: {badge.organizer}</span>
          </dd>
        </div>
        <div>
          <dt>Issued at</dt>
          <dd>{formatDateTime(badge.issuedAt)}</dd>
        </div>
      </dl>
      <p className="hint">
        This badge is recorded inside the contract for your address. It cannot be sold, given away
        or moved: the contract has no way to move it.
      </p>
    </section>
  );
}
