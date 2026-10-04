# Attendee privacy notice (draft text)

The words the claim screen shows **before the attendee's wallet signs**. This
answers item 7 of the legal-review checklist ("What attendees are told") in all
three ROADMAPs. It is draft copy for the maintainer to review, and it is **not
legal advice**: it describes what the software does, which is the part that can
be verified here. Whether it is an adequate notice is a question for a lawyer,
not for this repository.

**Implemented 2026-10-03** as a required acknowledgement on the claim screen —
see [draft 11](issue-drafts/11-attendee-privacy-notice.md) and
[`src/lib/privacyNotice.ts`](../src/lib/privacyNotice.ts), which is the shipped
copy. **The claim-code paragraph was rewritten 2026-10-04**, when
[ADR 0002](https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/decisions/0002-claim-code-not-in-transactions.md)
landed in the contracts repo and in this app: `claim` now takes the code's
SHA-256 rather than the code. The copy in this file is the shipped text.

## Where the notice goes

Two lengths, because one length does not work for both jobs:

- **Short** — always visible on the claim screen, above the claim button, with
  a required acknowledgement. This is the one an attendee reads while holding a
  phone in a queue.
- **Full** — one tap away from the short one, for anyone who wants to read it
  properly. The short version links to it; it must not replace it.

Both must be shown. A notice hidden behind a link is not notice.

## The short notice (on-screen copy)

