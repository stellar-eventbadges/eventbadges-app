# eventbadges Contract — Error Codes

> Vendored copy of `ERRORS.md` from `eventbadges-contracts`, taken 2026-10-03.
> The original in the contracts repo is the single source of truth. If it
> changes, re-copy that file here **in the same commit** that updates
> `src/lib/contractErrors.ts` — `src/lib/contractErrors.test.ts` fails if this
> copy and the app's error map drift apart, and cross-checks the live contracts
> repo when it is checked out alongside this one.

Every failure mode has a defined code. No silent fallback.

## Categories

| Range | Category |
|---|---|
| 1–9 | Lookup |
| 10–29 | Lifecycle & timing |
| 30–49 | Validation |

## Lookup (1–9)

| Code | Variant | Raised by | Trigger | User-facing message | Next action |
|---:|---|---|---|---|---|
| 1 | `EventNotFound` | `claim`, `award`, `revoke`, `get_event`, `has_badge`, `badges_of` | No event record exists for that id. | "We couldn't find that event. Check the event id with the organizer." | Confirm the event id with the organizer. |
| 2 | `BadgeNotFound` | `revoke` | The organizer tried to revoke a badge the attendee does not hold. | "That address has no badge for this event." | Check the attendee address and the event. |

## Lifecycle & timing (10–29)

| Code | Variant | Raised by | Trigger | User-facing message | Next action |
|---:|---|---|---|---|---|
| 10 | `EventClosed` | `claim`, `award` | The event's claim deadline (`closes_at`) has passed. | "The claim window for this event has closed." | Ask the organizer whether another proof of attendance exists. |
| 12 | `CapReached` | `claim`, `award` | The event already issued `max_claims` badges. | "This event has no badges left to issue." | Ask the organizer whether another event run is planned. |
| 13 | `AlreadyHeld` | `claim`, `award` | The attendee already holds a badge for this event. | "This address already holds a badge for this event." | Open the existing badge; nothing else to do. |
| 14 | `ClaimProofInvalid` | `claim` | The presented leaf — the SHA-256 of a claim code — does not fold into the event's claim root with the proof supplied. | "That claim code is not valid for this event." | Check the code with the organizer and try again; each attendee has their own code. |
| 15 | `ClaimCodeUsed` | `claim` | The presented leaf has already been claimed, so its one place is taken. | "That claim code has already been used." | Ask the organizer to revoke the badge that used it and award one instead. |

## Validation (30–49)

| Code | Variant | Raised by | Trigger | User-facing message | Next action |
|---:|---|---|---|---|---|
| 30 | `MaxClaimsTooLarge` | `create_event` | `max_claims` was 0 or above the contract cap (10,000). | "The badge cap must be between 1 and 10,000." | Choose a cap inside the range and recreate the event. |
| 31 | `ClosesAtInPast` | `create_event` | The claim deadline chosen is not in the future. | "The claim deadline must be in the future." | Choose a new deadline and recreate the event. |
