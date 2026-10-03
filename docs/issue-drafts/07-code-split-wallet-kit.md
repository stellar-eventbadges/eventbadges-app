# Code-split the wallet kit out of the initial bundle

**Difficulty:** medium
**Labels:** help wanted, area:app

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

- [ ] The initial JS bundle for the first paint is materially smaller, and the kit lands in its own chunk.
- [ ] Connecting, signing and the network check still work with the kit loaded dynamically.
- [ ] No `any` sneaks in to type the dynamic import (see the TypeScript rules in `AGENTS.md`).
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/lib/wallet.ts`, `src/hooks/useWallet.ts`. Vite reports chunk sizes on
every build, so the before/after numbers are easy to compare.

## How to test

```bash
npm run build
```

Compare the reported chunk sizes before and after, and exercise the connect
flow in a browser.
