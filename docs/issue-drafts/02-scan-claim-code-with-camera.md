# Scan a claim code with the camera on the attendee side

**Difficulty:** hard
**Labels:** help wanted, area:app

## Problem

The claim form accepts a 64-hex code typed by hand. At a real event door, the
organizer may show a QR (see draft 01); scanning it with the attendee's own
camera would remove the transcription step entirely. Today the attendee must
hand-copy 64 characters.

## Scope

Add a "scan the code" option to the claim form using the browser's camera via
`navigator.mediaDevices.getUserMedia` and a local QR decoder. The decoded value
goes through the existing `validateClaimCode` check like typed input, and the
camera is released the moment the scan succeeds or the form is left.

Out of scope: any server-side decoding, camera access without an explicit user
action, or changing what a claim code is.

## Acceptance criteria

- [ ] The attendee can claim by scanning, with no hand-typing, end to end (proven manually on a phone and recorded honestly — no pilot claim is made until then).
- [ ] The camera only turns on after an explicit user action, and the permission-denied path shows the reviewed wording instead of failing silently.
- [ ] The scanned value passes the same `validateClaimCode` path as typed input; invalid scans show the same message.
- [ ] The camera stream is stopped on success, cancel and unmount.
- [ ] No new outbound network request is introduced (decoder is local).
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/pages/AttendeePage.tsx`, `src/lib/claimCode.ts`. Note `getUserMedia`
requires a secure context, as `crypto.subtle` already does (see ADR 0002's
consequences).

## How to test

```bash
npm test
```

Then exercise the scan flow on a phone against a locally served build, and
record what was and was not exercised in the README's proven-vs-assumed
section.
