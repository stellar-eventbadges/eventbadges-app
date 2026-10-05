# 0003 — Wallet modules are imported by entry point, not taken from the kit's default list

- **Status:** accepted — implemented 2026-10-05
- **Date:** 2026-10-05
- **Deciders:** maintainer (solo builder)

## Context

`@creit.tech/stellar-wallets-kit` ships `defaultModules()`: every wallet it knows
about, including `Ledger`, `Trezor`, `WalletConnect`/Reown, `MetaMask`,
`OneKey`, `Bitget`, `Dcent`, `Klever`, `CactusLink` and `Ghostsig`. Several of
those are multi-chain, and their transitive trees (`@solana/web3.js` → `jayson`
→ `stream-json`, `@hot-wallet/sdk` → an old `uuid`, plus a native-build tail)
are where all 19 `npm audit` advisories in this app come from.

The app's picker was already filtered to eight Stellar wallets by id, but the
filter ran *after* bundling: the initial chunk was 1,058.76 kB / 267.30 kB
gzipped, it contained the whole multi-chain tree, and opening the picker
produced a `Failed to restore Stellar MetaMask session: TransportTimeoutError`
warning from a wallet the app does not offer.

## What was checked

- The kit's `package.json` exports map: it publishes `./modules/*` for every
  module, so each one can be imported alone
  (`albedo`, `freighter`, `fordefi`, `rabet`, `xbull`, `lobstr`, `hana`,
  `scopuly`; `Keeper` is Stellar but not shipped by this version).
- A production build with the per-module imports: the initial chunk drops to
  809.82 kB / 191.97 kB gzipped, and the kit plus modules become async chunks
  (`esm` 73.96 kB, `xbull.module` 67.03, `albedo.module` 20.16,
  `freighter.module` 15.38, the rest smaller).
- The built `dist/`: no `metamask`, `relay.walletconnect.com`,
  `@ledgerhq`/`trezor`, `jayson`/`stream-json`/`solana` markers in any chunk.
  The multi-chain tree is removed, not merely filtered out of the UI.
- A browser run against the dev server: Connect opens the picker with exactly
  the eight wallets, every icon loads from the local `/wallet-icons/`, the
  MetaMask restore warning is gone, and closing the picker returns the button
  to `Connect wallet`.
- `npm audit` before and after: 19 advisories (12 low, 7 moderate), unchanged —
  because the packages are still installed.

## Decision

`src/lib/wallet.ts` imports the eight Stellar modules by their own entry points
and passes that list to `StellarWalletsKit.init`. The kit itself is loaded with
a dynamic `import()` behind a memoised promise (reset on failure, so a chunk
that failed to fetch is retried), inside `src/lib/wallet.ts`. `prefetchWallet()`
warms the chunks from the connect button's hover and focus handlers;
`initWallet()` runs once on mount so a remembered session is restored.

The list of module imports **is** the allow-list. There is no id filter left to
keep in sync, and adding a wallet means adding one import, in one place.

## Consequences

- The wallet code is off the first paint but still fetched shortly after mount,
  by `initWallet()`. A visitor who never touches a wallet saves the parse and
  execute, not the download; deferring the fetch further would also defer
  restoring a returning session's remembered address. Recorded, not hidden.
- `npm audit` will keep reporting 19 advisories until the kit changes upstream
  or the project takes a breaking downgrade (`npm audit fix --force` would
  install kit 1.5.0 and is not applied). The number now describes installed
  code the app does not ship or reach — a judgement written down, not a proof.
- The guard is a convention: one future import from the kit's root, or of a
  module left off the list, re-bundles the flagged tree, and the audit number
  starts describing shipped code again. A test cannot see this — it is a build
  artefact question. The cheap check is the `dist/` grep above, repeated
  whenever the wallet adapter changes.
- The picker is pinned to exactly these eight wallets. A wallet the kit gains
  will not appear until it is imported deliberately, which is the intended
  behaviour: the app is Stellar-only, and the pilot's organizer should not be
  offered hardware or multi-chain wallets that this project cannot test.

## Re-evaluate when

- A pilot asks for a wallet that is not on this list (a hardware wallet, or a
  Stellar wallet the kit adds after 2.7.0) — add it as one import, and re-run
  the `dist/` grep and the audit numbers with the change.
- The kit removes the multi-chain modules upstream, which would make the
  remaining advisories disappear without a downgrade.
- The advisories become a blocker for a real pilot, at which point the honest
  options are the breaking downgrade (reviewed, with the picker re-verified) or
  replacing the kit in `src/lib/wallet.ts` — the adapter is the seam either way.
