# Share-to-social card for a verified badge

**Difficulty:** medium
**Labels:** help wanted, area:app

## Problem

After claiming or verifying, there is no way to share the result. A community
organizer wants attendees to be able to post "I was there" without the app
turning into a social network. The playbook lists a share-to-social card as a
known gap, opt-in and out of v0.

## Scope

An explicit "share" action on a badge the user is looking at, using
`navigator.share` where available (with a plain "copy link" fallback). The
shared text is generated locally and contains nothing but what the chain
already makes public: the event id, the holder address (or a shortened form),
and the contract id. Nothing is sent to any service by this app.

Out of scope: og:image generation that requires a server, any analytics on
shares, or deep-link routing before draft for URLs exists.

## Acceptance criteria

- [ ] Sharing is opt-in and explicit; nothing is shared automatically.
- [ ] The shared content contains only public on-chain facts, and the code that builds it is unit-tested.
- [ ] On browsers without `navigator.share`, the fallback copies the same text and says so.
- [ ] No new network requests are introduced.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Where to start

`src/components/BadgeCard.tsx`, `src/pages/VerifyPage.tsx`. Check what the
privacy page in `eventbadges-docs` promises about what the app shares.

## How to test

```bash
npm test
```

Add unit tests for the share-text builder, and exercise the share sheet on a
phone or a desktop browser that supports it.
