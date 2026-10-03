# Generate the claim code as a QR code

**Difficulty:** medium
**Labels:** help wanted, area:app

## Problem

A claim code is 64 hexadecimal characters. Typing or hand-copying that on a
phone at an event door is error-prone, and one wrong character is a
`ClaimCodeMismatch` (#11) failure. The playbook's v0 screen list mentions
"show a claim code **or QR**" — the QR half is not built.

## Scope

Render the organizer's claim code (and optionally the event id) as a QR code on
the create-success screen, so an attendee can scan it instead of transcribing
it. The QR is generated **locally in the browser** — no external image or
script request, matching the app's "only outside request is the RPC endpoint"
rule.

Out of scope: scanning (that is draft 02), changing the code's format, or
sending the code anywhere.

## Acceptance criteria

- [ ] The create-success screen shows a scannable QR of the claim code, generated without any network request.
- [ ] The QR payload is decodable back to the exact 64-character code (unit-testable if the QR encoder is a pure function).
- [ ] The claim code is still shown as text next to the QR, for attendees without a camera.
- [ ] The code is still shown once only; the QR disappears with it on reload.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/pages/OrganizerPage.tsx` (create success block), and pick a small QR
encoder with no transitive dependencies; record the choice in
`docs/decisions/`.

## How to test

```bash
npm test
npm run build
```

Then open the organizer page in a browser, create an event, and scan the QR
with a phone camera to confirm it decodes to the code shown.
