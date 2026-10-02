# Roadmap

What is next for `eventbadges-app`, in order. Anything not listed as done is
**not implemented**.

## Status

- [x] Repository governance: AGENTS.md, CONTRIBUTING.md, ROADMAP.md, LICENSE,
      .gitignore, .gitattributes (2026-10-01).
- [ ] v0 app from the project's playbook section (screens below).

## Next

- [ ] Vite + React + TypeScript scaffold, strict mode, `.env`-only
      configuration, testnet refusal paths.
- [ ] Pages per `STELLAR-BUILD-PLAYBOOK-v3.md` section 9 (shared app
      prompt in section 4; file present in
      `~/Desktop/Drips/_reference/playbooks/`, confirmed 2026-10-02):
      TESTNET banner on every screen, error mapping from the contract repo's
      `ERRORS.md`, transaction hash and explorer link after every action,
      local wallet icons, Stellar-only wallet kit module set, mobile-first
      accessible markup.
- [ ] Unit tests for pure logic in `src/lib/`; render tests with an automated
      axe-core check (the schoolfees standard).
- [ ] CI (`web.yml`): lint, type-check, tests, production build. Lands with
      the first code that can pass it.

## v0 screens (from playbook section 9)

- Organizer: create an event, show a claim code or QR, see the claim count.
- Attendee: enter or scan a code, claim, see their badges.
- Public: verify that an address holds a badge for an event.

Known app gaps, deliberately out of v0: badge artwork, share-to-social card,
CSV export of attendees (opt-in only).

## Decisions needed from Tim

1. **Build standard — decided (2026-10-02).** v3 sections 4 and 9 are the
   scope authority for what the app shows; v4 plus the schoolfees repos are
   the standard for how it is built (doc set, AGENTS.md, CI, checkers).

## Explicitly out of scope

Mainnet, any backend or database, analytics or trackers. Anything the v0
design does not ask for.
