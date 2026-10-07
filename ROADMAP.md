# Roadmap

What is next for `eventbadges-app`, in order. Anything not listed as done is
**not implemented**.

## Status

- [x] Repository governance: AGENTS.md, CONTRIBUTING.md, ROADMAP.md, LICENSE,
      .gitignore, .gitattributes (2026-10-01).
- [x] v0 app from the project's playbook section (2026-10-03): scaffold,
      all three screens, wallet kit, testnet banner, error map, local wallet
      icons, CI, unit + render + axe tests. **Never run against a deployed
      contract; nothing is proven on a network** — see the README's
      "what is proven vs assumed".

## Next

- [ ] Prove the app against the real thing, in this order: deploy (human, via
      `scripts/deploy-testnet.sh`, pilot gate), then end-to-end tests
      (draft 08), then a real wallet connect + claim (draft 10).
- [x] Attendee privacy notice on the claim screen, gating the claim button on
      an explicit acknowledgement (2026-10-03, draft 11). Short notice plus an
      in-place full version, copy in `src/lib/privacyNotice.ts`, axe-checked.
      **Never shown to a person** — see the README's proven-vs-assumed.
- [x] A mark on every badge card, drawn from the badge's own bytes (2026-10-05,
      draft 03): FNV-1a over `eventId` + `issuedAt` + holder address into a
      mulberry32 PRNG, rendered as inline SVG from the existing accent tokens.
      Deterministic, no image file, no request, `aria-hidden`, and the on-chain
      record below it unchanged. **Generated geometry, not designed artwork** —
      a real illustration is still open if the pilot wants one.
- [x] Wallet kit off the first paint, loaded only for the eight Stellar
      wallets the app offers (2026-10-05, drafts 07 and 06 option C): initial
      chunk 1,058.76 kB / 267.30 kB gzip → 809.82 kB / 191.97 kB gzip, and the
      kit's multi-chain modules (`MetaMask`, `Ledger`, `Trezor`,
      `WalletConnect`/Reown and their NEAR/Solana tree) are in no built chunk.
      `npm audit` still reports 19 advisories — the packages remain installed,
      they are simply no longer shipped. Picker opened in a browser; **no real
      wallet has connected or signed**.
- [x] Opt-in CSV export of the badge records a screen has read (2026-10-05,
      draft 05): a pure builder with formula-injection guards and a
      deterministic `eventbadges-<event id>-<date>.csv` name, and a control on
      the claim screen's badge list and the verify screen's result that says in
      the UI it is not a roster. **Downloaded once in a real browser** (fake
      records injected, since nothing is deployed): Chromium wrote the
      deterministic file with the expected bytes. An organizer-side export
      stays impossible until the contract can list an event's attendees.
- [x] Each claim ticket rendered as a QR beside its text on the create-success
      screen (2026-10-06, draft 01): a hand-rolled encoder in `src/lib/qr.ts`
      — no new npm dependency, [ADR 0004](docs/decisions/0004-hand-rolled-qr-encoder.md)
      — rendered as inline SVG with a per-attendee label. **Decoded back to
      the ticket from the rendered SVG in the tests, but never scanned by a
      real phone camera** — that step is the human's, and the draft's last
      line still stands.
- [x] Scan a claim code with the camera on the attendee side (2026-10-07,
  draft 02): open the device camera from an explicit button, poll frames
  through a local pixel-to-modules pipeline (`qrScan`) paired with the repaired
  matrix decoder (`qrDecode`), and validate the decoded value through the same
  `checkClaimEntry` path typed input uses. Camera failure wording is reviewed
  and per-cause (denied, missing, unsupported, generic fallback); the stream is
  stopped on success, cancel and unmount, and decoding is local — no new network
  request. The decoder keeps being hand-rolled (ADR 0005); no new dependency.
  **Never scanned by a real phone camera** — that step is the human's, and the
  draft's last line still stands.
- [ ] Everything else in [docs/issue-drafts/](docs/issue-drafts/), prioritised
  by what the first pilot actually needs: the mobile wallet story (10),
  and the rest.

## v0 screens (from playbook section 9) — built

- Organizer: create an event, generate one ticket per attendee and show them
  once, each with its QR code, see the claim count, award and revoke.
- Attendee: enter a code, claim, see badges — and scan a ticket with the device
  camera instead of typing it (draft 02). The camera only starts after the scan
  button, releases on success, cancel and unmount, and a failed scan shows the
  reviewed wording; the decoded value is validated the same way a typed one is.
  **Never scanned by a real phone camera** — that step is the human's.
- Public: verify that an address holds a badge for an event, no wallet needed.

Known app gaps, deliberately out of v0 and drafted: share-to-social card (04),
restore of archived records (09), real designed badge artwork — the generated
mark from draft 03 is what `BadgeArt` draws today — and an attendee roster: CSV
export now exists for the records a screen has read (05), but nothing can list
an event's attendees until the contract gains that entrypoint.

## Decisions needed from Tim

1. **Build standard — decided (2026-10-02).** v3 sections 4 and 9 are the
   scope authority for what the app shows; v4 plus the schoolfees repos are
   the standard for how it is built (doc set, AGENTS.md, CI, checkers).
