# AGENTS.md

Rules for any AI agent working in this repository (`eventbadges-app`). Read this file at the start of every task.

## Project context

`eventbadges` is a Stellar/Soroban project with three repos: `eventbadges-contracts` (Rust contract), `eventbadges-app` (this repo, a small web app) and `eventbadges-docs` (mdBook docs). Built by one person, public, open to outside contributors. Testnet only, never mainnet.


**Never put attendee names, phone numbers, emails or IDs on-chain. Opaque references or hashes only.**

**Pilot honesty:** no `eventbadges` app has ever run against a deployed contract or a real wallet, and no pilot has happened. Never invent users, partners, addresses, hashes or outcomes.

## Source of truth

1. `README.md` — honest status and limitations.
2. `ROADMAP.md` — what v0 is and what is deliberately unimplemented.
3. The contract repo's `ERRORS.md` (once it exists) — error wording is mapped from its "user-facing message" column and never invented here.

## Commit rule

- One logical change per commit. Subject: `type: imperative summary`, 72 characters or fewer. Stage by explicit file name and read the staged diff before committing. NO Codebuff or co-author trailers. No history rewrites. No filler, empty or backdated commits. Commit counts are never a goal.

## App rules (once code exists)

- Wallets sign; the app NEVER asks for, stores or logs a secret key or seed phrase.
- Always show a visible "TESTNET - no real money" banner and refuse to operate on any other network.
- Read the network and contract id from `.env` values only. Never hardcode contract ids, addresses or keys.
- Map contract errors to plain-language messages from the contract repo's `ERRORS.md`; for an unknown code, show a generic message and add `TODO(verify)`.
- Show the transaction hash and an explorer link after every action.
- Mobile-first and accessible. No analytics, trackers or third-party scripts. No backend in v0.
- Vite + React + TypeScript, strict mode. Pure logic in `src/lib/` with tests next to it; UI in `src/components/` and `src/pages/` without business logic.
- The wallet kit uses a Stellar-only module set and local icon assets — no remote icon requests, no multi-chain modules.
- No personal data may appear in any payload that reaches the chain.

## Collaboration rules

- Lead with the result or the next action; detail comes after.
- Call out incorrect assumptions plainly, in one sentence, and continue with what is true.
- Ask before anything destructive, legal, security-related, payment-related or irreversible; record high-stakes questions under "Decisions needed from Tim" in `ROADMAP.md` and carry on with the rest.
- Honest completion report: what was tested, what was not, any defect found.
- Do not invent requirements, and do not add scope beyond the task.
