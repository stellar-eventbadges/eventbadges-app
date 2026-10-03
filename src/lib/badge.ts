/**
 * Shapes and helpers for the contract's `Event` and `Badge` records and the
 * derived event window (`src/types.rs` in `eventbadges-contracts`).
 *
 * Times are `bigint` because the contract stores `u64` Unix seconds and the
 * SDK converts those to `bigint`.
 */

/** The same cap the contract enforces (`MAX_CLAIMS_PER_EVENT` in `src/badges.rs`). */
export const MAX_CLAIMS_PER_EVENT = 10_000;

export interface EventRecord {
  readonly id: bigint;
  readonly organizer: string;
  readonly nameHash: Uint8Array;
  readonly claimCodeHash: Uint8Array;
  readonly maxClaims: number;
  readonly closesAt: bigint;
  readonly claimCount: number;
}

export interface BadgeRecord {
  readonly eventId: bigint;
  readonly attendee: string;
  readonly organizer: string;
  readonly issuedAt: bigint;
}

/** The claim window is open while the deadline has not passed. */
export function windowOpen(event: EventRecord, nowSeconds: number): boolean {
  return BigInt(Math.floor(nowSeconds)) <= event.closesAt;
}

/** The event is full when the issued count reached the cap. */
export function capReached(event: EventRecord): boolean {
  return event.claimCount >= event.maxClaims;
}

/** Slots left before the cap, floored at zero. */
export function slotsLeft(event: EventRecord): number {
  const left = event.maxClaims - event.claimCount;
  return left > 0 ? left : 0;
}

/**
 * Whether the contract will accept `claim`/`award` for this event right now.
 * Mirrors the checks in `src/badges.rs` (`check_event_open` and the deadline
 * comparison), so the app can warn before a call the contract would reject.
 */
export function canIssue(event: EventRecord, nowSeconds: number): boolean {
  return windowOpen(event, nowSeconds) && !capReached(event);
}

/**
 * Whether the contract will accept `revoke` for this event right now. Revocation
 * is deliberately not window-bound (`src/badges.rs::revoke`).
 */
export function canRevoke(event: EventRecord): boolean {
  return event.claimCount > 0;
}

/** The state of an event's claim window, for the badge and the sentence. */
export type EventWindow = 'Open' | 'Full' | 'Closed';

export function windowState(event: EventRecord, nowSeconds: number): EventWindow {
  if (!windowOpen(event, nowSeconds)) return 'Closed';
  if (capReached(event)) return 'Full';
  return 'Open';
}

export function windowSentence(state: EventWindow): string {
  switch (state) {
    case 'Open':
      return 'The claim window is open and slots remain.';
    case 'Full':
      return 'Every slot the organizer set has been issued.';
    case 'Closed':
      return 'The claim deadline has passed. Badges can no longer be issued.';
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
