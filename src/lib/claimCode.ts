/**
 * Claim codes: generated locally, shared out-of-band, and hashed on the
 * device that uses them.
 *
 * The contract stores only SHA-256 of the code (`claim_code_hash`), and since
 * `eventbadges-contracts/docs/decisions/0002-claim-code-not-in-transactions.md`
 * `claim` takes that same digest rather than the code: the raw secret stays on
 * the organizer's machine and on the attendee's device, and only the digest is
 * published. The digest is already readable from `get_event`, so it is not a
 * secret either — it acts as a bearer credential for a place while the event's
 * window is open. The process is documented in the contracts repo's
 * `docs/claim-codes.md`: generate randomly (here: the Web Crypto API), hash
 * locally (here: Web Crypto SHA-256 — the same algorithm the contract checks
 * with), hand the code to attendees in person or by a channel you trust, keep
 * nothing.
 */

/** The claim code's entropy: 32 bytes = 256 bits, hex-encoded for sharing. */
export const CLAIM_CODE_BYTES = 32;
export const CLAIM_CODE_HEX_LENGTH = CLAIM_CODE_BYTES * 2;

export type GenerateResult =
  | { readonly ok: true; readonly code: string }
  | { readonly ok: false; readonly message: string };

/** Generates a random 256-bit claim code as 64 hex characters. */
export function generateClaimCode(randomBytes: (length: number) => Uint8Array): GenerateResult {
  let bytes: Uint8Array;
  try {
    bytes = randomBytes(CLAIM_CODE_BYTES);
  } catch {
    return { ok: false, message: 'This browser could not generate a secure random code.' };
  }
  if (bytes.length !== CLAIM_CODE_BYTES) {
    return { ok: false, message: 'This browser could not generate a secure random code.' };
  }
  return { ok: true, code: bytesToHex(bytes) };
}

/** The Web Crypto-backed random source used by the app. */
export function browserRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export type HashResult =
  | { readonly ok: true; readonly hashHex: string }
  | { readonly ok: false; readonly message: string };

/** SHA-256 of a hex-encoded code, hex-encoded. Local computation only. */
export async function hashClaimCode(code: string): Promise<HashResult> {
  const parsed = validateClaimCode(code);
  if (!parsed.ok) return parsed;
  try {
    const raw = hexToBytes(parsed.code);
    const digest = await crypto.subtle.digest('SHA-256', raw);
    return { ok: true, hashHex: bytesToHex(new Uint8Array(digest)) };
  } catch {
    return { ok: false, message: 'This browser could not hash the code locally.' };
  }
}

export type CodeCheck =
  | { readonly ok: true; readonly code: string }
  | { readonly ok: false; readonly message: string };

/** An attendee-entered code must be exactly 64 hex characters. */
export function validateClaimCode(input: string): CodeCheck {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === '') {
    return { ok: false, message: 'Enter the claim code from the organizer.' };
  }
  if (trimmed.length !== CLAIM_CODE_HEX_LENGTH || !/^[0-9a-f]+$/.test(trimmed)) {
    return {
      ok: false,
      message: `A claim code is exactly ${CLAIM_CODE_HEX_LENGTH} hexadecimal characters.`,
    };
  }
  return { ok: true, code: trimmed };
}

/**
 * The deepest proof any tree the contract can hold will need:
 * `MAX_PROOF_DEPTH` in `src/badges.rs`, which is `ceil(log2(MAX_CLAIMS_PER_EVENT))`.
 */
export const MAX_PROOF_DEPTH = 14;

export type ProofCheck =
  | { readonly ok: true; readonly value: Uint8Array<ArrayBuffer>[] }
  | { readonly ok: false; readonly message: string };

/**
 * Parses the organizer's Merkle proof — the sibling hashes between this
 * attendee's leaf and the event's root, leaf level first — out of a pasted
 * string of 64-character hex hashes separated by spaces, commas or newlines.
 * An empty string is a valid proof, and the only one a one-attendee event
 * needs, because there the root *is* the leaf.
 */
export function parseClaimProof(input: string): ProofCheck {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: true, value: [] };

  const parts = trimmed.split(/[\s,]+/).filter((part) => part !== '');
  if (parts.length > MAX_PROOF_DEPTH) {
    return { ok: false, message: `A claim proof has at most ${MAX_PROOF_DEPTH} hashes.` };
  }

  const value: Uint8Array<ArrayBuffer>[] = [];
  for (const part of parts) {
    // The leaf and each sibling are the same shape as a code: 64 hex chars.
    const check = validateClaimCode(part);
    if (!check.ok) {
      return {
        ok: false,
        message: 'Each part of the proof is one 64-character hexadecimal hash.',
      };
    }
    value.push(hexToBytes(check.code));
  }

  return { ok: true, value };
}

/** Formats a stored 32-byte hash as shortened hex: `0x1234abcd…`. */
export function formatHashHex(bytes: Uint8Array, edge = 8): string {
  const hex = bytesToHex(bytes);
  if (hex.length <= edge * 2) return `0x${hex}`;
  return `0x${hex.slice(0, edge)}…${hex.slice(-edge)}`;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/.test(hex)) {
    throw new Error('not a hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
