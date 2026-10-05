import type { BadgeRecord } from '../lib/badge';
import { badgesToCsv, csvFileName, CSV_MIME_TYPE } from '../lib/badgeCsv';
import { shorten } from '../lib/explorer';

/**
 * The opt-in CSV export (draft 05). It is rendered next to a badge list and
 * writes exactly the records that list holds — records this screen read from
 * the contract — and says so, because v0's contract has no list-attendees
 * entrypoint and an export must not read like a roster.
 *
 * Nothing happens until the button is pressed: no file is written and no
 * request is made at render time, and the CSV is built in this browser.
 * Renders nothing for an empty list, so callers can mount it unconditionally.
 */
export function CsvExport({ badges }: { badges: readonly BadgeRecord[] }) {
  const first = badges[0];
  if (first === undefined) return null;

  // Every record in one export comes from a single `badges_of` read, so they
  // share the event and the holder; the wording below may name those once.
  const count = badges.length === 1 ? '1 badge record' : `${badges.length} badge records`;

  function save() {
    const url = URL.createObjectURL(new Blob([badgesToCsv(badges)], { type: CSV_MIME_TYPE }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = csvFileName(first.eventId);
    anchor.click();
    // Revoked on the next turn, not immediately: some browsers read the blob
    // after the click handler returns.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <>
      <p className="hint">
        The download holds the {count} this page read just now for event #
        {first.eventId.toString()} and{' '}
        <span className="mono" title={first.attendee}>
          {shorten(first.attendee, 8)}
        </span>
        : not the event&rsquo;s other attendees. The app can only export records it has actually
        read — v0&rsquo;s contract has no way to list an event&rsquo;s attendees, so there is no
        roster to download.
      </p>
      <button type="button" onClick={save}>
        Download {count} as CSV
      </button>
      <p className="hint">The file is built in this browser. Nothing is sent anywhere.</p>
    </>
  );
}
