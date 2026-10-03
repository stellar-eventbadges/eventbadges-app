# AGENTS.md

Rules for any AI agent working in this repository. Read this file at the start of every task.

## Project context

`eventbadges` is a Stellar/Soroban project with three repos: `eventbadges-app` (web app, this repo), `eventbadges-contracts` (Rust contract) and `eventbadges-docs` (mdBook docs). It is built by one person, is public and will be open to outside contributors.

- **Testnet only.** No mainnet, ever, in this phase.
- **One builder.** There is no team; write for a solo maintainer.
- **Pilot users are real people**, not developers — community organizers and attendees.
- **Never put attendee names, phone numbers, emails or IDs on-chain. Opaque references or hashes only.** The [docs book](https://github.com/stellar-eventbadges/eventbadges-docs) has the field-by-field privacy inventory.
- **No deployment until a real organizer or chapter has agreed to try the flow.** The pilot gate lives in the contracts repo's `ROADMAP.md`. The contract id in `.env` is the human's to set, after a real deployment.
- **Pilot honesty:** no `eventbadges` contract is deployed and no pilot has happened. Never invent users, partners, addresses, hashes or outcomes.

## Source of truth

Read these before changing anything, in this order:

1. `README.md` — what works today, and the honest limitations.
2. `ROADMAP.md` — what v0 is, and what is deliberately unimplemented.
3. `docs/decisions/` — decisions already made, with their reasoning.
4. `docs/contract-errors.md` — the vendored copy of the contract's `ERRORS.md`; the wording there is the single source of truth for every user-facing error string, and it is never re-typed or paraphrased in this repo.
5. The [docs book](https://github.com/stellar-eventbadges/eventbadges-docs) — system-level architecture lives there; link to it, never restate it here.

## Collaboration rules

- **Lead with the result or the next action.** Say what happened or what you need first; detail comes after.
- **Call out incorrect assumptions plainly.** If a premise in the task is wrong, say so in one sentence and continue with what is true.
- **Ask before anything destructive, legal, security-related, payment-related or irreversible.** Do not guess on a high-stakes decision: record it under "Decisions needed from Tim" in `ROADMAP.md` and carry on with the rest.
- **Honest completion report.** Before saying done, state what you tested, what you did **not** test, and any defect you found. "It works" without evidence is a liability, not a signal.
- Do not invent requirements, and do not add scope beyond the task.

## Toolchain

Verified on this machine on 2026-10-03 (inherited from the completed schoolfees app, same stack). Re-check against the official docs — do not trust version pins in other people's repos without checking.

- Node.js **24** (same major as CI).
- Vite + React + TypeScript, strict mode. No Scaffold Stellar runtime: the app talks to an **already deployed** contract through the Stellar SDK; the binding decision is in `docs/decisions/0001-contract-binding.md`.
- Wallets via `@creit.tech/stellar-wallets-kit`, restricted to Stellar-only wallets with **local icon files** (`public/wallet-icons/`), so the picker never phones home.

Commands (run from the repository root):

```bash
npm run lint        # oxlint
npm run typecheck   # tsc -b, strict
npm test            # vitest
npm run build       # tsc -b && vite build
```

## App rules

- Wallets sign; the app NEVER asks for, stores or logs a secret key or seed phrase. It only ever sees a public address and a signed XDR.
- Always show a visible "TESTNET - no real money" banner and refuse other networks: the network comes from `.env`, the passphrase is pinned in `src/lib/network.ts`, and the wallet's network is re-read before every write.
- Map contract errors to plain-language messages using the "user-facing message" column of the contract's `ERRORS.md` via `docs/contract-errors.md` — do not invent different wording.
- Show the transaction hash and an explorer link after each action.
- Mobile-first, accessible (labels, `aria-describedby`, focus on page change, axe-checked), no analytics or trackers, no backend in v0.
- Never hardcode contract ids, addresses or keys; read them from `.env` values the human provides — read in exactly one place, `src/config.ts`.

## Code rules

- Pure logic lives in `src/lib/` with unit tests; pages hold form state only.
- No `any`. No `unwrap()`-style shortcuts; validate at the boundary with typed results.
- Every page test renders through `src/test/render.tsx` and includes the axe check; no test touches a network, a wallet or a real contract.
- Include `.gitignore` (node_modules, dist, coverage, .env), README, CONTRIBUTING.md, ROADMAP.md, and CI (`web.yml`: lint, type-check, test, build).

## Commit rules

- One logical change per commit. Never bundle unrelated changes.
- Never create empty or filler commits.
- Every commit must pass this repository's checks (the commands listed under Toolchain above).
- Conventional format: `type: imperative summary`, where `type` is one of `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `style` or `perf`.
- Subject line: 72 characters or fewer, in the imperative mood. No trailing period.
- Stage files by explicit name. **Never** `git add -A` or `git add .`.
- Run `git status` and read the staged diff (`git diff --staged`) before every commit. Do not commit a file you did not intend to change.
- Never commit `.env` contents, key material, a secret, or a secret-looking string. If you see one in a diff, stop and say so.
- Do not rewrite history.
- Never add a "Generated with Codebuff" trailer or any co-author trailer to commit messages.

## Safety rules

- Testnet only. Never mainnet.
- NEVER read, print, log, commit, or ask for secret keys, seed phrases or `.env` contents. Any deploy script is written for the human to run, never by an agent.
- Do NOT deploy, push, change git remotes, create GitHub issues, install tools beyond `npm install` in this repo, run `sudo`, or pipe downloads into a shell.
- Do not add dependencies without saying why, and check the package (maintainer, recent releases) first. Run `npm audit` and report; never auto-fix with `--force`.

## Truthfulness and evidence rules

- Never invent function names, flags, or crate or package APIs. If unsure, read the official docs or the installed package source. If you still cannot verify, write `TODO(verify)` and list it in your final summary.
- Docs must describe only what the code does. Anything not built is marked "Not implemented yet".
- Never invent contract addresses, transaction hashes, users, testers, quotes, or pilot outcomes.
- When referencing a real third-party project as inspiration for structure (not code), never copy its name, branding, specific figures, or claims. Cite the pattern, not the source's content.

## Scope rules

- Build v0 only. Do NOT implement items listed under "Deliberately unimplemented" in `ROADMAP.md`; record them there. Those become contributor issues.
- Write each unimplemented item as a draft in `docs/issue-drafts/NN-title.md` using the template below. Do not create issues on GitHub.
- Do not add scope beyond what the task asks, even if a reference project does more. A working v0 with honest limitations beats a half-working v1.

## Issue draft template

```markdown
# Title (imperative, specific)
**Difficulty:** easy | medium | hard
**Labels:** good first issue | help wanted | area:<contracts|app|docs|ci>

## Problem
What is missing or wrong, and why it matters.

## Scope
What to change. What is explicitly out of scope.

## Acceptance criteria
- [ ] Checkable statements (tests pass, docs updated, behavior X).

## Where to start
Files or functions, and the docs to read.

## How to test
Exact commands.
```
