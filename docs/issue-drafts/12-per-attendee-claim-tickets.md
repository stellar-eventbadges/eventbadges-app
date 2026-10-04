# Build one claim code per attendee and hand out tickets

**Difficulty:** hard
**Labels:** help wanted, area:app

## Problem

The contract commits a **Merkle root over one leaf per attendee** and verifies a
proof on every claim
([ADR 0003](https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/decisions/0003-per-attendee-claim-codes.md)).
The app still does what the old single-code contract needed:

- the create screen generates **one** code and sends its SHA-256 as the root —
  which is a valid one-leaf tree, so only that one attendee can ever claim;
- the claim screen asks for a proof the organizer has no way to produce, so
  every claim against a multi-attendee event fails with `ClaimProofInvalid`
  (code 14) as things stand.

So today the app can run an event for exactly one attendee. That is not a
regression a pilot can live with, and it is the last thing standing between the
current code and a real meetup.

## Scope

1. **Create screen: one code per attendee.** Ask how many attendees there are,
   generate that many codes (`generateClaimCode` already does one), hash each
   with `hashClaimCode` to get its leaf, build the tree, and send the root.
2. **The tree builder** must match the contract byte for byte: sort each pair
   before hashing (`min || max`), and when a level has an odd number of nodes,
   hash the last node with itself. Output: the root, and for every leaf the
   list of sibling hashes from the leaf level up.
3. **Hand out a ticket per attendee.** A ticket is what an attendee needs to
   claim: their code and the proof for it. Package them as one paste-able
   string (the claim screen already parses hex hashes separated by spaces, so a
   `code:proof` line, or a small JSON blob, is enough for v0) and as a QR code
   — drafts [01](01-claim-code-as-qr.md) and
   [02](02-scan-claim-code-with-camera.md) are the natural follow-ups.
4. **Show the tickets once.** They are the only place the codes exist; nothing
   is persisted, and the screen must say so, as the current success screen does
   for the single code.
5. Keep the "shown once, kept nowhere" rule and the out-of-band delivery
   advice in `docs/claim-codes.md`.

Out of scope: address-bound leaves (a contracts and product decision, recorded
as rejected for now in ADR 0003), server-side code generation, and printing.

## Acceptance criteria

- [ ] The create screen sends a root that a **test** compares against a
      reference tree built in the test itself, including one-attendee,
      even-count and odd-count cases.
- [ ] A claim built from the app's own ticket succeeds against a locally
      deployed contract; a claim with a ticket from a different event fails
      with `ClaimProofInvalid`.
- [ ] The number of generated codes equals the number of attendees, and the
      screen states that each code is single-use.
- [ ] No code, leaf or proof is persisted, logged or sent anywhere except
      inside the claim transaction the attendee signs.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all
      pass.
- [ ] `README.md`'s proven-vs-assumed section records what was and was not
      exercised.

## Where to start

`src/pages/OrganizerPage.tsx` (the create flow and the success screen),
`src/lib/claimCode.ts` (where `hashClaimCode` already produces leaves), and
`eventbadges-contracts/docs/claim-codes.md`, which states the tree rule the
builder must copy exactly. The contract's own tests
(`src/test.rs`, `src/test_helpers.rs` in `eventbadges-contracts`) build trees
with the same rule and are the closest thing to a reference implementation
until the app has one.

## How to test

```bash
npm test -- claimCode OrganizerPage && npm run lint && npm run typecheck && npm run build
```

Then, with a locally deployed contract (`scripts/deploy-testnet.sh`, run by the
human) and a two-attendee event: claim with the first ticket, confirm the badge
appears; try the same ticket again from a second wallet and confirm
`ClaimCodeUsed`.
