# Roadmap

What is next for `eventbadges-app`, in order. Anything not listed as done is
**not implemented**.

## Status

- [x] Repository governance: AGENTS.md, CONTRIBUTING.md, ROADMAP.md, LICENSE,
      .gitignore, .gitattributes (2026-10-01).
- [ ] v0 app — **blocked on the playbook file, see below.**

## Next

- [ ] Vite + React + TypeScript scaffold, strict mode, `.env`-only
      configuration, testnet refusal paths.
- [ ] Pages per the project's playbook section 9 (shared app prompt):
      TESTNET banner on every screen, error mapping from the contract repo's
      `ERRORS.md`, transaction hash and explorer link after every action,
      local wallet icons, Stellar-only wallet kit module set, mobile-first
      accessible markup.
- [ ] Unit tests for pure logic in `src/lib/`; render tests with an automated
      axe-core check (the schoolfees standard).
- [ ] CI (`web.yml`): lint, type-check, tests, production build. Lands with
      the first code that can pass it.

## Blocked on the playbook

The screens and flows for v0 are defined in the playbook, which was not found
on this machine at Session 0. Until Tim supplies it, no feature scope is
invented here.

## Decisions needed from Tim

1. **Playbook location.** Provide
   `~/Desktop/Drips/_reference/playbooks/STELLAR-BUILD-PLAYBOOK-v3.md` so the
   shared app prompt (section 4) can scope v0.

## Explicitly out of scope

Mainnet, any backend or database, analytics or trackers. Anything the v0
design does not ask for.
