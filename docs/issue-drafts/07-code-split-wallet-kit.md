# Code-split the wallet kit out of the initial bundle

**Status:** implemented 2026-10-05 — kept for the design, not as open work
**Difficulty:** medium
**Labels:** help wanted, area:app

> **What landed.** `src/lib/wallet.ts` loads the kit with a dynamic `import()`
> behind a memoised promise (reset on failure, so a dropped chunk is retried),
> and builds its module list from eight per-module entry points
> (`.../modules/{albedo,freighter,fordefi,rabet,xbull,lobstr,hana,scopuly}`)
> instead of filtering the kit's `defaultModules()`. `prefetchWallet()` warms
> the chunks from the connect button's hover and focus handlers, and
> `initWallet()` still runs once on mount so a remembered session is restored.
>
> **Numbers** (production build, 2026-10-05):
>
> | | before | after |
> |---|---|---|
> | initial `index` chunk | 1,058.76 kB | **809.82 kB** |
> | initial chunk, gzip | 267.30 kB | **191.97 kB** |
>
> The kit and the eight modules now arrive as async chunks: `esm` 73.96 kB,
> `xbull.module` 67.03, `utils` 24.78, `albedo.module` 20.16, `freighter.module`
> 15.38, `lobstr.module` 4.81, `scopuly.module` 4.36, `fordefi.module` 2.44,
> `rabet.module` 1.84, `hana.module` 1.71, plus a 0.51 kB shared chunk. The
> `>500 kB` Vite warning still fires for the 809 kB index chunk — this draft
> moved the wallet code off the first paint, it did not finish the split.
>
> **Known trade-off, recorded rather than smoothed over.** The kit's chunks are
> still fetched shortly after mount (`initWallet()` in the mount effect), so a
> visitor who never touches a wallet saves the parse and execute on first paint
> but not the download. Deferring the fetch until hover/click would also defer
> restoring a returning session's remembered address; that trade-off was not
> taken silently. See also: the chunk is *smaller* because the multi-chain
> modules are no longer in it (draft 06, decision C).
>
> **Verified how.** `npm run lint` (0 warnings / 0 errors), `npm run typecheck`,
> `npm test` (185 tests / 26 files at the change; 194 / 27 after a follow-up
> hook test added for the connect error path), `npm run build`; and in a
> browser against the dev server: clicking Connect opens the picker with exactly
> the eight offered wallets, every icon loads from the local `/wallet-icons/`,
> closing the picker returns the button to `Connect wallet` and reports the
> kit's own reason (`The user closed the modal.`, 2026-10-05), and the kit's MetaMask
> `Failed to restore … TransportTimeoutError` warning is gone because that
> module is no longer in the bundle. **Not verified:** no real wallet has ever
> been installed, connected or signed through this app, so the lazy path is
> proven only as far as opening the picker.

## Problem

The production build emits a single ~1 MB JavaScript chunk (about 264 kB
gzipped), because `@creit.tech/stellar-wallets-kit` and its wallet dependencies
(Ledger, Trezor, WalletConnect, Reown and others) are imported eagerly by
`src/lib/wallet.ts`, which `src/hooks/useWallet.ts` imports on first render. On
a slow mobile connection that is a long wait before the page shows anything,
including on screens that never touch a wallet. Vite warns about the chunk size
on every build.

## Scope

Load the wallet kit only when it is first needed (a dynamic `import()` inside
the adapter, or a lazy chunk behind the connect action), keeping the exported
functions in `src/lib/wallet.ts` the same shape. This is also the change that
most shrinks the attack/bundle surface flagged in draft 06.

Out of scope: removing wallets from the kit, or changing any signing behaviour.

## Acceptance criteria

- [x] The initial JS bundle for the first paint is materially smaller, and the kit lands in its own chunk. — 809.82 kB / 191.97 kB gzip, from 1,058.76 kB / 267.30 kB gzip.
- [x] Connecting, signing and the network check still work with the kit loaded dynamically. — every `src/lib/wallet.ts` export goes through `readyKit()`, which awaits the memoised init; the existing tests cover the adapter's contract, and the picker was opened in a browser. Signing itself has still never run against a real wallet.
- [x] No `any` sneaks in to type the dynamic import (see the TypeScript rules in `AGENTS.md`). — `type KitModule = typeof import('@creit.tech/stellar-wallets-kit')` and the kit's own `ModuleInterface` from `@creit.tech/stellar-wallets-kit/types`.
- [x] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/lib/wallet.ts`, `src/hooks/useWallet.ts`. Vite reports chunk sizes on
every build, so the before/after numbers are easy to compare.

## How to test

```bash
npm run build
```

Compare the reported chunk sizes before and after, and exercise the connect
flow in a browser.