2. **Wallet kit advisories — decided 2026-10-05 (option C, draft 06).** The
   app imports the eight Stellar modules by their own entry points, so the
   flagged multi-chain tree is no longer bundled; the packages stay installed
   and `npm audit` keeps reporting them. What is *not* decided: whether the
   audit noise is acceptable at pilot time, and whether the returning-session
   load should be deferred so the kit's chunks are not fetched by visitors who
   never touch a wallet (draft 07 records the trade-off).

### Legal review of the on-chain privacy model — needed before any pilot with real attendees

The privacy page in the docs book raises questions only a human can answer.
They are collected here as a checklist so the decision is concrete. Working
through it produces a written position, not a compliance certificate, and is
not legal advice. Source: [Privacy: what is on-chain](https://github.com/stellar-eventbadges/eventbadges-docs/blob/main/src/privacy.md);
the same checklist is recorded in the ROADMAPs of all three eventbadges
repos, so they stay in sync.

- [ ] **Applicable law.** Which regimes apply to a pilot — GDPR (any EU/EEA
      attendee?), NDPR/NDPA (Nigeria), other local law — and does the answer
      change when the pilot group crosses a border?
- [ ] **Who is the controller?** For an attendance record on a public
      ledger: the organizer (they choose the event and who gets a badge),
      the project, both, or neither? Write the position down before
      recruiting anyone.
- [ ] **Lawful basis.** What basis covers putting a wallet address and an
      attendance fact on an immutable public ledger — consent, legitimate
      interest, something else? Can consent be freely given when nothing can
      ever be deleted, and what must the claim flow say before the wallet
      signs?
- [ ] **Erasure vs. immutability.** `revoke` removes the badge, but the
      `badge_claimed` event stays on-chain forever. Is that defensible under
      erasure and objection rights? If not, is the mitigation — no personal
      data on-chain, fresh-address guidance, declining unsuitable pilots —
      enough, and who signs off?
- [ ] **Are the hashes personal data?** `name_hash` is low-entropy and
      brute-forceable; an address becomes identifying the moment it is
      linked off-chain. Does "it is only a hash" or "pseudonymous" actually
      hold, or must both be treated as personal data?
- [ ] **Children.** The privacy page says events involving minors must never
      be pointed at this system without the organizer fully understanding
      everything is public. Make it operational: is "no under-18 events in a
      pilot" a hard rule, who checks, and what does the organizer attest to?
- [ ] **What attendees are told — copy drafted (2026-10-03), decisions
      open.** The text is answered in
      [docs/attendee-notice.md](docs/attendee-notice.md), with every line traced
      to the code that makes it true: a short on-screen version with a required
      acknowledgement, a full version one tap away, and the paragraph nobody
      had written — **the claim code is published inside the `claim`
      transaction and is permanent**, which the docs book currently denies.
      **Partly delivered 2026-10-03:** the copy exists and is implemented on the
      claim screen
      ([draft 11](docs/issue-drafts/11-attendee-privacy-notice.md)), so the
      "what must a person be told" half of the question is answered. Four
      decisions remain, and none of them is a copy question: who delivers it
      (the app, the organizer, or both — recommended both, with the organizer
      pointing at this text rather than writing their own); whether a missing
      notice blocks the first pilot (recommended yes — a claim is an
      irreversible public write of a linkable identifier, and the claim-code
      paragraph cannot be consented to if it was never disclosed); whether to
      change the contract instead of disclosing the exposure (bigger than any
      one repo should decide alone); and whether an acknowledgement recorded
      nowhere should be described as consent.
      Shipping the notice settles none of them — the gate is `aria-disabled`
      plus a refusal in `submitClaim`, recorded nowhere, which is deliberate
      rather than a stopgap. **Implemented 2026-10-04:** ADRs
      [0002](https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/decisions/0002-claim-code-not-in-transactions.md)
      and [0003](https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/decisions/0003-per-attendee-claim-codes.md)
      landed in the contracts repo and the app together — the claim transaction
      carries the code's leaf and proof, not the code, and the event stores a
      Merkle root, so the paragraph above is obsolete by construction and the
      notice was rewritten in the same change. That answers the "change the
      contract instead of disclosing" decision on this list; the other three
      still stand.
- [ ] **Third parties in the path.** The app sends addresses — and the claim
      code's leaf, inside the `claim` transaction —
      to the Stellar RPC endpoint, and explorers index events. How are RPC
      operators and explorers characterised (processor, independent
      controller), and can a pilot simply accept the public testnet RPC?
- [ ] **Off-chain handling by organizers.** Claim codes, attendee lists and
      check-in spreadsheets never touch the chain but stay with the
      organizer. Does the project owe organizers written data-handling
      guidance (what to keep, what to delete, how to share codes), and is
      that guidance a precondition for the first pilot?
- [ ] **The pilot's own records.** Pilot notes name participants only at
      their chosen level of detail and link real transactions. What consent
      does that require, and how long are pilot notes kept?

## Explicitly out of scope

Mainnet, any backend or database, analytics or trackers. Anything the v0
design does not ask for.
