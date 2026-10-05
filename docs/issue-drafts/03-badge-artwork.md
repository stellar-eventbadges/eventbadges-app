# Badge artwork

**Status:** implemented 2026-10-05 — kept for the design, not as open work
**Difficulty:** medium
**Labels:** help wanted, area:app

> **What landed.** `src/lib/badgeArt.ts` derives a mark from the badge's own
> bytes — `eventId` and `issuedAt` as big-endian `u64`s, then the holder's
> address as UTF-8 — through FNV-1a into a mulberry32 PRNG, both integer-only
> so every engine draws the same picture. `src/components/BadgeArt.tsx` renders
> it as an inline SVG: six to ten spokes, two dashed rings, a tick ring and a
> core, all coloured from the existing accent tokens. No image file, no font, no
> text in the mark and no request behind it; the `dl` of on-chain facts stays
> underneath, and the mark itself is `aria-hidden` because the record is the
> content. Badge cards on the claim screen and the holder view both use it.
>
> **Why the holder is in the seed.** The draft named `eventId` and `issuedAt`;
> two attendees awarded a badge in the same second would then share a mark. The
> address is already on the card and already on-chain, so it is in the seed too,
> and the test above proves each field changes the drawing.
>
> **Not art.** The mark is generated geometry, not a designed badge: no
> illustration, no lettering, nothing that needs a designer. If the first pilot
> wants real artwork, that is still open, and it can replace this component
> without touching the record it sits on.
>
> **Verified how.** `npm test` (6 generator tests in `src/lib/badgeArt.test.ts`,
> 8 card tests including the axe check; the whole suite was 204 tests in 28
> files at that commit, 225 in 30 after the CSV export), plus lint, typecheck
> and build in the commit that landed it. The real component was rendered in
> the running app's own page context for six different badges, which produced
> six distinct SVGs with the expected structure.
>
> **The pixels were looked at on 2026-10-05.** The real `BadgeCard` (artwork,
> record and app stylesheet) was mounted for three badges in a Chromium page
> and inspected: three distinct marks, each a light face with two dashed rings,
> variable spokes, ticks and a small core in the accent colour, centred in the
> card with no clipping, and the record below them unchanged. It reads as a
> generated medallion, not an illustration — which is what this draft says it
> is. Nothing was compared against a designed reference, because there is
> none.


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

- [x] Every badge renders a deterministic visual derived from its on-chain bytes (same badge, same artwork). — `badgeMark` is a pure function of the seed; the card test renders the same badge twice and compares the markup, and a 50-badge sample produces 50 distinct marks.
- [x] No new network requests: the artwork is generated or bundled locally. — inline SVG built in the component; the card test asserts the markup contains no `http`, `href` or `<image`.
- [x] The on-chain facts (event id, holder, organizer, issued-at) stay readable on the card. — the `dl` is unchanged and still asserted by the existing tests; the mark is `aria-hidden` so the accessible text is still the record.
- [x] The visual passes the existing axe check in `renderWithA11y` (contrast rules are disabled in tests, but the real design tokens must still meet them). — colours come from the existing accent tokens (`--accent`, `--accent-strong`, `--accent-soft`, `--muted`, `--line-strong`); nothing new was introduced to check.
- [x] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/components/BadgeCard.tsx` and the design tokens in `src/index.css`.

## How to test

```bash
npm test
```

Add a render test asserting two badges with different bytes render different
artwork, and the same badge renders the same artwork twice.
