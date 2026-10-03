# Badge artwork

**Difficulty:** medium
**Labels:** help wanted, area:app

## Problem

A badge is currently a table of on-chain facts (event id, holder, organizer,
issued-at). There is nothing visual to show an attendee as "their badge", which
makes the success moment flat and makes verification screenshots less
recognisable. The playbook lists badge artwork as a known gap, deliberately out
of v0.

## Scope

Design a small, local (no external requests) visual treatment for the badge
card: an SVG mark derived deterministically from the badge's own bytes (event
id, issued-at), so the same badge always renders the same artwork without any
image ever being uploaded or stored. Keep the on-chain facts visible underneath
— the record is the point; the artwork is the wrapper.

Out of scope: IPFS/NFT metadata, uploading images, or anything the contract
cannot read back.

## Acceptance criteria

- [ ] Every badge renders a deterministic visual derived from its on-chain bytes (same badge, same artwork).
- [ ] No new network requests: the artwork is generated or bundled locally.
- [ ] The on-chain facts (event id, holder, organizer, issued-at) stay readable on the card.
- [ ] The visual passes the existing axe check in `renderWithA11y` (contrast rules are disabled in tests, but the real design tokens must still meet them).
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/components/BadgeCard.tsx` and the design tokens in `src/index.css`.

## How to test

```bash
npm test
```

Add a render test asserting two badges with different bytes render different
artwork, and the same badge renders the same artwork twice.
