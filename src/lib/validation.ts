import { StrKey } from '@stellar/stellar-sdk';

import { MAX_CLAIMS_PER_EVENT } from './badge';

export type AddressCheck =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

/** A wallet/account address (a public key starting with `G`). */
export function validateAccountAddress(input: string): AddressCheck {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, message: 'Enter a Stellar account address.' };
  }
  if (!StrKey.isValidEd25519PublicKey(trimmed)) {
    return {
      ok: false,
      message: 'That is not a Stellar account address. Account addresses start with G.',
    };
  }
  return { ok: true, value: trimmed };
}

export type EventIdCheck =
  | { readonly ok: true; readonly value: bigint }
  | { readonly ok: false; readonly message: string };

/** Event ids start at 1 on-chain (`src/badges.rs::create_event` defaults to 1). */
export function validateEventId(input: string): EventIdCheck {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, message: 'Enter an event id.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: 'An event id is a whole number.' };
  }
  const value = BigInt(trimmed);
  if (value < 1n) {
    return { ok: false, message: 'Event ids start at 1.' };
  }
  return { ok: true, value };
}

export type ClaimsCheck =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly message: string };

/**
 * The badge cap, validated against the same bounds the contract enforces
 * (`MAX_CLAIMS_PER_EVENT` in `src/badges.rs`), so the obvious mistakes fail
 * here before a transaction is ever built.
 */
export function validateMaxClaims(input: string): ClaimsCheck {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, message: 'Enter a badge cap.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: 'A badge cap is a whole number.' };
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_CLAIMS_PER_EVENT) {
    // Same wording as the MaxClaimsTooLarge row in ERRORS.md.
    return { ok: false, message: 'The badge cap must be between 1 and 10,000.' };
  }
  return { ok: true, value };
}
