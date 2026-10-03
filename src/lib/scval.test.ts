import { Keypair, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';

import type { BadgeRecord, EventRecord } from './badge';
import {
  addressToScVal,
  bytes32ToScVal,
  scValToBadges,
  scValToEvent,
  scValToEventId,
  u32ToScVal,
  u64ToScVal,
} from './scval';

const ORGANIZER = Keypair.random().publicKey();
const ATTENDEE = Keypair.random().publicKey();

/**
 * Builds the `ScVal` the contract's `Event` struct produces, using the same
 * type hints and the same snake_case field names the on-chain struct uses
 * (`src/types.rs` in eventbadges-contracts).
 */
function eventScVal(overrides: Partial<EventRecord> = {}): ReturnType<typeof nativeToScVal> {
  const event: EventRecord = {
    id: 1n,
    organizer: ORGANIZER,
    nameHash: new Uint8Array(32).fill(0x11),
    claimCodeHash: new Uint8Array(32).fill(0x22),
    maxClaims: 100,
    closesAt: 1_790_000_000n,
    claimCount: 7,
    ...overrides,
  };

  return nativeToScVal(
    {
      id: event.id,
      organizer: event.organizer,
      name_hash: event.nameHash,
      claim_code_hash: event.claimCodeHash,
      max_claims: event.maxClaims,
      closes_at: event.closesAt,
      claim_count: event.claimCount,
    },
    {
      type: {
        id: [null, 'u64'],
        organizer: [null, 'address'],
        name_hash: [null, 'bytes'],
        claim_code_hash: [null, 'bytes'],
        max_claims: [null, 'u32'],
        closes_at: [null, 'u64'],
        claim_count: [null, 'u32'],
      },
    },
  );
}

/** Builds the `ScVal` the contract's `Badge` struct produces. */
function badgeScVal(overrides: Partial<BadgeRecord> = {}): ReturnType<typeof nativeToScVal> {
  const badge: BadgeRecord = {
    eventId: 1n,
    attendee: ATTENDEE,
    organizer: ORGANIZER,
    issuedAt: 1_790_000_000n,
    ...overrides,
  };

  return nativeToScVal(
    {
      event_id: badge.eventId,
      attendee: badge.attendee,
      organizer: badge.organizer,
      issued_at: badge.issuedAt,
    },
    {
      type: {
        event_id: [null, 'u64'],
        attendee: [null, 'address'],
        organizer: [null, 'address'],
        issued_at: [null, 'u64'],
      },
    },
  );
}

describe('argument conversion', () => {
  it('converts an address and converts back to the same strkey', () => {
    expect(scValToNative(addressToScVal(ORGANIZER))).toBe(ORGANIZER);
  });

  it('converts a u32 and a u64', () => {
    expect(scValToNative(u32ToScVal(100))).toBe(100);
    expect(scValToNative(u64ToScVal(42n))).toBe(42n);
  });

  it('converts a 32-byte hash and refuses anything else', () => {
    const bytes = new Uint8Array(32).fill(9);
    expect(scValToNative(bytes32ToScVal(bytes))).toEqual(bytes);
    expect(() => bytes32ToScVal(new Uint8Array(31))).toThrow(/32 bytes/);
    expect(() => bytes32ToScVal(new Uint8Array(33))).toThrow(/32 bytes/);
  });
});

describe('response conversion', () => {
  it('reads the event id create_event returns', () => {
    expect(scValToEventId(u64ToScVal(7n))).toBe(7n);
  });

  it('reads an event id returned as a plain number', () => {
    expect(scValToEventId(nativeToScVal(7, { type: 'u64' }))).toBe(7n);
  });

  it('parses an Event record back into the app shape', () => {
    const parsed = scValToEvent(eventScVal());
    expect(parsed.id).toBe(1n);
    expect(parsed.organizer).toBe(ORGANIZER);
    expect(parsed.nameHash).toEqual(new Uint8Array(32).fill(0x11));
    expect(parsed.claimCodeHash).toEqual(new Uint8Array(32).fill(0x22));
    expect(parsed.maxClaims).toBe(100);
    expect(parsed.closesAt).toBe(1_790_000_000n);
    expect(parsed.claimCount).toBe(7);
  });

  it('rejects a response that is not an event record', () => {
    expect(() => scValToEvent(u64ToScVal(1n))).toThrow(/unexpected/);
  });

  it('parses a badge list back into the app shape', () => {
    const list = nativeToScVal([badgeScVal(), badgeScVal({ issuedAt: 1_790_000_100n })], {
      type: [null],
    });
    const parsed = scValToBadges(list);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].eventId).toBe(1n);
    expect(parsed[0].attendee).toBe(ATTENDEE);
    expect(parsed[0].organizer).toBe(ORGANIZER);
    expect(parsed[1].issuedAt).toBe(1_790_000_100n);
  });

  it('parses an empty badge list', () => {
    const list = nativeToScVal([], { type: [null] });
    expect(scValToBadges(list)).toEqual([]);
  });

  it('rejects a badge list that is not a list', () => {
    expect(() => scValToBadges(u64ToScVal(1n))).toThrow(/unexpected badge list/);
  });
});
