import { describe, expect, it } from 'vitest';

import type { BadgeRecord } from './badge';
import { badgesToCsv, csvCell, CSV_HEADER, csvFileName, isoUtc } from './badgeCsv';

/** A badge that is never a real account: the builder only reads the fields. */
function badge(overrides: Partial<BadgeRecord> = {}): BadgeRecord {
  return {
    eventId: 1n,
    attendee: `G${'A'.repeat(55)}`,
    organizer: `G${'B'.repeat(55)}`,
    issuedAt: 1_790_000_000n,
    ...overrides,
  };
}

describe('csvCell', () => {
  it('leaves an ordinary value untouched', () => {
    expect(csvCell('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(
      `G${'A'.repeat(55)}`,
    );
  });

  it('neutralises every value a spreadsheet would run as a formula', () => {
    for (const lead of ['=', '+', '-', '@', '\t']) {
      expect(csvCell(`${lead}cmd`)).toBe(`'${lead}cmd`);
    }
    // A CR is also a quoting trigger, so the apostrophe sits inside the quotes.
    expect(csvCell('\rcmd')).toBe(`"'\rcmd"`);
  });

  it('quotes and doubles cells that carry a comma, quote or newline', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('guards the formula lead before quoting, so the apostrophe is inside', () => {
    expect(csvCell('=a,b')).toBe(String.raw`"'=a,b"`);
  });

  it('passes an empty cell through', () => {
    expect(csvCell('')).toBe('');
  });
});

describe('isoUtc', () => {
  it('renders Unix seconds as an ISO-8601 UTC instant', () => {
    expect(isoUtc(1_790_000_000n)).toBe('2026-09-21T14:13:20.000Z');
    expect(isoUtc(0n)).toBe('1970-01-01T00:00:00.000Z');
  });

  it('returns an empty cell for a value no Date can represent', () => {
    expect(isoUtc(2n ** 64n)).toBe('');
  });
});

describe('badgesToCsv', () => {
  it('is the header alone when the app read nothing', () => {
    expect(badgesToCsv([])).toBe(`${CSV_HEADER}\r\n`);
  });

  it('writes one CRLF-terminated row per record, in the order read', () => {
    const first = badge({ eventId: 7n, issuedAt: 1_790_000_000n });
    const second = badge({ eventId: 7n, issuedAt: 1_790_000_500n });

    expect(badgesToCsv([first, second])).toBe(
      `${CSV_HEADER}\r\n` +
        `${first.eventId},${first.attendee},${first.organizer},1790000000,` +
        '2026-09-21T14:13:20.000Z\r\n' +
        `${second.eventId},${second.attendee},${second.organizer},1790000500,` +
        '2026-09-21T14:21:40.000Z\r\n',
    );
  });

  it('quotes the fields that need it rather than shifting columns', () => {
    const csv = badgesToCsv([badge({ attendee: 'GABC, Inc' })]);
    const row = csv.split('\r\n')[1];

    expect(row).toContain('"GABC, Inc"');
    expect(row.split(',').length).toBe(6); // 5 columns, one comma inside quotes
  });
});

describe('csvFileName', () => {
  it('names the file from the event id and the UTC date', () => {
    const now = new Date(Date.UTC(2026, 9, 5, 12, 0, 0));
    expect(csvFileName(7n, now)).toBe('eventbadges-7-2026-10-05.csv');
  });

  it('is deterministic for the same event and day, and distinct across events', () => {
    const now = new Date(Date.UTC(2026, 9, 5, 23, 59, 0));
    expect(csvFileName(7n, now)).toBe(csvFileName(7n, new Date(now.getTime())));

    const nextDay = new Date(Date.UTC(2026, 9, 6, 0, 1, 0));
    expect(csvFileName(7n, now)).not.toBe(csvFileName(7n, nextDay));
    expect(csvFileName(7n, now)).not.toBe(csvFileName(8n, now));
  });

  it('carries the full event id, not a rounded one', () => {
    const now = new Date(Date.UTC(2026, 9, 5, 0, 0, 0));
    expect(csvFileName(2n ** 64n - 1n, now)).toBe(
      'eventbadges-18446744073709551615-2026-10-05.csv',
    );
  });
});
