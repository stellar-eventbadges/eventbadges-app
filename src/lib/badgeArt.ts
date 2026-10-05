import type { BadgeRecord } from './badge';

/**
 * The badge's visual mark, derived only from the badge's own on-chain bytes.
 *
 * The same badge always renders the same artwork, on any machine, with no
 * network request, no upload and nothing stored: the drawing is a pure function
 * of `eventId`, `issuedAt` and the holder's address. There is deliberately no
 * image file, no font and no text in the mark — the on-chain facts are the
 * content of the card, and they stay readable underneath it.
 *
 * Hashing here is FNV-1a and mulberry32, not SHA-256: this is a seed for
 * geometry, nothing about it is a security claim, and using the Web Crypto API
 * would force the render to be async. Both are integer-only, so every engine
 * produces the same numbers.
 */

/** FNV-1a over the seed bytes. Integer-only, so results are engine-stable. */
function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a small deterministic PRNG. Same seed, same sequence. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The bytes the artwork is derived from: `eventId` and `issuedAt` as big-endian
 * `u64`s, then the holder's address as UTF-8.
 *
 * The address is included so two attendees issued a badge in the same second
 * still get different marks. It is already on the card and already on-chain.
 */
export function badgeSeed(badge: BadgeRecord): Uint8Array {
  const address = new TextEncoder().encode(badge.attendee);
  const bytes = new Uint8Array(16 + address.length);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, badge.eventId);
  view.setBigUint64(8, badge.issuedAt);
  bytes.set(address, 16);
  return bytes;
}

export interface BadgeSpoke {
  readonly angle: number;
  readonly inner: number;
  readonly outer: number;
  readonly width: number;
}

export interface BadgeRing {
  readonly radius: number;
  readonly dash: number;
  readonly offset: number;
}

export interface BadgeMark {
  readonly spokes: readonly BadgeSpoke[];
  readonly rings: readonly BadgeRing[];
  /** How many ticks sit on the inner circle; 0 hides them. */
  readonly ticks: number;
  readonly tickOffset: number;
}

/** Rounds to two decimals, so the rendered markup is stable and readable. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The mark for one badge. Six to ten spokes, two dashed rings, and a ring of
 * evenly spaced ticks whose phase is part of the seed.
 */
export function badgeMark(badge: BadgeRecord): BadgeMark {
  const next = mulberry32(fnv1a(badgeSeed(badge)));

  const spokeCount = 6 + Math.floor(next() * 5);
  const spokes: BadgeSpoke[] = [];
  for (let index = 0; index < spokeCount; index += 1) {
    const base = (360 / spokeCount) * index;
    const jitter = (next() - 0.5) * (180 / spokeCount);
    spokes.push({
      angle: round2(base + jitter),
      inner: round2(20 + next() * 8),
      outer: round2(44 - next() * 8),
      width: round2(1.5 + next() * 2.5),
    });
  }

  const rings: BadgeRing[] = [
    {
      radius: round2(36 + next() * 3),
      dash: round2(3 + next() * 6),
      offset: round2(next() * 40),
    },
    {
      radius: round2(42 + next() * 3),
      dash: round2(2 + next() * 5),
      offset: round2(next() * 40),
    },
  ];

  const ticks = Math.floor(next() * 4) === 0 ? 0 : 8 + Math.floor(next() * 9);

  return {
    spokes,
    rings,
    ticks,
    tickOffset: round2(next() * 360),
  };
}
