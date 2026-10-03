# End-to-end tests against testnet

**Difficulty:** medium
**Labels:** help wanted, area:ci

## Problem

Every unit test in this repo runs offline against pure functions and doubles.
Nothing has ever exercised the real path: build a transaction, simulate it,
sign it with a wallet, submit it, and read the record back. The contract
client, the ScVal conversions and the claim-code hash check are therefore all
*assumed* correct rather than proven — the README's "what is proven vs
assumed" section says exactly that.

## Scope

Add an automated end-to-end test that runs the full event lifecycle against
**testnet** with a funded test account: create an event, claim with the right
code (and assert the wrong code fails with `ClaimCodeMismatch`), read the badge
back, award, revoke. Run it in CI only when the contract id and a test account
are configured, and skip (not fail) otherwise.

Out of scope: mainnet, real identities, or storing any key in the repository.
Secrets come from CI secrets or are not present at all.

## Acceptance criteria

- [ ] The test creates, claims (happy and mismatch paths), reads, awards and revokes on testnet, asserting the contract's responses at each step.
- [ ] It skips cleanly when the contract id or account is not configured, rather than failing CI.
- [ ] No secret key, seed phrase or contract id is hardcoded or committed.
- [ ] A failure names the step and links the transaction on the explorer.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/lib/contract.ts` is the code under test; `src/lib/flow.ts` shows the write
path; `src/lib/claimCode.ts` shows the hash the contract checks. The lifecycle
rules are in `eventbadges-contracts` (`src/lib.rs`, `ERRORS.md`,
`docs/claim-codes.md`).

## How to test

```bash
npm test
```

Then configure a funded testnet identity in CI and confirm the end-to-end test
runs and passes there.
