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
- [ ] Everything in [docs/issue-drafts/](docs/issue-drafts/), prioritised by
      what the first pilot actually needs: QR claim code (01), mobile wallet
      story (10), code-split (07), advisory decision (06), and the rest.

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

## Explicitly out of scope

Mainnet, any backend or database, analytics or trackers. Anything the v0
design does not ask for.
