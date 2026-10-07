# 0005 — The attendee-side QR scanner is local, camera-first, and hand-rolled

- **Status:** accepted — implemented 2026-10-07
- **Date:** 2026-10-07
- **Deciders:** maintainer (solo builder)

## Context

Draft 02 asks the attendee's claim screen to read a claim ticket off the
organizer's screen with the device's camera, so the attendee never transcribes
64 hex characters by hand. The obvious move is a QR-decoding library on npm.
The project rule for this repo is unchanged from ADR 0004: v0 adds **no new npm
dependencies**, and the app's "no third-party requests" promise is easiest to
keep when there is no third-party code to keep it with.

The encoder (ADR 0004) was the easier half: a pure function of the payload and
the level. The scanner is harder — it has to turn a noisy, off-centre, possibly
tilted camera frame into a module matrix, and then read a matrix that may have
a wrong module or three. Those are two different pieces (image work and code
work), and the decision separates them.

## What was checked

- **An npm QR-decoder dependency.** No candidate was added; the same vetting
  bar as ADR 0004 (audit, pin, keep current, lockfile in this repo) would
  apply, and the app would then carry a dependency whose only job is to consume
  a camera frame. The decode path here is bounded enough to write directly.
- **Two separable jobs.**
  - *From pixels to modules* — binarise against a local mean (integral-image
    window), find the three 1:1:3:1:1 finder patterns with a horizontal
    run-scan and a column cross-check, pick the best finder triples by
    right-isosceles-triangle fit, estimate the symbol's size and orientation,
    and sample the module grid with a tiny phase sweep. This is `qrScan.ts`.
  - *From modules to text* — match the format bits tolerantly (within the
    BCH(15,5) radius) and repair wrong codewords up to the level's
    Reed–Solomon budget with Berlekamp–Massey + Chien + a small GF(2^8) solve,
    re-checked by re-running the syndromes afterwards. This is the decoder half
    of `qr.ts`, extended this session to do repair (it was test-only and
    round-trip-only before).
- **The Reed–Solomon repair.** Verified first as a standalone probe against the
  GF(2^8) tables and the spec's algebra: 1..10 wrong codewords in a block repair
  and re-decode exactly. The one bug found was concrete and spec-level — the
  error locator's `X_j = α^p` uses the polynomial degree `p = length-1-k`, not
  the codeword index `k` — and fixing it is what let the scanner read a tilted
  symbol. The known-answer vectors in `qr.test.ts` and the scanner's own
  rasterised-frame tests are the safety net, the same discipline ADR 0004 used
  for the encoder.
- **Camera plumbing and failure wording.** `getUserMedia` with
  `facingMode: 'environment'`, a 150ms polling loop over `grabFrame` → `qrScan`,
  and an explicit cancel. Every way camera startup can fail has reviewed wording
  (`camera.ts`), mapped by the DOM exception name: denied, missing, unsupported,
  and a generic fallback for anything unknown rather than guessing at a cause the
  browser did not actually report. This is app-level wording like
  `WRONG_NETWORK_MESSAGE` in `contractErrors.ts` — defined and reviewed with the
  feature, not copied from `docs/contract-errors.md`.

## Decision

The scanner is three small files, all local and dependency-free:

- `src/lib/camera.ts` — the reviewed wording for every camera failure, plus
  `stopStream` (idempotent, null-safe) and `grabFrame` (returns null before the
  first frame or when the canvas has no context).
- `src/lib/qrScan.ts` — the pixel-to-modules pipeline (`qrScan(frame)` returns
  the text or `null`). It calls the repaired `qrDecode` for the modules-to-text
  half.
- `src/components/QrScanner.tsx` — the UI: a live preview that starts the
  camera only when mounted as the result of an explicit user action, polls until
  a symbol comes out, and stops the stream on success, cancel and unmount.

The decoded value is handed to the claim form's `checkClaimEntry`, so a scanned
code runs the exact same validation and shows the exact same messages as a typed
one — including refusing an unrelated QR code the same way a mistyped code is
refused. The camera only turns on after the "Scan the code with the camera"
button, and only while the component is mounted.

The decoder keeps being hand-rolled. A library could in principle cover both
directions and let this repo drop `qr.ts`; that is the re-evaluate trigger, not
the current state. For now: no new dependency, no network request from the
decode path, and the decode correctness rests on the same rasterised-frame tests
ADR 0004 used for the encoder.

Scope deliberately not implemented: perspective correction beyond a flat affine
estimate (a badly tilted symbol may just need a second look at a different
phase — the scanner already sweeps sampling phases), inverted symbols, and
multi-symbol scenes. The claim screen shows one ticket at a time.

## Consequences

- The app still adds zero dependencies for this feature. Nothing new to audit,
  and `npm audit`'s 19 advisories stay where they were.
- The decode path is now *used*, not just tested as a round-trip: it has to read
  a module matrix assembled from a real (rasterised) frame, with a wrong module
  or three repaired out. The scanner's own tests exercise it end to end —
  pixels in, ticket text out — at several camera distances, off-centre, tilted,
  noisy, and at all four correction levels, and it gives up cleanly on blank,
  noisy, too-small and cropped frames.
- The camera lifecycle is tested headlessly: opens the stream once on mount,
  stops it on success, cancel, unmount, and on a stream that answered after the
  scanner was already closed. The permission-denied, missing-camera, and
  no-camera-API paths all render the reviewed wording and pass an axe check.
- What is **not** proven: a real phone camera pointed at a real screen reading a
  real ticket. The rasterised-frame tests are stand-ins for that — the same way
  the encoder's round-trip tests are stand-ins for a physical scan — and the
  README keeps that honest. The acceptance criterion that says "proven manually
  on a phone" is the human's, and it still stands.

## Re-evaluate when

- A deployed contract and a real organizer make a pilot real, at which point a
  phone pointed at a real screen is the only way to know whether the geometry
  assumptions hold at the distances and lighting a door actually has — and the
  README's proven-vs-assumed line should change when that happens.
- The scanner ever needs modes beyond byte (it does not for a 64-hex claim code
  or a `code:proof` ticket), or structured-append / multi-symbol scenes, at
  which point the hand-rolled decode scope has outgrown its reason and a library
  trade-off is worth a fresh decision.
- A camera never becomes available (old browsers, insecure contexts, devices
  without one): the claim screen already degrades to paste-by-hand with reviewed
  wording in every failure case, so this decision never blocks the rest of the
  app.
