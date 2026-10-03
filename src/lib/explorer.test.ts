import { describe, expect, it } from 'vitest';

import { explorerContractUrl, explorerTxUrl, shorten } from './explorer';

const BASE = 'https://stellar.expert/explorer/testnet';

describe('explorerTxUrl', () => {
  it('appends the transaction path', () => {
    expect(explorerTxUrl(BASE, 'abc123')).toBe(`${BASE}/tx/abc123`);
  });

  it('tolerates a trailing slash on the base url', () => {
    expect(explorerTxUrl(`${BASE}/`, 'abc123')).toBe(`${BASE}/tx/abc123`);
    expect(explorerTxUrl(`${BASE}///`, 'abc123')).toBe(`${BASE}/tx/abc123`);
  });
});

describe('explorerContractUrl', () => {
  it('appends the contract path', () => {
    expect(explorerContractUrl(BASE, 'CABC')).toBe(`${BASE}/contract/CABC`);
  });
});

describe('shorten', () => {
  it('keeps short values whole', () => {
    expect(shorten('abcd')).toBe('abcd');
    expect(shorten('abcdefghijklm', 6)).toBe('abcdefghijklm');
  });

  it('keeps both ends of a long value', () => {
    expect(shorten('abcdefghijklmnopqrstuvwxyz', 4)).toBe('abcd…wxyz');
  });
});
