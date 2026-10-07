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

- [x] The attendee can claim by scanning, with no hand-typing, end to end —
      implemented and wired into the claim screen (`src/pages/AttendeePage.tsx`,
      `handleScan` → `checkClaimEntry`), so a decoded value runs the same
      validation a typed one does. **Not yet proven on a real phone camera** —
      this box is checked against the implementation and the headless tests, and
      the real-phone step is recorded below as untested.
- [x] The camera only turns on after an explicit user action (the "Scan the code
      with the camera" button), and the permission-denied path shows the reviewed
      wording instead of failing silently (`src/components/QrScanner.tsx`,
      `src/lib/camera.ts`, `src/lib/camera.test.ts`).
- [x] The scanned value passes the same `checkClaimEntry` path as typed input;
      invalid scans show the same message (`src/lib/claimCode.ts`,
      `AttendeePage.handleScan`).
- [x] The camera stream is stopped on success, cancel and unmount
      (`src/components/QrScanner.test.tsx`, `src/lib/camera.test.ts`).
- [x] No new outbound network request is introduced (decoder is local —
      `src/lib/camera.ts`, `src/lib/qrScan.ts`).
- [x] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all
      pass (0 warnings, 0 errors, 293 tests / 35 files, build passes).

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

## Status — implemented 2026-10-07

The scanner is built and gate-clean: lint 0 warnings / 0 errors, `tsc -b` 0
errors, 293 tests / 35 files pass, and the production build passes. The camera
pipeline is `src/lib/camera.ts` (reviewed failure wording + `stopStream` +
`grabFrame`), the pixel-to-modules decoder is `src/lib/qrScan.ts` (`qrScan`),
and the UI is `src/components/QrScanner.tsx`. The matrix decoder it calls
(`qrDecode` in `src/lib/qr.ts`) was extended this session to repair wrong
codewords up to the level's Reed–Solomon budget, so a sampled frame can survive
a wrong module or three.

What is **not** done, honestly: **a real phone camera pointed at a real screen
has never read a real ticket.** The tests are stand-ins — the same discipline as
the encoder's round-trip tests — and the README's proven-vs-assumed line keeps
that. The acceptance box above for end-to-end scanning is checked against the
implementation and the headless tests, not against a physical scan, and stays
that way until a human runs it on a phone. ADR 0005 records the decision that
the scanner stays hand-rolled and local.
