# CSV export of an event's badges (opt-in)

**Difficulty:** medium
**Labels:** help wanted, area:app

**Implemented 2026-10-05 — narrower than the draft first proposed.** The export
exists where the app actually reads badge records (the claim screen's "Your
badges" list and the verify screen's result), not on the organizer's loaded
event: the organizer screen never reads a badge record, and v0 has no way to
enumerate an event's attendees, so an organizer-side export would always have
been empty. The roster half of this draft stays impossible until the contract
gains a list entrypoint. See "What landed" below.

## Problem

An organizer who ran an event has no way to take the attendance record out of
the app — for a thank-you list, a member register, or an archive. The chain has
the data, but the app only shows it one badge at a time. The playbook lists CSV
export as a known gap, **opt-in only**.

## Scope

An export action that produces a CSV file client-side (a `Blob` download, no
backend). v0's contract has no list-attendees entrypoint, so v0 can only export
what the app has actually read — the export must say exactly that, rather than
implying a full roster. A full roster needs a contract change (see the contracts
repo's roadmap) and is out of scope here.

Out of scope: any server-side report generation, or exporting data the app was
never shown.

## Acceptance criteria

- [x] The export is opt-in: nothing is written or downloaded without an explicit user action.
- [x] The CSV contains only badge records the app actually read this session, and the UI says so in plain words.
- [x] The CSV is generated client-side with no network request, and is escape-safe (addresses and ids cannot inject formulae).
- [x] The file is named deterministically (event id + date), not with a random blob name.
- [x] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## What landed (2026-10-05)

- `src/lib/badgeCsv.ts` — pure builder. Columns
  `event_id,attendee,organizer,issued_at_unix,issued_at_utc`; CRLF line endings,
  every record terminated, rows in the order the app read them. Cells are
  neutralised with a leading apostrophe when they start with `=`/`+`/`-`/`@`/TAB/CR
  (addresses are base32 and ids are digits, so no current value can, but the
  rule lives in the file rather than in today's call sites), then quoted and
  doubled per RFC 4180. `issued_at_utc` is empty rather than throwing for a
  value no `Date` can represent. The name is
  `eventbadges-<event id>-<UTC date>.csv`, derived from the event and the day.
- `src/components/CsvExport.tsx` — the opt-in control: a sentence naming the
  event and holder and saying the file holds only the records this page read
  ("not the event's other attendees … no way to list an event's attendees"), a
  button, and a browser-side `Blob` + anchor download. Renders nothing for an
  empty list; mounts unconditionally next to the two lists.
- Wired into `src/pages/AttendeePage.tsx` (the "Your badges" lookup) and
  `src/pages/VerifyPage.tsx` (the check result). The organizer screen is
  untouched — see the implementation note at the top.
- Tests: 13 in `src/lib/badgeCsv.test.ts` (every formula lead, quoting,
  header-only empty file, row order, UTC rendering, deterministic and distinct
  file names) and 6 in `src/components/CsvExport.test.tsx` (nothing rendered or
  downloaded until the button is pressed, the Blob's own text and MIME type,
  the anchor's `download` name, axe). One render test per page asserts the
  control appears only after a read and counts exactly the records that read
  returned — a second attendee's records in the same fixture are neither listed
  nor exported.
- Suite at the time: **225 tests in 30 files** (was 204 in 28), lint 0
  warnings, strict type-check clean, production build OK.
- **Not verified:** nobody has pressed the button in a real browser, so the
  file a browser actually saves has never been inspected. The Blob and the
  anchor call are exercised in happy-dom; the browser pass is part of the
  pre-pilot browser check.

## Where to start

`src/lib/badgeCsv.ts` (pure, testable), then `src/components/CsvExport.tsx`.
The contract's `badges_of` is bounded to one badge per attendee per event in
v0 — read `eventbadges-contracts/src/badges.rs` before assuming a roster is
possible.

## How to test

```bash
npm test
```

Add unit tests for the CSV builder (escaping, header row, empty session), and
download the file in a browser to inspect it.
