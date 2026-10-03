/**
 * Converts a `<input type="datetime-local">` value (for example
 * `2026-10-10T18:30`) into Unix seconds, which is the clock the contract uses
 * (`env.ledger().timestamp()`). Returns `null` when the value is not a date.
 *
 * The input is interpreted in the user's local time zone, because that is what
 * an organizer means when they type a claim deadline.
 */
export function unixSecondsFromLocalInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const millis = Date.parse(trimmed);
  if (Number.isNaN(millis)) return null;

  return Math.floor(millis / 1000);
}

/** Whether a deadline (Unix seconds) has already passed. */
export function isPast(seconds: bigint, nowSeconds: number): boolean {
  return BigInt(Math.floor(nowSeconds)) > seconds;
}

/**
 * Formats a Unix-seconds timestamp for display. The time zone is an explicit
 * option so tests can be deterministic.
 */
export function formatDateTime(
  seconds: bigint,
  options: { locale?: string; timeZone?: string } = {},
): string {
  const millis = Number(seconds) * 1000;
  if (!Number.isFinite(millis)) return 'unknown';

  return new Date(millis).toLocaleString(options.locale ?? 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(options.timeZone === undefined ? {} : { timeZone: options.timeZone }),
  });
}

/** The value a `<input type="datetime-local">` needs for a given instant. */
export function toLocalInputValue(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** A sensible default deadline: a week from now, rounded to the minute. */
export function defaultClosesAt(now: Date = new Date()): string {
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  week.setSeconds(0, 0);
  return toLocalInputValue(week);
}
