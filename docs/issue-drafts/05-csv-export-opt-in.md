# CSV export of an event's badges (organizer, opt-in)

**Difficulty:** medium
**Labels:** help wanted, area:app

## Problem

An organizer who ran an event has no way to take the attendance record out of
the app — for a thank-you list, a member register, or an archive. The chain has
the data, but the app only shows it one badge at a time. The playbook lists CSV
export as a known gap, **opt-in only**.

## Scope

An export action on the organizer's loaded event that produces a CSV file
client-side (a `Blob` download, no backend). v0's contract has no
list-attendees entrypoint, so v0 can only export what the organizer has loaded
in the session — the export must say exactly that, rather than implying a full
roster. A full roster needs a contract change (see the contracts repo's
roadmap) and is out of scope here.

Out of scope: any server-side report generation, or exporting data the app was
never shown.

## Acceptance criteria

- [ ] The export is opt-in: nothing is written or downloaded without an explicit user action.
- [ ] The CSV contains only badge records the app actually read this session, and the UI says so in plain words.
- [ ] The CSV is generated client-side with no network request, and is escape-safe (addresses and ids cannot inject formulae).
- [ ] The file is named deterministically (event id + date), not with a random blob name.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/pages/OrganizerPage.tsx` (the loaded-event card). The contract's
`badges_of` is bounded to one badge per attendee per event in v0 — read
`eventbadges-contracts/src/badges.rs` before assuming a roster is possible.

## How to test

```bash
npm test
```

Add unit tests for the CSV builder (escaping, header row, empty session), and
download the file in a browser to inspect it.
