import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';

import { validateAccountAddress, validateEventId, validateMaxClaims } from './validation';

const ACCOUNT = Keypair.random().publicKey();
const CONTRACT = StrKey.encodeContract(new Uint8Array(32).fill(9));

describe('validateAccountAddress', () => {
  it('accepts a public key', () => {
    expect(validateAccountAddress(ACCOUNT)).toEqual({ ok: true, value: ACCOUNT });
  });

  it('rejects a contract address and says what is expected', () => {
    const result = validateAccountAddress(CONTRACT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('start with G');
  });

  it('rejects empty input', () => {
    expect(validateAccountAddress('  ').ok).toBe(false);
  });

  it('rejects a secret key shaped value', () => {
    // Starts with S, never a valid account address. The app never asks for one.
    expect(validateAccountAddress(`S${'A'.repeat(55)}`).ok).toBe(false);
  });
});

describe('validateEventId', () => {
  it('accepts ids from 1 upwards', () => {
    expect(validateEventId('1')).toEqual({ ok: true, value: 1n });
    expect(validateEventId(' 42 ')).toEqual({ ok: true, value: 42n });
    expect(validateEventId('123456789012345678901')).toEqual({
      ok: true,
      value: 123456789012345678901n,
    });
  });

  it('rejects 0 because event ids start at 1', () => {
    const result = validateEventId('0');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('start at 1');
  });

  it('rejects non-numeric input', () => {
    expect(validateEventId('event-1').ok).toBe(false);
    expect(validateEventId('1.5').ok).toBe(false);
    expect(validateEventId('-3').ok).toBe(false);
    expect(validateEventId('').ok).toBe(false);
  });
});

describe('validateMaxClaims', () => {
  it('accepts a cap inside the contract bounds', () => {
    expect(validateMaxClaims('1')).toEqual({ ok: true, value: 1 });
    expect(validateMaxClaims(' 100 ')).toEqual({ ok: true, value: 100 });
    expect(validateMaxClaims('10000')).toEqual({ ok: true, value: 10_000 });
  });

  it('rejects 0 and above the 10,000 cap with the ERRORS.md wording', () => {
    // Same wording as the MaxClaimsTooLarge row, so the form and the contract
    // never disagree about what went wrong.
    for (const input of ['0', '10001', '99999999999999999999']) {
      const result = validateMaxClaims(input);
      expect(result.ok, `expected "${input}" to be rejected`).toBe(false);
      if (result.ok) return;
      expect(result.message).toBe('The badge cap must be between 1 and 10,000.');
    }
  });

  it('rejects empty and non-numeric input before any range check', () => {
    expect(validateMaxClaims('').ok).toBe(false);
    expect(validateMaxClaims('ten').ok).toBe(false);
    expect(validateMaxClaims('1.5').ok).toBe(false);
  });
});
