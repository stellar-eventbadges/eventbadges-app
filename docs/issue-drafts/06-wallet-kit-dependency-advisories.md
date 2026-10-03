# Decide what to do about the wallet kit's dependency advisories

**Difficulty:** medium
**Labels:** help wanted, area:app

## Problem

`npm audit` was run for the first time on 2026-10-03 and reports:

```
19 vulnerabilities (12 low, 7 moderate)
```

Every one arrives through `@creit.tech/stellar-wallets-kit@2.7.0`, whose
dependency tree pulls multi-chain wallet SDKs this app never uses:

- `@solana/web3.js` → `jayson` → **`stream-json`**
  (GHSA-528h-pc64-c93x, moderate: filter depth is O(depth²) on nested input);
- **`uuid@<11.1.1`** (GHSA-w5hq-g745-h8pq, moderate: missing buffer bounds
  check in v3/v5/v6), under `@hot-wallet/sdk`;
- a further `secp256k1` / `bufferutil` / `utf-8-validate` native-build tail
  (low), also under multi-chain modules.

Two things make this more than a version bump:

1. **The only offered fix is a downgrade.** `npm audit fix --force` would
   install `@creit.tech/stellar-wallets-kit@1.5.0` — a breaking change to the
   one dependency that makes the app work at all. It was **not** applied, and
   it never will be without review.
2. **The flagged code is multi-chain** (NEAR and Solana) and a Stellar-only app
   most likely never executes it, but it **is** bundled — the initial chunk is
   ~1 MB, most of it this tree. "Probably not reachable" is a judgement, not a
   proof, and it belongs in writing.

This mirrors the same decision in `schoolfees-app` (draft 17 there), where the
Stellar-only module filter already removed most of the flagged tree at runtime.

## Scope

Investigate, then choose **one** and document the reasoning:

- **A — accept and document.** Record each advisory, why the code path is not
  reached by this app, and the residual risk.
- **B — pin/override a patched transitive version** where that is possible
  without breaking the kit, and record what changed.
- **C — narrow the kit's module set further** so the multi-chain tree (and much
  of the bundle) is not installed at all. The app already filters to eight
  Stellar wallets in `src/lib/wallet.ts`; the question is whether the kit can
  be imported so the multi-chain modules are never even bundled. This is the
  option that removes the problem rather than documenting it, and it is the
  same change draft 07 wants.

Out of scope: `npm audit fix --force` without review; adding a dependency to
patch around the kit; changing the wallet UX or which wallets a user can pick
without saying so; and any change to the contract.

## Acceptance criteria

- [ ] Each advisory is recorded with its package, the advisory link, and whether this app can reach the vulnerable code.
- [ ] A decision (A, B or C) is stated with its reasoning, and the alternative it rejected.
- [ ] Whichever option is chosen, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass, and the connect flow still opens the wallet picker (recorded honestly, including that no real wallet has signed yet).
- [ ] The `npm audit` numbers in this draft are refreshed at the time of the decision.

## Where to start

`npm audit`, `npm ls @hot-wallet/sdk @solana/web3.js stream-json uuid`,
`package.json`, and `src/lib/wallet.ts` (the `defaultModules()` call is the
chokepoint).

## How to test

```bash
npm audit
npm ls @hot-wallet/sdk @solana/web3.js stream-json uuid
npm run lint && npm run typecheck && npm test && npm run build
```

Then confirm the connect flow still opens the wallet picker.
