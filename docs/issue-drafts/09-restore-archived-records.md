# Restore an archived event record

**Difficulty:** hard
**Labels:** help wanted, area:app

## Problem

Soroban archives contract entries nobody has touched for long enough. An old
event that nobody has read or written recently can be archived, and a claim,
award, revoke or even a read against it then fails at simulation. The app
detects this (`rpc.Api.isSimulationRestore` in `src/lib/contract.ts`) and
shows: "This record has been archived by the network and must be restored
before it can be used. This app cannot restore archived records yet." That is
honest, but it means an old event simply stops working.

## Scope

Add a restore step to the write path: when a simulation comes back as
`RestoreFootprint`, build and submit the restore transaction (with the user's
explicit consent, since it costs fees), then retry the original call. Reads
should say plainly that they do not — and must not — restore anything
automatically (see the matching decision in `schoolfees-app`, draft 18 there).

Out of scope: automatic restoration without consent, any mainnet work.

## Acceptance criteria

- [ ] A write against an archived event offers the restore, states the fee implication, and proceeds only on consent.
- [ ] After a successful restore, the original action is retried and completes.
- [ ] Reads never restore; the read path's message stays accurate.
- [ ] The archived path is unit-tested (the doubles can simulate `isSimulationRestore`).
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/lib/contract.ts` (`assemble` and `read`, where the restore case is
detected), and the SDK's restore transaction builders. Compare with
`schoolfees-app`'s draft 08 for the same problem in a sibling project.

## How to test

```bash
npm test
```

Then, ideally, force an archive on testnet by waiting out the TTL on a throwaway
event and exercise the flow for real.
