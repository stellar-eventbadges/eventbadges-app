import { describe, expect, it } from 'vitest';

import {
  canIssue,
  canRevoke,
  capReached,
  MAX_CLAIMS_PER_EVENT,
  slotsLeft,
  windowOpen,
  type EventRecord,
} from './badge';

const ORGANIZER = 'G'.repeat(56); // shape only; badge.ts never validates strkeys

function event(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 1n,
    organizer: ORGANIZER,
    nameHash: new Uint8Array(32),
    claimCodeHash: new Uint8Array(32),
    maxClaims: 100,
    closesAt: 1_800_000_000n,
    claimCount: 0,
    ...overrides,
  };
}

describe('windowOpen', () => {
  it('stays open up to and including the deadline second', () => {
    const record = event({ closesAt: 1_000n });
    expect(windowOpen(record, 999)).toBe(true);
    expect(windowOpen(record, 1_000)).toBe(true);
    expect(windowOpen(record, 1_001)).toBe(false);
  });
});

describe('capReached', () => {
  it('is true only once the issued count reaches the cap', () => {
    expect(capReached(event({ claimCount: 99, maxClaims: 100 }))).toBe(false);
    expect(capReached(event({ claimCount: 100, maxClaims: 100 }))).toBe(true);
    expect(capReached(event({ claimCount: 101, maxClaims: 100 }))).toBe(true);
  });
});

describe('slotsLeft', () => {
  it('counts down and never goes negative', () => {
    expect(slotsLeft(event({ claimCount: 0, maxClaims: 100 }))).toBe(100);
    expect(slotsLeft(event({ claimCount: 40, maxClaims: 100 }))).toBe(60);
    expect(slotsLeft(event({ claimCount: 120, maxClaims: 100 }))).toBe(0);
  });
});

describe('canIssue', () => {
  it('requires an open window and a free slot, which is what claim checks', () => {
    expect(canIssue(event(), 1_799_999_999)).toBe(true);
    expect(canIssue(event({ closesAt: 1_000n }), 1_001)).toBe(false);
    expect(canIssue(event({ claimCount: 100 }), 1_799_999_999)).toBe(false);
    expect(canIssue(event({ closesAt: 1_000n, claimCount: 100 }), 2_000)).toBe(false);
  });
});

describe('canRevoke', () => {
  it('needs at least one issued badge but ignores the window, matching revoke', () => {
    expect(canRevoke(event({ claimCount: 0 }))).toBe(false);
    expect(canRevoke(event({ claimCount: 3 }))).toBe(true);
    expect(canRevoke(event({ claimCount: 3, closesAt: 1n }))).toBe(true);
  });
});

describe('MAX_CLAIMS_PER_EVENT', () => {
  it('matches the contract constant', () => {
    expect(MAX_CLAIMS_PER_EVENT).toBe(10_000);
  });
});
