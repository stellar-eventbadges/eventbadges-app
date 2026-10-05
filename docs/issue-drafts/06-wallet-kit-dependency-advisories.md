# Decide what to do about the wallet kit's dependency advisories

**Status:** decided 2026-10-05, option C — kept for the reasoning, not as open work
**Difficulty:** medium
**Labels:** help wanted, area:app

> **Decision: C — narrow the kit's module set so the multi-chain tree is never bundled.**
> `src/lib/wallet.ts` now imports the eight Stellar module entry points
> (`.../modules/{albedo,freighter,fordefi,rabet,xbull,lobstr,hana,scopuly}`)
> instead of calling the kit's `defaultModules()`, so `MetaMask`, `Ledger`,
> `Trezor`, `WalletConnect`/Reown, `OneKey`, `Bitget`, `Dcent`, `Klever`,
> `CactusLink`, `Ghostsig` and their NEAR/Solana transitive trees are never
> parsed, never offered in the picker, and not in any built chunk. Checked
> against the built `dist/`: no `metamask`, `relay.walletconnect.com`,
> `@ledgerhq`/`trezor`, `jayson`/`stream-json`/`solana` markers in any chunk.
> The same change is draft 07, which is where the size numbers live.
>
> **What this does not change.** The packages are still *installed*: they arrive
> as regular dependencies of the kit, so `npm audit` is unchanged and still
> reports **19 vulnerabilities (12 low, 7 moderate)** as of 2026-10-05 (same
> count on `--omit=dev`). `npm audit` reads the dependency tree, not the
> bundle, so the number will stay until either the kit drops the modules
> upstream or the project takes a breaking downgrade. `npm audit fix --force`
> (kit 1.5.0) is **still not applied and still not planned without review.**
>
> **Residual risk, deliberately written down.** The guard is the import
> allow-list, and it is a convention, not a mechanism: one future `import` from
> the kit root or of another module re-bundles the tree, and the audit number
> would then describe shipped code again. A test cannot see this (it is a build
> artefact question) — the cheap check is the `dist/` grep recorded above,
> repeated whenever the wallet adapter changes.
>
> **Alternatives rejected.** A (accept and document) ships ~1 MB of unreachable
> multi-chain code to every visitor and keeps the flagged tree on the critical
> path — the weakest option once C turned out to be possible without changing
> the picker. B (pin/override) has no honest version here: the only offered fix
> is the breaking downgrade the existing text already refuses.

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
   most likely never executes it. When this draft was written it **was**
   bundled — the initial chunk was ~1 MB, most of it this tree. Since the
   2026-10-05 decision (C) it is in no built chunk; the packages are still
   installed, so `npm audit` still counts them. "Probably not reachable" is a
   judgement, not a proof, and it belongs in writing — which is what the
   decision block above does.

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

- [x] Each advisory is recorded with its package, the advisory link, and whether this app can reach the vulnerable code. — recorded above with the decision: as of 2026-10-05 the code is not bundled, so the app cannot reach it at runtime; the packages remain installed.
- [x] A decision (A, B or C) is stated with its reasoning, and the alternative it rejected. — C, with A and B rejected above.
- [x] Whichever option is chosen, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass, and the connect flow still opens the wallet picker (recorded honestly, including that no real wallet has signed yet). — lint 0/0, typecheck clean, 185 tests / 26 files, build OK; the picker was opened in a browser and lists exactly the eight offered wallets. No real wallet has signed.
- [x] The `npm audit` numbers in this draft are refreshed at the time of the decision. — 19 vulnerabilities (12 low, 7 moderate), 2026-10-05, unchanged before and after the change.

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
