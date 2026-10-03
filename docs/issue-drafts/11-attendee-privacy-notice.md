# Show the attendee privacy notice before a wallet signs

**Difficulty:** medium
**Labels:** help wanted, area:app

## Problem

The claim screen takes a public, irreversible, linkable fact — that a wallet
address attended an event — and asks the attendee to sign it, with nothing on
screen about what that means.

Two things are missing, and one of them is a surprise.

1. No notice at all. Nothing tells the attendee that their address and the
   timestamp become public and unremovable, that attendance can be linked
   across every event they ever claim from, or that anyone can check them with
   no wallet at all.
2. **The claim code is published in the transaction.** `claim` takes the raw
   code as an argument (`src/lib.rs` in `eventbadges-contracts`), the app sends
   the raw 32 bytes (`prepareClaim` in `src/lib/contract.ts`), and the contract
   hashes what it receives. Anyone watching the network can read the code from
   the moment the attendee signs, and it stays readable forever. The docs book
   currently claims the opposite. It is the most important thing an attendee
   could be told, and it is told nowhere.

Draft copy for both is written and every line is traced to code in
[`docs/attendee-notice.md`](../attendee-notice.md). It is not implemented.

## Scope

1. Add the **short** notice to the claim screen, above the claim button, with a
   required acknowledgement checkbox that gates the submit button.
2. Add the **full** notice as its own view, one tap from the short one. The
   short version must link to it, not replace it.
3. Put the claim-code paragraph in both. It is the part that cannot be softened
   and must not be shortened away.
4. Surface the fresh-wallet advice from the book's privacy page — the only
   mitigation the attendee actually has, and currently implemented nowhere.
5. Keep it readable on a phone, in the app's existing voice: plain words, short
   sentences, no jargon, no legalese.

Out of scope: writing an organizer-side notice, recording or storing the
acknowledgement, and any change to the contract. The contract-side fix for the
claim-code exposure is a separate, larger decision recorded in
`ROADMAP.md`.

## Acceptance criteria

- [ ] The claim button is disabled until the acknowledgement is ticked, and the
      notice is visible without scrolling or opening anything.
- [ ] The full notice is reachable in one interaction and states, in these
      words or the maintainer's approved revision: the address is public and
      linkable; nothing is deletable; the organizer can revoke at any time; the
      claim code is in the transaction and permanent.
- [ ] The notice is a labelled region (`role="note"` or a `<fieldset>` with a
      `<legend>`), the checkbox has a real `<label>`, and the page still passes
      the axe check in `src/test/render.tsx`.
- [ ] A render test asserts the notice is present and the claim button is
      disabled before acknowledgement — including the exact claim-code
      sentence, so it cannot be quietly deleted later.
- [ ] Wording is held in one module (following the `contractErrors.ts`
      precedent) so it can be tested and so the full and short versions cannot
      drift apart.
- [ ] `README.md`'s proven-vs-assumed section records that the notice has never
      been shown to a real person.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all
      pass.

## Where to start

`src/pages/AttendeePage.tsx` (where the button and the acknowledgement go),
`src/components/Field.tsx` (the existing labelled-input pattern to match for
the checkbox), and `src/lib/contractErrors.ts` (the precedent for user-facing
wording living in one tested module rather than inside a component). Read
[`docs/attendee-notice.md`](../attendee-notice.md) first — it is the copy, and
its traceability table is the reason every line is worded the way it is.

## How to test

```bash
npm test -- AttendeePage && npm run lint && npm run typecheck && npm run build
```

Then open the built preview and walk it on a real phone: the claim screen with
the notice, the full notice, the gated button, and the checkbox with a screen
reader. Record what you actually saw in this draft before it is closed.