> **Before you claim**
>
> Claiming writes one thing to a public blockchain: a record that **your wallet
> address** holds a badge for this event. Anyone, anywhere, can read it, with no
> wallet and without asking anyone.
>
> - Your address and **the time you claimed** are public, and can be linked
>   together across every event you ever claim from.
> - **Nothing can ever be deleted.** If the organizer takes your badge back, the
>   record of you claiming it stays.
> - **The claim code you type is never sent: your browser hashes it first.** But
>   that hash is public on the event itself, and it is all anyone needs to claim
>   a place while any remain.
> - This is **testnet software that has never been used with real people.**
>
> [Read the full notice](#the-full-notice)
>
> ☐ I understand my address will be recorded publicly and cannot be removed.

## The full notice

> ### What a badge actually is
>
> A badge is not an item in your wallet. It is a line of text on a public
> network saying that *this address* holds a badge for *this event*. That record
> is what makes the badge worth something — and it is what it costs you.
>
> ### What becomes public
>
> - **Your wallet address**, against this event.
> - **The moment you claimed it.** Your address and that timestamp can be
>   matched up, so anyone can build a list of every event you have ever claimed
>   from, using this one address.
> - **That you attended an event.** The event's name is stored as a hash rather
>   than readable text. There are not many plausible event names, so someone
>   determined can work it out. Treat the event as public, not as hidden.
>
> ### What can never be undone
>
> - **Nothing in a transaction's history can be deleted, ever.** Not by you, not
>   by the organizer, not by anyone.
> - **The organizer can remove your badge at any time**, including long after
>   the deadline, for badges issued in error. The removal does not erase the
>   fact that you claimed.
> - **An organizer can also issue a badge to your address without you ever
>   claiming.** If you did not claim it yourself, you did not necessarily
>   attend. Check before you rely on a badge you did not claim.
> - The contract's own badge entry is kept alive for a period after the event
>   and can eventually expire if nobody reads it for months. That is not
>   deletion: your address and your claim remain in the permanent transaction
>   history either way.
>
> ### Your claim code is hashed, not hidden
>
> The claim code you type is never sent: your browser hashes it first. But that
> hash is public on the event itself, and it is all anyone needs to claim a
> place while any remain.
>
> Hashing the code keeps the code itself out of the network, but it does not
> make the code a secret you can rely on. Anyone who reads the event can take
> one of the remaining places with it — claimed to their own address, not
> yours, so they cannot wear your badge, but they can use up a place. The badge
> cap and the closing date are the only limits.
>
> If your claim code is ever exposed, tell the organizer. The only remedy today
> is for them to create a new event with a new code, because a stored hash
> cannot be rotated.
>
> ### Addresses are pseudonymous, not anonymous
>
> Nothing here is tied to your name — but the moment anyone links your address
> to your identity (a payment, a social post, any earlier transaction you made),
> every badge you have claimed becomes attributable to you, forever.
>
> **If that matters to you, use a fresh, empty wallet for the event**, funded
> only with what you need for fees, and do not reuse it elsewhere.
>
> ### Why anyone can check you, too
>
> Anyone can confirm whether an address holds a badge for an event, with no
> wallet and no permission from the organizer. That is deliberate: a proof
> nobody else can check proves nothing. It also means your attendance is a
> public statement, not a private record.
>
> ### What this software has not done
>
> This is testnet-only software. No version of it has yet been used with real
> attendees by anyone, and no contract has been deployed. It has had no
> security review or audit. You may lose a badge; testnet tokens have no value.
>
> ### Agreeing
>
> Claiming means you accept that your address will be recorded on a public,
> effectively permanent network, linked to this event and its timestamp, and
> that you cannot have it removed. If you do not accept that, do not claim —
> ask the organizer whether they can record your attendance another way.
>
> This notice describes what the software does. It is not legal advice, and it
> does not replace the organizer's own privacy notice, which may say more about
> how they handle your information off the network.

## Why each line is there

Every statement above traces to code that exists today. Nothing is aspirational.

| Statement in the notice | What makes it true |
|---|---|
| "records that your wallet address holds a badge" | `issue_badge` stores `Badge { event_id, attendee, organizer, issued_at }` under `DataKey::Badge(event_id, attendee)` — `src/badges.rs` in `eventbadges-contracts` |
| "anyone can read it, with no wallet" | `get_event`, `has_badge`, `badges_of` have no `require_auth` — `src/lib.rs` |
| "the moment you claimed" | `issued_at: now` from `env.ledger().timestamp()`, in the stored badge and in the transaction's own timestamp |
| "linked across every event you claim from" | the badge is keyed by address; the same address is reused across events |
| "the event's name is a hash, and can be worked out" | `name_hash: BytesN<32>` on `Event`; the claim-code and name hashes are low-entropy for human-chosen values — see [privacy.md](https://github.com/stellar-eventbadges/eventbadges-docs/blob/main/src/privacy.md) |
| "nothing can ever be deleted" | `revoke` removes the badge key and publishes `BadgeRevoked`, so the removal is itself permanent; see `docs/events.md` in the contracts repo |
| "the organizer can remove your badge at any time" | `revoke` is deliberately not window-bound — see its doc comment in `src/badges.rs` |
| "an organizer can issue a badge without you claiming" | `award(event_id, attendee)` requires only the organizer's signature, not the attendee's |
| "your browser hashes it first" / "the code is never sent" | `submitClaim` awaits `hashClaimCode` before building the transaction (`src/pages/AttendeePage.tsx`); `prepareClaim` sends `bytes32ToScVal(claimCodeHash)` (`src/lib/contract.ts`); `claim` takes `claim_code_hash: BytesN<32>` (`src/lib.rs`) — no call path carries the raw code |
| "that hash is public on the event itself" | `Event.claim_code_hash` is returned by `get_event`, which calls `load_event` with no `require_auth` (`src/badges.rs`) |
| "it is all anyone needs to claim a place" | `claim` compares the presented digest to the stored one directly; the only auth it demands is the claimant's own, so a third party can claim to their own address |
| "claimed to their own address, not yours" | the badge is minted under `DataKey::Badge(event_id, attendee)` for the address that signed |
| "they cannot wear your badge" / "you cannot claim twice" | the `AlreadyHeld` check precedes issuance in `claim` and `award` |
| "the badge cap and the closing date are the only limits" | `check_event_open`/`count_after_issue` enforce `max_claims`; the timestamp check enforces `closes_at` |
| "a stored hash cannot be rotated" | v0 exposes seven entrypoints and none rotates `claim_code_hash` — `src/lib.rs` |
| "the badge entry can eventually expire" | TTL is `closes_at` plus a 30-day margin with a 7-day floor, topped up only on access — `src/storage.rs` |
| "testnet, never used with real people" | the app's README, "What is proven vs assumed": every contract call and wallet interaction is assumed, never exercised |

### The line that changed

The notice originally said **"the claim code you type is published in the
transaction itself and stays public forever."** That was true of the contract as
written: `claim` took the code as a `Bytes` argument and hashed it on-chain, so
the raw secret rode in a public transaction. The docs book said the opposite —
that "the chain never holds the claim code" — and was right about storage and
wrong about the transaction argument.

ADR 0002 removed the exposure instead of describing it: `claim` now takes the
code's SHA-256, which the attendee's browser computes, and compares it to the
stored hash. The sentence had to change with it, and the honest replacement is
not simply softer. **The digest is public too** — `get_event` returns it to
anyone — so the code was never a secret the network was protecting. What
changed is that the attendee's raw code no longer enters a transaction; what did
not change is that a leaked or observed digest can still take a place until the
cap fills or the window closes.

The Merkle-codes item on the roadmap fixes that remaining defect, and it is a
different defect: one shared code per event means any holder can claim.

## Still open (the maintainer's decision, not this file's)

1. **Who delivers the notice — the app, the organizer, or both.** The draft
   above is the app's half. An organizer handing out a claim code in person is
   also telling the person something, and the app cannot cover someone who
   never opens it. Recommended: both, with the organizer pointing at the same
   text rather than writing their own.
2. **Whether a missing notice blocks the first pilot.** Recommended: yes, for
   the claim flow. A claim is an irreversible public write of a linkable
   identifier, and a person who cannot understand that before signing has not
   really been told.
3. **Whether a ticked box is the right mechanism.** An acknowledgement that is
   recorded nowhere proves nothing and creates a record-keeping problem of its
   own if the project claims it was consent. A checkbox that is not evidence
   should not be presented as evidence.

**Answered 2026-10-04:** the earlier open question "whether to block the pilot
on the contract instead of disclosing the claim-code exposure" was decided — the
contract changed (ADR 0002), so the raw code is no longer disclosed because it
is no longer transmitted. The other three are not answered here, and none
should be answered by picking wording.
