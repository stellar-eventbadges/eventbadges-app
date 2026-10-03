import { describe, expect, it } from 'vitest';

import {
  defaultClosesAt,
  formatDateTime,
  isPast,
  toLocalInputValue,
  unixSecondsFromLocalInput,
} from './datetime';

describe('unixSecondsFromLocalInput', () => {
  it('converts a datetime-local value into whole Unix seconds', () => {
    const seconds = unixSecondsFromLocalInput('2026-10-01T09:30');
    expect(seconds).not.toBeNull();
    expect(Number.isInteger(seconds)).toBe(true);

    // Read back in the same (local) zone: the same wall-clock time.
    const roundTrip = new Date((seconds ?? 0) * 1000);
    expect(roundTrip.getFullYear()).toBe(2026);
    expect(roundTrip.getMonth()).toBe(9);
    expect(roundTrip.getDate()).toBe(1);
    expect(roundTrip.getHours()).toBe(9);
    expect(roundTrip.getMinutes()).toBe(30);
  });

  it('returns null for empty or unparseable input', () => {
    expect(unixSecondsFromLocalInput('')).toBeNull();
    expect(unixSecondsFromLocalInput('   ')).toBeNull();
    expect(unixSecondsFromLocalInput('not a date')).toBeNull();
  });
});

describe('isPast', () => {
  it('is false up to and including the deadline second, true after it', () => {
    expect(isPast(1000n, 999)).toBe(false);
    expect(isPast(1000n, 1000)).toBe(false);
    expect(isPast(1000n, 1001)).toBe(true);
  });
});

describe('formatDateTime', () => {
  it('renders a readable date in the requested zone', () => {
    const text = formatDateTime(1_790_000_000n, { locale: 'en-GB', timeZone: 'UTC' });
    expect(text).toContain('2026');
    expect(text.length).toBeGreaterThan(5);
  });

  it('returns "unknown" for a value that cannot be a timestamp', () => {
    expect(formatDateTime(10n ** 400n)).toBe('unknown');
  });
});

describe('local datetime input helpers', () => {
  it('formats a value the input element accepts', () => {
    expect(toLocalInputValue(new Date(2026, 9, 1, 9, 5))).toBe('2026-10-01T09:05');
  });

  it('suggests a default deadline a week out, with seconds cleared', () => {
    const value = defaultClosesAt(new Date(2026, 0, 1, 12, 34, 56));
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(value).toBe('2026-01-08T12:34');
  });
});
