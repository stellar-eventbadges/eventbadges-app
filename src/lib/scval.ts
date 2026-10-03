import { Address, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk';

import type { BadgeRecord, EventRecord } from './badge';
import { CLAIM_CODE_BYTES, formatHashHex } from './claimCode';

/**
 * Converts between JavaScript values and the `xdr.ScVal` values the contract's
 * ABI uses. The conversions match `src/lib.rs` in `eventbadges-contracts`:
 * `Address`, `BytesN<32>`, `u32` and `u64`.
 */

export function addressToScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

export function u32ToScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: 'u32' });
}

export function u64ToScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: 'u64' });
}

/** `BytesN<32>` — the opaque `name_hash`, `claim_code_hash`, or claim code. */
export function bytes32ToScVal(bytes: Uint8Array): xdr.ScVal {
  if (bytes.length !== CLAIM_CODE_BYTES) {
    throw new Error(`a contract hash is exactly ${CLAIM_CODE_BYTES} bytes, got ${bytes.length}`);
  }
  return nativeToScVal(bytes, { type: 'bytes' });
}

function asObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    throw new Error('the contract returned an unexpected value');
  }
  return value as Record<string, unknown>;
}

function asBigInt(value: unknown, field: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
  throw new Error(`the contract returned an unexpected "${field}"`);
}

function asString(value: unknown, field: string): string {
  if (typeof value === 'string') return value;
  throw new Error(`the contract returned an unexpected "${field}"`);
}

function asNumber(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  throw new Error(`the contract returned an unexpected "${field}"`);
}

function asBytes(value: unknown, field: string): Uint8Array {
  if (value instanceof Uint8Array) return value;
  throw new Error(`the contract returned an unexpected "${field}"`);
}

/** `create_event` returns the new `u64` event id. */
export function scValToEventId(retval: xdr.ScVal): bigint {
  return asBigInt(scValToNative(retval), 'event_id');
}

/** `get_event` returns an `Event` struct. */
export function scValToEvent(retval: xdr.ScVal): EventRecord {
  const raw = asObject(scValToNative(retval));
  return {
    id: asBigInt(raw.id, 'id'),
    organizer: asString(raw.organizer, 'organizer'),
    nameHash: asBytes(raw.name_hash, 'name_hash'),
    claimCodeHash: asBytes(raw.claim_code_hash, 'claim_code_hash'),
    maxClaims: asNumber(raw.max_claims, 'max_claims'),
    closesAt: asBigInt(raw.closes_at, 'closes_at'),
    claimCount: asNumber(raw.claim_count, 'claim_count'),
  };
}

/** `badges_of` returns a `Vec<Badge>` (bounded: at most one entry in v0). */
export function scValToBadges(retval: xdr.ScVal): BadgeRecord[] {
  const raw = scValToNative(retval);
  if (!Array.isArray(raw)) {
    throw new Error('the contract returned an unexpected badge list');
  }
  return raw.map((entry: unknown) => {
    const badge = asObject(entry);
    return {
      eventId: asBigInt(badge.event_id, 'event_id'),
      attendee: asString(badge.attendee, 'attendee'),
      organizer: asString(badge.organizer, 'organizer'),
      issuedAt: asBigInt(badge.issued_at, 'issued_at'),
    };
  });
}

/** Display helper for a stored hash (never the raw claim code). */
export function formatHash(bytes: Uint8Array): string {
  return formatHashHex(bytes);
}
