# 0002 — Claim codes are generated and hashed in the browser

- **Status:** accepted — implemented 2026-10-04; the claim half extended by
  contracts ADR 0003 the same day
- **Date:** 2026-10-03
- **Deciders:** maintainer (solo builder)

> **Update, 2026-10-05.** The create screen now generates one code per
> attendee and builds the Merkle tree over their leaves in the browser
> (`src/lib/merkle.ts`); only the root enters `create_event`. The rest of this
> decision — generate with the Web Crypto API, hash locally before any
> transaction, show once, store nothing — stands unchanged.

## Context

`create_event` commits the attendees' claim codes as a Merkle root — only
hashes go on-chain. The codes themselves are shared out-of-band and presented
by attendees at claim time. The process is specified in
`eventbadges-contracts/docs/claim-codes.md`, which shows an organizer
generating codes with `openssl rand -hex 32`, hashing them and building the
tree in a terminal.

Making the organizer leave the app to run terminal commands would put the
privacy-critical step of the whole flow outside the tool they are using, and a
hex value pasted between terminal and browser is one more place to lose or
leak it.

## What was checked

- The Web Crypto API: `crypto.getRandomValues` (available in every browser the
  wallet kit supports, including without a secure context in practice for
  modern engines) and `crypto.subtle.digest('SHA-256', ...)` (requires a secure
  context; `localhost` and any HTTPS origin qualify).
- The contract's check: `claim` verifies a 32-byte leaf and its proof against
  the event's `claim_root` (since
  [ADR 0003 in the contracts repo](https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/decisions/0003-per-attendee-claim-codes.md),
  2026-10-04; before that, a single digest compared against a stored
  `claim_code_hash`, per
  [ADR 0002](https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/decisions/0002-claim-code-not-in-transactions.md)).
  Any correct SHA-256 implementation agrees, and `src/lib/claimCode.test.ts`
  cross-checks the browser path against Node's own SHA-256 so the two can never
  silently differ.
- The equivalent CLI process in `eventbadges-contracts/docs/claim-codes.md` —
  the app's path is the same algorithm and the same byte length (32 bytes =
  256 bits), just run in the browser.

## Decision

The organizer screen generates the claim code itself:

1. 32 random bytes from `crypto.getRandomValues` (`src/lib/claimCode.ts`);
2. hex-encoded to 64 characters and shown **once**, on the create success
   screen, with the on-chain hash beside it;
3. hashed locally with `crypto.subtle.digest('SHA-256', ...)` before the
   `create_event` transaction is built — only the hash leaves the page.

The same helper hashes before the **claim** transaction too, since the
contracts repo's ADRs 0002 and 0003: the attendee's browser turns the pasted
code into a leaf and sends it with its proof, against the event's Merkle root,
and the raw code never enters the transaction either.

The app never stores, logs or transmits the code. There is deliberately no
"copy the code again later" affordance: the chain holds only the hash, so a
lost code is unrecoverable, and the screen says so and points at `award` as the
fallback for attendees who arrive without it.

The 64-hex name hash field shares `validateClaimCode`'s 32-byte hex check —
the two values have the same shape, and one well-tested validator beats two
near-identical ones.

## Consequences

- The claim code exists in exactly one place: the organizer's browser, once.
  Sharing it is the organizer's job, out-of-band, and the UI says so in plain
  words.
- If the organizer reloads before copying the code, it is gone; they can create
  a new event (the cap and deadline are per event) or award badges directly.
  This is accepted for v0 and stated on the success screen.
- `crypto.subtle` needs a secure context. Served over plain HTTP on a non-
  localhost origin, hashing fails; the failure is caught and shown as the
  reviewed message "This browser could not hash the code locally." rather than
  a stack trace.
- The CLI process in the contracts repo remains valid and equivalent for a
  one-attendee event — hash the code, send an empty proof; larger trees are
  covered by `docs/claim-codes.md` in that repo. The docs book describes both
  as two ways to do the same thing.

## Re-evaluate when

- A pilot shows organizers losing codes often enough that a deliberate
  "I have stored my code" confirmation step (or a re-generate flow) is worth
  the extra state, or
- the contract gains a rotate-claim-code entrypoint.
