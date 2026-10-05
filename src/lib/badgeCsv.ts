/**
 * Builds the opt-in CSV export of badge records (draft 05). Pure and
 * dependency-free so the escaping rules and the file name are testable without
 * a browser; the download side effect lives in `components/CsvExport.tsx`.
 *
 * The file only ever contains records the app has actually read from the
 * contract. v0's contract has no list-attendees entrypoint, so there is no
 * roster to export and this module does not pretend there is (see the wording
 * in `CsvExport.tsx`).
 */

import type { BadgeRecord } from './badge';

/**
 * Spreadsheet programmes treat a cell that starts with `=`, `+`, `-`, `@`, TAB
 * or CR as a formula (CSV injection). The app's own values can never start
 * with those — addresses are base32 (`A`–`Z`, `2`–`7`) and ids are digits —
 * but a record read from anywhere is escaped as if it could, so the rule holds
 * for the file rather than for today's call sites. A leading apostrophe is the
 * standard neutraliser: the cell shows as text, including the quote.
 */
const FORMULA_LEADS = ['=', '+', '-', '@', '\t', '\r'];

/** Escapes one CSV cell: neutralise formula leads first, then quote and double. */
export function csvCell(value: string): string {
  const guarded = value !== '' && FORMULA_LEADS.includes(value[0]) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

/**
 * `issued_at` as an ISO-8601 UTC instant, empty when the value is not
 * representable (the same defensive shape as `datetime.ts`, whose display
 * formatting is locale-bound and must not leak into a machine-readable file).
 */
export function isoUtc(seconds: bigint): string {
  const millis = Number(seconds) * 1000;
  const date = new Date(millis);
  return Number.isFinite(millis) && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
}

/** The header row, named so tests and the file agree on one spelling. */
export const CSV_HEADER = 'event_id,attendee,organizer,issued_at_unix,issued_at_utc';

/**
 * Renders the records as RFC 4180 CSV (CRLF line endings, every record
 * terminated including the last). Row order is the order the app read them in.
 */
export function badgesToCsv(badges: readonly BadgeRecord[]): string {
  const rows = badges.map((badge) =>
    [
      badge.eventId.toString(),
      badge.attendee,
      badge.organizer,
      badge.issuedAt.toString(),
      isoUtc(badge.issuedAt),
    ]
      .map(csvCell)
      .join(','),
  );
  return [CSV_HEADER, ...rows].join('\r\n') + '\r\n';
}

/**
 * `eventbadges-<event id>-<UTC date>.csv` — deterministic from the event and
 * the day, so two exports of the same event can be told apart by name alone
 * (never a random blob name). UTC keeps the name stable across time zones and
 * matches the ledger clock the records themselves are stamped with.
 */
export function csvFileName(eventId: bigint, now: Date = new Date()): string {
  return `eventbadges-${eventId.toString()}-${now.toISOString().slice(0, 10)}.csv`;
}

/** The MIME type for the Blob. Everything in the file is ASCII today. */
export const CSV_MIME_TYPE = 'text/csv;charset=utf-8';
