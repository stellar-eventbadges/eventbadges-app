import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CONTRACT_ERRORS,
  describeContractError,
  GENERIC_ERROR_MESSAGE,
  parseContractErrorCode,
  parseErrorTable,
  WRONG_NETWORK_MESSAGE,
} from './contractErrors';

const VENDORED_TABLE = path.resolve(process.cwd(), 'docs/contract-errors.md');
const CONTRACT_REPO_TABLE = path.resolve(process.cwd(), '../eventbadges-contracts/ERRORS.md');

const rows = parseErrorTable(readFileSync(VENDORED_TABLE, 'utf8'));

describe('the vendored ERRORS.md table', () => {
  it('parses all 8 documented variants', () => {
    expect(rows).toHaveLength(8);
  });

  it('has a mapped, identically worded message for every variant', () => {
    for (const row of rows) {
      const mapped = CONTRACT_ERRORS[row.code];
      if (mapped === undefined) {
        throw new Error(`no message is mapped for ${row.variant} (code ${row.code})`);
      }
      expect(mapped.variant, `variant for code ${row.code}`).toBe(row.variant);
      expect(mapped.message, `message for ${row.variant}`).toBe(row.message);
      expect(mapped.nextAction, `next action for ${row.variant}`).toBe(row.nextAction);
    }
  });

  it('has no messages for codes that ERRORS.md does not document', () => {
    const documented = new Set(rows.map((row) => row.code));
    for (const code of Object.keys(CONTRACT_ERRORS)) {
      expect(documented.has(Number(code)), `code ${code} is mapped but not documented`).toBe(true);
    }
  });

  it.skipIf(!existsSync(CONTRACT_REPO_TABLE))(
    'still matches the contract repo table when it is checked out alongside this repo',
    () => {
      const liveRows = parseErrorTable(readFileSync(CONTRACT_REPO_TABLE, 'utf8'));
      expect(liveRows).toEqual(rows);
    },
  );
});

describe('parseContractErrorCode', () => {
  it('reads the code out of a Soroban host error string', () => {
    expect(parseContractErrorCode('HostError: Error(Contract, #11)')).toBe(11);
    expect(parseContractErrorCode('HostError: Error(Contract, #130)')).toBe(130);
    expect(parseContractErrorCode('Contract, #13')).toBe(13);
  });

  it('returns null when there is no contract error code', () => {
    expect(parseContractErrorCode('connection refused')).toBeNull();
    expect(parseContractErrorCode('')).toBeNull();
  });
});

describe('describeContractError', () => {
  it('uses the ERRORS.md wording for a known code', () => {
    const mapped = describeContractError(new Error('HostError: Error(Contract, #1)'));
    expect(mapped.code).toBe(1);
    expect(mapped.message).toBe(
      "We couldn't find that event. Check the event id with the organizer.",
    );
    expect(mapped.nextAction).toBe('Confirm the event id with the organizer.');
  });

  it('maps every documented code to its documented wording', () => {
    for (const row of rows) {
      const mapped = describeContractError(`HostError: Error(Contract, #${row.code})`);
      expect(mapped.message).toBe(row.message);
    }
  });

  it('does not invent wording for an undocumented code', () => {
    const mapped = describeContractError('HostError: Error(Contract, #99)');
    expect(mapped.code).toBe(99);
    expect(mapped.message).toContain('99');
    expect(mapped.nextAction).toBeUndefined();
  });

  it('passes on the real message for a failure that is not a contract error', () => {
    // A rejected wallet prompt or an RPC outage has no code, and its own text is
    // more useful than a generic apology.
    expect(describeContractError(new Error('User declined')).message).toBe('User declined');
    expect(describeContractError('plain string failure').message).toBe('plain string failure');
    expect(describeContractError(new Error(WRONG_NETWORK_MESSAGE)).message).toBe(
      WRONG_NETWORK_MESSAGE,
    );
  });

  it('falls back to a generic message when there is nothing to pass on', () => {
    expect(describeContractError(undefined).message).toBe(GENERIC_ERROR_MESSAGE);
    expect(describeContractError('').message).toBe(GENERIC_ERROR_MESSAGE);
  });
});
