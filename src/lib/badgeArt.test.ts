import { describe, expect, it } from 'vitest';

import { badgeSeed, badgeMark } from './badgeArt';
import type { BadgeRecord } from './badge';

/** A badge that is never a real account: the generator only reads the fields. */
function badge(overrides: Partial<BadgeRecord> = {}): BadgeRecord {
  return {
    eventId: 1n,
    attendee: `G${'A'.repeat(55)}`,
    organizer: `G${'B'.repeat(55)}`,
    issuedAt: 1_790_000_000n,
    ...overrides,
  };
}

describe('badgeSeed', () => {
  it('writes eventId and issuedAt as big-endian u64s, then the address', () => {
    const seed = badgeSeed(badge({ eventId: 1n, issuedAt: 2n, attendee: 'GABC' }));

    expect([...seed]).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 0x47, 0x41, 0x42, 0x43]);
  });

  it('keeps the holder in the seed, so two holders differ', () => {
    const one = badgeSeed(badge({ attendee: `G${'A'.repeat(55)}` }));
    const two = badgeSeed(badge({ attendee: `G${'C'.repeat(55)}` }));

    expect([...one]).not.toEqual([...two]);
    expect(one.length).toBe(two.length);
  });
});

describe('badgeMark', () => {
  it('is deterministic: the same badge gives the same mark', () => {
    expect(badgeMark(badge())).toEqual(badgeMark(badge()));
  });

  it('changes with each field of the badge', () => {
    const base = JSON.stringify(badgeMark(badge()));

    expect(JSON.stringify(badgeMark(badge({ eventId: 2n })))).not.toBe(base);
    expect(JSON.stringify(badgeMark(badge({ issuedAt: 1_790_000_001n })))).not.toBe(base);
    expect(JSON.stringify(badgeMark(badge({ attendee: `G${'Z'.repeat(55)}` })))).not.toBe(base);
  });

  it('stays inside the drawing: spokes and rings are bounded', () => {
    const mark = badgeMark(badge());

    expect(mark.spokes.length).toBeGreaterThanOrEqual(6);
    expect(mark.spokes.length).toBeLessThanOrEqual(10);
    expect(mark.rings).toHaveLength(2);
    for (const spoke of mark.spokes) {
      expect(spoke.inner).toBeGreaterThan(0);
      expect(spoke.outer).toBeLessThanOrEqual(50);
      expect(spoke.outer).toBeGreaterThan(spoke.inner);
    }
    for (const ring of mark.rings) {
      expect(ring.radius).toBeLessThan(48);
      expect(ring.dash).toBeGreaterThan(0);
    }
    expect(mark.ticks === 0 || mark.ticks >= 8).toBe(true);
  });

  it('gives different badges different marks across a sample', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 50; index += 1) {
      seen.add(JSON.stringify(badgeMark(badge({ eventId: BigInt(index) }))));
    }

    // Not a proof of uniqueness for all inputs — a check that the seed actually
    // reaches the geometry. A stuck generator would collapse this to one value.
    expect(seen.size).toBe(50);
  });
});
