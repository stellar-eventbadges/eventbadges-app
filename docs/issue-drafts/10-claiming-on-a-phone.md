# Claiming on a phone: the mobile wallet story is untested

**Difficulty:** medium
**Labels:** help wanted, area:app

## Problem

Attendees will mostly be on phones, and many will be on **mobile Safari**, where
browser-extension wallets like Freighter do not exist. The wallet kit offers
several mobile-capable wallets (Albedo, LOSTR/xBull via links, WalletConnect
routes), but which of the eight wallets the picker shows actually work on iOS
Safari — and which silently fail at `getNetwork` or signing — has never been
checked. The claim flow has never been run on a phone at all.

Until that is known, an organizer running a real event cannot be told what to
tell attendees with iPhones.

## Scope

1. Test the connect → claim → badge flow on mobile Safari (and one Android
   browser) for each wallet in the picker, and record the results honestly.
2. Based on results, either remove wallets that do not work on mobile from the
   picker (saying so), or add a short "on a phone?" hint to the connect screen
   that names a wallet known to work.
3. Make sure the failure mode of a wallet that cannot report its network is the
   reviewed wording, not a dead end (the hook already sets `onTestnet: false`
   when `checkWalletNetwork` throws — verify it end to end).

Out of scope: building a custodial fallback, or any wallet the kit does not
ship.

## Acceptance criteria

- [ ] The connect → claim → badge flow is exercised on a real phone for at least one wallet, and the result is recorded in the README's proven-vs-assumed section (no pilot claim is made beyond what was actually done).
- [ ] Wallets that do not work on mobile are either removed from the picker with a stated reason, or documented with their limitations.
- [ ] The connect screen states, in plain words, what a phone user should pick.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/lib/wallet.ts` (the module filter), `src/hooks/useWallet.ts` (the
network-check failure path), and a real iPhone. The public **verify** screen
already works with no wallet at all on any phone — that is the fallback to
point people at when a claim cannot be made.

## How to test

```bash
npm run build && npm run preview
```

Open the preview URL from a phone on the same network and walk the flow; record
what worked, per wallet, in this draft before it is closed.
