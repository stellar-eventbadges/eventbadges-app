# eventbadges — app

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-dark.svg">
  <img src="public/brand/logo.svg" alt="EventBadges" height="72">
</picture>

The contract now has a [verified synthetic testnet demonstration](https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/TESTNET_DEMONSTRATION.md).
The browser app has not been deployed or tested with a real wallet. No real pilot
or production readiness is claimed.

A small web app for **attendance badges** on Stellar testnet. An organizer
records an event with a badge cap and a claim deadline, generates one secret
claim code per attendee, commits them together as one Merkle root, and shares
each code out-of-band.
Attendees claim a badge bound to their own address; the contract has no way to
move a badge, which is what makes the proof worth something. Anyone can verify
that an address holds a badge for an event, with no wallet at all.

> **Status: v0 UI implemented (testnet only, never deployed, no pilot yet).**
> Nothing here has touched a real wallet or a real network. The contract id is
> a placeholder until a real organizer agrees to a pilot.

Part of the eventbadges project, which is three repositories:
[`eventbadges-contracts`](https://github.com/stellar-eventbadges/eventbadges-contracts)
(the Rust contract), `eventbadges-app` (this one) and
[`eventbadges-docs`](https://github.com/stellar-eventbadges/eventbadges-docs)
(the book).

## What the app does

| Page | Who | What it does |
|---|---|---|
| Home | anyone | Explains the flow, connects a wallet, states what has not happened yet |
| Organizer | organizer | Records an event (name hash, cap, deadline), generates one ticket per attendee (their code and proof) and shows them once, then awards or revokes badges |
| Claim | attendee | Shows the privacy notice, claims a badge with the organizer's ticket once acknowledged, then lists the badges an address holds for an event, with an opt-in CSV of exactly those records |
| Verify | anyone, no wallet | Checks that an address holds a badge for an event, shows the record, and offers the same opt-in CSV |

Contract functions are called exactly as named in `src/lib.rs` in
`eventbadges-contracts`: `create_event`, `claim`, `award`, `revoke`,
`get_event`, `has_badge`, `badges_of`. No other contract function exists in v0.

## Rules the app enforces

- A visible **"TESTNET - no real money"** banner on every screen, including the
  configuration-error screen.
- The app **refuses to operate on any network other than testnet**: the network
  comes from `.env`, the passphrase is pinned in `src/lib/network.ts`, and the
  wallet's own network is re-read before every write.
- **Wallets sign; the app never asks for, receives, stores or logs a secret key
  or seed phrase.** It only ever sees a public address and a signed XDR.
- The **claim code is generated and hashed in the browser** (`crypto.subtle`,
  see [ADR 0002](docs/decisions/0002-claim-codes-in-the-browser.md)); only
  hashes go into the transaction — the event's `claim_root` on the organizer's
  side, and one attendee's leaf plus their proof on the attendee's side, so
  the raw code never enters a transaction at all. The organizer screen
  generates **one code per attendee**, builds the Merkle tree in the browser
  (`src/lib/merkle.ts`), and shows each attendee's single-use ticket once,
  with a QR of it drawn locally as SVG by a hand-rolled encoder
  ([ADR 0004](docs/decisions/0004-hand-rolled-qr-encoder.md));
  nothing is stored anywhere. The claim screen accepts a whole ticket in its
  first field — the code, or `code:proof` — and keeps a separate proof field
  for codes shared without one.
- Every action that produces a transaction shows the **transaction hash and an
  explorer link**.
- **The claim screen shows a privacy notice and will not sign until it is
  acknowledged.** The wording lives in `src/lib/privacyNotice.ts`, is traced
  sentence by sentence to the code in
  [docs/attendee-notice.md](docs/attendee-notice.md), and says plainly that
  **the code is hashed before it is sent, that each attendee has their own, and
  that one code is good for one badge** — so the notice is still the reason it
  exists, for a narrower exposure than the one it was written for.
- **No analytics, no trackers, no third-party scripts, no backend.** The app
  sends nothing anywhere except to the Stellar RPC endpoint from `.env`, and
  the wallet picker's icons are served from local files so opening it makes no
  request at all.
- The badge cap field accepts **only 1–10,000**, the same bound the contract
  enforces, with the same wording as the contract's `MaxClaimsTooLarge` error.
- **The CSV export is opt-in and holds only what the page has read.** Nothing
  downloads until the button is pressed; the file is built in the browser, its
  name is `eventbadges-<event id>-<UTC date>.csv`, and the control says in
  plain words that it is not the event's attendee list — v0's contract has no
  way to list attendees (`src/lib/badgeCsv.ts`, draft 05).

## Getting started

Requires **Node.js 24** (what CI and the maintainer's machine use).

```bash
cp .env.example .env      # then fill in the values
npm install
npm run dev
```

`.env` is git-ignored and must never be committed. Every value the app reads is
documented in [.env.example](.env.example), and it is read in exactly one place,
[src/config.ts](src/config.ts). Until a contract is deployed, the contract id
stays a placeholder and the app shows the configuration notice.

## Checks

```bash
npm run lint        # oxlint
npm run typecheck   # tsc -b (strict)
npm test            # vitest: unit tests for src/lib, render + axe checks
npm run build       # tsc -b && vite build
```

All four run in CI ([.github/workflows/web.yml](.github/workflows/web.yml)).
Local submission checks and their limits are recorded in
[docs/testing.md](docs/testing.md); this does not assert that remote CI passed.

## Structure

```text
├── src/
│   ├── config.ts          # the only place .env is read
│   ├── lib/               # pure logic + unit tests
│   │   ├── network.ts     #   config resolution, testnet-only refusal
│   │   ├── datetime.ts    #   Unix seconds <-> local input
│   │   ├── claimCode.ts   #   generate / hash / validate claim codes
│   │   ├── qr.ts          #   hand-rolled QR encoder + repaired matrix decoder
│   │   ├── qrScan.ts      #   camera-frame scanner: pixels -> modules -> text
│   │   ├── camera.ts      #   camera plumbing + reviewed failure wording
│   │   ├── badgeCsv.ts    #   opt-in CSV of records the app has read
│   │   ├── badge.ts       #   Event and Badge records, window and cap rules
│   │   ├── validation.ts  #   address, event id and cap checks
│   │   ├── contractErrors.ts  # error code -> ERRORS.md wording
│   │   ├── scval.ts       #   JS <-> xdr.ScVal conversions
│   │   ├── contract.ts    #   the Soroban client (build/simulate/submit)
│   │   ├── wallet.ts      #   Stellar Wallets Kit adapter (eight Stellar
│   │   │                  #     modules, imported by entry point)
│   │   ├── flow.ts        #   the one write path (network gate, sign, submit)
│   │   └── explorer.ts    #   explorer links  │   ├── hooks/             # useWallet, useAction
  │   ├── components/        # UI only (QrCode draws the claim ticket's QR,
│   │                        #   QrScanner opens the camera and scans it)
│   └── pages/             # one per flow
├── docs/  │   ├── decisions/         # ADRs: contract binding, in-browser claim
  │   │                      #   codes, wallet modules by entry point,
  │   │                      #   hand-rolled QR encoder

│   ├── issue-drafts/      # everything not built, as drafts
│   └── contract-errors.md # vendored copy of ERRORS.md, used by the tests
└── scripts/deploy-testnet.sh   # written, never run by an agent
```

## Errors

Error wording is **never written in this repo**. `src/lib/contractErrors.ts`
maps the contract's numeric error codes to the "user-facing message" column of
`ERRORS.md` in `eventbadges-contracts`, and
[src/lib/contractErrors.test.ts](src/lib/contractErrors.test.ts) fails if a
variant in the vendored copy of that table has no mapped message — in either
direction. It also cross-checks the live contracts repo's table when that repo
is checked out alongside this one. If `ERRORS.md` changes, re-copy
[docs/contract-errors.md](docs/contract-errors.md) in the same commit.

## What is proven vs assumed

Read this before trusting the app with anything.

**Proven locally (remote CI must be checked separately):**

- Unit and render tests include an automated
  axe-core accessibility check on every screen and its states
  (`npm test`, [src/test](src/test)).
- Lint (oxlint, 0 warnings), strict type-check (`tsc -b`), and a production
  build all pass (`npm run lint`, `npm run typecheck`, `npm run build`).
- The error map matches the vendored `ERRORS.md` table in both directions, and
  the table matches the contracts repo when present.
- The claim code's browser SHA-256 matches Node's own SHA-256 (cross-checked in
  `src/lib/claimCode.test.ts`), and the ScVal conversions round-trip the exact
  structs the contract stores.
- The ticket tree matches fixed vectors computed independently with .NET's
  SHA-256, and every proof folds back to the committed root
  (`src/lib/merkle.test.ts`), which is asserted again per generated ticket in
  the organizer render test.
- The QR encoder agrees with matrices generated by an independent reference
  implementation (fixed vectors across versions, levels and all eight masks),
  every case round-trips through the repaired decoder (which now repairs wrong
  codewords up to the level's Reed–Solomon budget), and the QR actually
  rendered on screen — SVG parsed back out of the DOM — decodes to the exact
  ticket (`src/lib/qr.test.ts`, `src/components/QrCode.test.tsx`,
  `src/pages/OrganizerPage.test.tsx`).
- The attendee-side camera scanner is implemented and tested headlessly: it
  opens the camera only after the scan button, releases the stream on success,
  cancel and unmount, shows the reviewed wording on every camera failure, and
  decodes a rasterised ticket frame end to end — pixels in, text out — at
  several camera distances, off-centre, tilted and noisy, across all four
  correction levels, with the decoded value validated through the same
  `checkClaimEntry` path typed input uses (`src/lib/camera.test.ts`,
  `src/components/QrScanner.test.tsx`, `src/lib/qrScan.test.ts`,
  `src/lib/qr.test.ts`).
- The wrong-network refusal: a write against a wallet that is not on testnet
  fails **before** any transaction is prepared (`src/lib/flow.test.ts`).
- Duplicate create/claim submissions are blocked from the first browser hash,
  and the previous successful event's tickets survive a failed retry. Wallet
  restoration, connection and network checks cannot restore a disconnected
  session when their responses arrive late. Verification clears old results
  and CSV exports when inputs change or a retry fails, and accepts Enter.
  These are mocked regressions, not evidence of real wallet operation.
- Two things have been **seen working in a real browser** (Chromium, against
  the dev server): the badge mark, rendered from the app's own `BadgeCard` for
  several badges, and the opt-in CSV, whose button made the browser write
  `eventbadges-7-2026-10-05.csv` with the expected bytes. Both used records
  injected into the page — no contract is deployed, so no screen has yet shown
  a record read off a real network.

**Assumed — written, reviewed, never exercised against the real thing:**

- **Every contract call.** No contract is deployed, so no `get_event`,
  `has_badge`, `badges_of`, `create_event`, `claim`, `award` or `revoke` has
  ever run against the real contract. The client follows the SDK's standard
  flow and the ABI in `src/lib.rs`, but that is review, not proof. Draft 08 is
  the plan to change this.
- **Every wallet interaction.** No wallet has ever signed anything through this
  app. The kit's picker offers exactly eight Stellar wallets, each imported by
  its own entry point and drawn from a local icon (`src/lib/wallet.ts`), and
  opening that picker is the one part of this list that *has* been seen in a
  browser — but connect, sign and the network re-read have not been run. The
  mobile story in particular is untested (draft 10).
- **The privacy notice has never been read by anyone.** It is unit-tested,
  render-tested and axe-checked, and it is the honest account of what the
  contract does — but it has not been shown to a person, let alone a lawyer,
  an accessibility user, or someone in a queue wanting a badge. Whether it is
  an adequate notice is an open question in `ROADMAP.md`, not a solved one.
- **The QR codes have never been scanned by a phone camera.** The on-screen
  SVG decodes back to the code in the tests, but no physical-world scan has
  happened, so "a camera in an event-hall doorway reads this" is an
  assumption, not a result.
- The deployment script (`scripts/deploy-testnet.sh`) has never been run.
- There has been **no security review or audit**. Do not treat this as safe for
  real money — it is not, and it does not handle real money.
- `npm audit` reports 19 advisories (12 low, 7 moderate), all transitive through
  the wallet kit's multi-chain modules; the only offered fix is a breaking
  downgrade and was not applied. The app no longer imports or bundles those
  modules (draft 06, decision C, 2026-10-05), so the advisories describe
  installed code the app cannot reach — the packages are still in the tree, and
  a single future import from the kit's root would put them back in a chunk.

## Contract deployment

Deployment is gated on a real pilot and is **the human's job**:
[scripts/deploy-testnet.sh](scripts/deploy-testnet.sh) refuses to run unless
`PILOT_CONFIRMED=yes` is set explicitly. It prints the contract id that goes
into `.env` as `VITE_CONTRACT_ID`.

## Decisions and roadmap

- [docs/decisions/](docs/decisions/) — why the binding is hand-built, and why
  claim codes are generated in the browser.
- [ROADMAP.md](ROADMAP.md) — what is next; [docs/issue-drafts/](docs/issue-drafts/)
  — everything not built, as drafts the maintainer may turn into issues.

## License

MIT — see [LICENSE](LICENSE).
