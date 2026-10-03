# 0001 — Contract binding: hand-built client, no generated code

- **Status:** accepted
- **Date:** 2026-10-03
- **Deciders:** maintainer (solo builder)

## Context

The app needs to call the `eventbadges` contract. The contract lives in
`eventbadges-contracts` and is finished and tested, but **not deployed** —
deployment is gated on a real pilot. The app therefore needs a binding that can
be written now and exercised later, without generating a client from a deployed
contract (there is none to generate from).

## What was checked

- `src/lib.rs` in `eventbadges-contracts` defines exactly seven entrypoints:
  `create_event`, `claim`, `award`, `revoke`, `get_event`, `has_badge`,
  `badges_of`, with the argument types `Address`, `BytesN<32>`, `Bytes` (the
  claim code), `u32` and `u64`.
- `src/types.rs` shows the `Event` and `Badge` structs are stored with
  snake_case field names on-chain (`name_hash`, `claim_code_hash`,
  `max_claims`, `closes_at`, `claim_count`, `event_id`, `issued_at`), which is
  what `scValToNative` returns for a Soroban struct.
- Scaffold Stellar's generated-client flow was already rejected for this repo
  (see the parallel decision in `schoolfees-app`, ADR 0001 there): it needs
  global tool installs and would scaffold its own contracts workspace.

## Decision

Build the binding **by hand, in two small layers**, copied in shape from the
proven `schoolfees-app` structure:

1. `src/lib/scval.ts` — pure JS ⇄ `xdr.ScVal` conversions for exactly the ABI's
   types (`Address`, `BytesN<32>`, `Bytes`, `u32`, `u64`) and the two response
   structs, reading the on-chain snake_case fields. Unit-tested against
   `nativeToScVal` with the same type hints the contract uses.
2. `src/lib/contract.ts` — the RPC client. Method names and argument order
   match `src/lib.rs` one for one. Writes follow build → simulate → assemble →
   sign → submit → poll; reads are simulated as read-only calls with the
   connected address as source. A simulation that reports `isSimulationRestore`
   surfaces the archived-record situation as plain text instead of a crash,
   because v0 has no restore flow (drafted in `docs/issue-drafts/`).

The contract id is configuration (`.env` → `src/config.ts`), never generated
code, and stays a placeholder until a real deployment.

## Consequences

- The binding is **type-checked but unproven against a live contract**. Nothing
  here has ever been exercised on testnet; the README's "what is proven vs
  assumed" section says so, and `docs/issue-drafts/07-end-to-end-tests-against-testnet.md`
  is the plan to change that.
- When the contract's ABI changes, `src/lib/contract.ts`, `src/lib/scval.ts`
  and their tests must change in the same commit. There is no generator to
  re-run, so drift is prevented by tests reading the repos side by side where
  they can (the error-table cross-check) and by review where they cannot.
- Error wording comes from `ERRORS.md` via the vendored table and
  `src/lib/contractErrors.ts`, exactly as in schoolfees; the test fails if the
  two drift apart in either direction.

## Re-evaluate when

- The contract grows beyond its seven entrypoints, or
- Stellar ships a stable generated-client flow that works against an existing,
  not-yet-deployed contract repo.
