# 0004 — The QR encoder is hand-rolled, with no dependency

- **Status:** accepted — implemented 2026-10-06
- **Date:** 2026-10-06
- **Deciders:** maintainer (solo builder)

## Context

Draft 01 asks the create-success screen to show each claim code as a QR code,
generated locally, so attendees can scan instead of transcribing 64 hex
characters. The obvious move is to install one of the small QR libraries on
npm. The project rule for this repo is stricter: v0 adds **no new npm
dependencies** — every package in the tree is one the maintainer must be able
to vouch for, and the app's "no third-party requests" promise is easiest to
keep when there is no third-party code to keep it with.

## What was checked

- The npm QR packages (`qrcode`, `qrcode-generator`, `qrcode.react` and
  friends): all small and well-used, but each is still a dependency to audit,
  pin and keep current — and `qrcode-generator`'s package page carries no
  lockfile in this repo to vouch against.
- The QR specification itself (ISO/IEC 18004): byte mode, versions 1–40,
  Reed–Solomon over GF(2^8), four error-correction levels, eight data masks
  with four penalty rules, BCH-protected format and version information. The
  subset needed here — byte mode only, encode-only for the app — is bounded
  and well documented.
- Two independent MIT-licensed reference implementations (Nayuki's QR Code
  generator and Kazuhiko Arase's `qrcode-generator`) were used as oracles:
  the spec tables in `src/lib/qr.ts` were cross-checked against both, and the
  known-answer vectors in `src/lib/qr.test.ts` were generated from Arase's
  implementation, not hand-copied from our own encoder.
- The decoder (`qrDecode`) exists only to test the encoder: it reads a clean
  module matrix back to its payload. It is not a scanner, is never called by
  the app, and is tree-shaken out of the production bundle.

## Decision

`src/lib/qr.ts` is a hand-rolled QR encoder (and test-only matrix decoder)
with no imports beyond the language:

- **Byte mode only.** Claim codes are hex ASCII and tickets are `code:proof`;
  numeric or alphanumeric mode saves nothing that matters here.
- **Version selection is automatic** — the smallest version whose capacity
  fits, so the 64-character claim code lands on a 33×33 version-4 symbol at
  level L, and longer tickets grow only when they must.
- **Error correction level L by default.** A code shown on a screen and read
  by a camera a few centimeters away does not need level H redundancy; the
  `level` argument exists if a pilot proves otherwise.
- **Mask selection by penalty score**, per the spec's four rules, so the
  symbol is deterministic: the same input always yields the same matrix.
- The matrix is rendered as inline SVG (`src/components/QrCode.tsx`) with a
  4-module quiet zone, `role="img"` and a per-attendee label — no image file,
  no request, matching the badge mark's "drawn from data, not fetched" rule.

## Consequences

- The app adds zero dependencies for this feature; nothing new to audit, and
  `npm audit`'s 19 advisories stay exactly where they were.
- The encoder's correctness rests on its tests, not on a library's
  reputation: 30 unit tests pin it to reference-generated matrices (fixed
  vectors for several versions, levels and all eight masks), and round-trip
  every case through the decoder. The rendered SVG is additionally decoded
  back to the ticket in the component and organizer-page tests.
- A bug in a hand-rolled encoder is ours to find and fix. The known-answer
  vectors are the safety net: any change that alters the symbol for a pinned
  input fails the suite loudly.
- `qrDecode` is test-only scope. If a future draft ever needs real scanning
  (draft 02), the camera pipeline — not this decoder — is the work, and this
  decision does not pre-choose a decoder for it.

## Re-evaluate when

- Draft 02 (camera scanning) picks its own QR decoding approach, in case one
  library can honestly cover both directions and drop this file, or
- the encoder ever needs modes beyond byte, or structured-append-sized
  payloads, at which point the hand-rolled scope has outgrown its reason.
