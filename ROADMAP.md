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
- [ ] Everything else in [docs/issue-drafts/](docs/issue-drafts/), prioritised
      by what the first pilot actually needs: the QR claim code (01), mobile
      wallet story (10), code-split (07), advisory decision (06), and the
      rest.

## v0 screens (from playbook section 9) — built

- Organizer: create an event, show a claim code (QR is draft 01), see the
  claim count, award and revoke.
- Attendee: enter a code (scanning is draft 02), claim, see badges.
- Public: verify that an address holds a badge for an event, no wallet needed.

Known app gaps, deliberately out of v0 and drafted: badge artwork (03),
share-to-social card (04), CSV export of attendees (05, opt-in only), restore
of archived records (09).

## Decisions needed from Tim

1. **Build standard — decided (2026-10-02).** v3 sections 4 and 9 are the
   scope authority for what the app shows; v4 plus the schoolfees repos are
   the standard for how it is built (doc set, AGENTS.md, CI, checkers).
2. **Wallet kit advisories — drafted, not decided (2026-10-03).** Accept and
   document, pin, or narrow further: draft 06.

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
      nowhere should be described as consent. Shipping the notice settles none
      of them — the gate is `aria-disabled` plus a refusal in `submitClaim`,
      recorded nowhere, which is deliberate rather than a stopgap.
- [ ] **Third parties in the path.** The app sends addresses — and the claim
      code inside the public `claim` transaction — to the Stellar RPC
      endpoint, and explorers index events. How are RPC operators and
      explorers characterised (processor, independent controller), and can a
      pilot simply accept the public testnet RPC?
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
