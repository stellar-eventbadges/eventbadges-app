import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  bytesToHex,
  browserRandomBytes,
  CLAIM_CODE_BYTES,
  CLAIM_CODE_HEX_LENGTH,
  formatHashHex,
  formatTicket,
  generateClaimCode,
  hashClaimCode,
  hexToBytes,
  MAX_PROOF_DEPTH,
  parseClaimProof,
  parseClaimTicket,
  validateClaimCode,
} from './claimCode';

describe('generateClaimCode', () => {
  it('turns 32 random bytes into 64 hex characters', () => {
    const bytes = new Uint8Array(32).fill(0xab);
    const result = generateClaimCode(() => bytes);
    expect(result).toEqual({ ok: true, code: 'ab'.repeat(32) });
  });

  it('refuses a source that yields the wrong number of bytes', () => {
    const result = generateClaimCode(() => new Uint8Array(16));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('random');
  });

  it('refuses a source that throws, instead of crashing the page', () => {
    const result = generateClaimCode(() => {
      throw new Error('no crypto here');
    });
    expect(result.ok).toBe(false);
  });

  it('uses the browser crypto source, which yields the requested length', () => {
    expect(browserRandomBytes(CLAIM_CODE_BYTES)).toHaveLength(CLAIM_CODE_BYTES);
    expect(browserRandomBytes(8)).toHaveLength(8);
  });
});

describe('hashClaimCode', () => {
  it('hashes locally with SHA-256, the same algorithm the contract checks', async () => {
    const code = 'ab'.repeat(32);
    const result = await hashClaimCode(code);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Cross-check against node's own SHA-256: the two implementations must
    // agree or the contract would store a hash the code can never match.
    const expected = createHash('sha256')
      .update(Buffer.from(code, 'hex'))
      .digest('hex');
    expect(result.hashHex).toBe(expected);
  });

  it('refuses input that is not a 64-character hex code', async () => {
    expect((await hashClaimCode('not-a-code')).ok).toBe(false);
    expect((await hashClaimCode('ab')).ok).toBe(false);
  });
});

describe('validateClaimCode', () => {
  it('accepts exactly 64 hexadecimal characters and normalises case', () => {
    const upper = 'AB'.repeat(32);
    const result = validateClaimCode(`  ${upper}  `);
    expect(result).toEqual({ ok: true, code: 'ab'.repeat(32) });
  });

  it('rejects empty input with the ask-the-organizer message', () => {
    const result = validateClaimCode('   ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('claim code');
  });

  it('rejects the wrong length or non-hex characters', () => {
    expect(validateClaimCode('ab').ok).toBe(false);
    expect(validateClaimCode('a'.repeat(63)).ok).toBe(false);
    expect(validateClaimCode('a'.repeat(65)).ok).toBe(false);
    expect(validateClaimCode(`${'g'.repeat(63)}a`).ok).toBe(false);
  });

  it('documents the required length in the message', () => {
    const result = validateClaimCode('ab');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain(String(CLAIM_CODE_HEX_LENGTH));
  });
});

describe('parseClaimProof', () => {
  it('treats an empty string as the one-attendee proof', () => {
    expect(parseClaimProof('')).toEqual({ ok: true, value: [] });
    expect(parseClaimProof('   ')).toEqual({ ok: true, value: [] });
  });

  it('reads hex hashes separated by spaces, commas or newlines', () => {
    const first = 'ab'.repeat(32);
    const second = 'cd'.repeat(32);
    const result = parseClaimProof(` ${first}, ${second}\n`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    expect(bytesToHex(result.value[0])).toBe(first);
    expect(bytesToHex(result.value[1])).toBe(second);
  });

  it('refuses a part that is not 64 hex characters', () => {
    expect(parseClaimProof(`${'ab'.repeat(32)} nope`).ok).toBe(false);
    expect(parseClaimProof('ab').ok).toBe(false);
  });

  it('refuses a proof deeper than any tree the contract can hold', () => {
    const deep = Array.from({ length: MAX_PROOF_DEPTH + 1 }, () => 'ab'.repeat(32)).join(' ');
    const result = parseClaimProof(deep);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain(String(MAX_PROOF_DEPTH));
  });
});

describe('parseClaimTicket', () => {
  it('reads a bare code as a ticket with no proof, normalising case', () => {
    const result = parseClaimTicket(`  ${'AB'.repeat(32)} `);
    expect(result).toEqual({ ok: true, code: 'ab'.repeat(32), proofText: '' });
  });

  it('splits code:proof and keeps the proof text for parseClaimProof', () => {
    const result = parseClaimTicket(`${'ab'.repeat(32)}:${'cd'.repeat(32)}, ${'ef'.repeat(32)}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.code).toBe('ab'.repeat(32));
    expect(parseClaimProof(result.proofText)).toEqual({
      ok: true,
      value: [hexToBytes('cd'.repeat(32)), hexToBytes('ef'.repeat(32))],
    });
  });

  it('accepts the code and proof separated by whitespace alone', () => {
    const result = parseClaimTicket(`${'ab'.repeat(32)} ${'cd'.repeat(32)}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.code).toBe('ab'.repeat(32));
    expect(result.proofText).toBe('cd'.repeat(32));
  });

  it('refuses an empty ticket with the ask-the-organizer message', () => {
    const result = parseClaimTicket('   ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('claim code');
  });

  it('refuses a code that is not 64 hex characters, ticket or not', () => {
    expect(parseClaimTicket('nope').ok).toBe(false);
    expect(parseClaimTicket(`nope:${'cd'.repeat(32)}`).ok).toBe(false);
    expect(parseClaimTicket(`:${'cd'.repeat(32)}`).ok).toBe(false);
  });
});

describe('formatTicket', () => {
  it('is the code alone when there is no proof, and code:proof otherwise', () => {
    expect(formatTicket('ab'.repeat(32), [])).toBe('ab'.repeat(32));
    expect(formatTicket('ab'.repeat(32), ['cd'.repeat(32), 'ef'.repeat(32)])).toBe(
      `${'ab'.repeat(32)}:${'cd'.repeat(32)} ${'ef'.repeat(32)}`,
    );
  });

  it('round-trips through parseClaimTicket, codes and proof together', () => {
    const code = 'ab'.repeat(32);
    const proof = ['cd'.repeat(32), 'ef'.repeat(32)];
    const parsed = parseClaimTicket(formatTicket(code, proof));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.code).toBe(code);
    expect(parsed.proofText).toBe(proof.join(' '));
  });
});

describe('formatHashHex', () => {
  it('shortens a 32-byte hash to 8 characters at each end', () => {
    const hash = formatHashHex(new Uint8Array(32).fill(0xab));
    expect(hash).toBe(`0x${'ab'.repeat(4)}…${'ab'.repeat(4)}`);
  });

  it('keeps a short byte string whole', () => {
    expect(formatHashHex(new Uint8Array([0xde, 0xad]))).toBe('0xdead');
  });
});

describe('hex <-> bytes helpers', () => {
  it('round-trips bytes through hex', () => {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = (i * 7 + 3) % 256;
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it('refuses input that is not hex or not an even length', () => {
    expect(() => hexToBytes('abc')).toThrow(/hex/);
    expect(() => hexToBytes('zz')).toThrow(/hex/);
  });
});
