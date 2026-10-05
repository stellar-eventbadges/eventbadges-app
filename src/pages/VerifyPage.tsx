import { useState } from 'react';

import { BadgeCard } from '../components/BadgeCard';
import { CsvExport } from '../components/CsvExport';
import { ErrorNotice } from '../components/ErrorNotice';
import { Field } from '../components/Field';
import { useAction } from '../hooks/useAction';
import type { BadgeRecord } from '../lib/badge';
import { validateAccountAddress, validateEventId } from '../lib/validation';
import type { PageProps } from './shared';

/**
 * The public verify screen: does this address hold a badge for this event?
 * Reads need no wallet — anyone can check a claim against the contract.
 */
export function VerifyPage({ client }: PageProps) {
  const [eventId, setEventId] = useState('');
  const [attendee, setAttendee] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<{ held: boolean; badges: BadgeRecord[] } | null>(null);

  const checkAction = useAction<{ held: boolean; badges: BadgeRecord[] }>();

  async function submitCheck() {
    const idCheck = validateEventId(eventId);
    const addressCheck = validateAccountAddress(attendee);

    setFieldErrors({
      verifyEvent: idCheck.ok ? null : idCheck.message,
      verifyAttendee: addressCheck.ok ? null : addressCheck.message,
    });
    if (!idCheck.ok || !addressCheck.ok) {
      setResult(null);
      return;
    }

    // The read source is the checked address itself: a read-only simulation
    // needs a source account but signs nothing, and this app never holds keys.
    const checked = await checkAction.run(async () => {
      const held = await client.hasBadge(addressCheck.value, idCheck.value, addressCheck.value);
      const badges = held
        ? await client.badgesOf(addressCheck.value, idCheck.value, addressCheck.value)
        : [];
      return { held, badges };
    });
    if (checked !== undefined) setResult(checked);
  }

  return (
    <section>
      <h1>Verify a badge</h1>
      <p>
        Check that an address holds a badge for an event. This reads the contract directly — no
        wallet needed, and nothing you enter here is sent anywhere except to the Stellar RPC
        endpoint this app is configured with.
      </p>

      <fieldset disabled={checkAction.busy}>
        <legend>Check attendance</legend>

        <Field
          id="verifyEvent"
          label="Event id"
          value={eventId}
          onChange={setEventId}
          inputMode="numeric"
          placeholder="1"
          required
          error={fieldErrors.verifyEvent}
        />

        <Field
          id="verifyAttendee"
          label="Attendee address"
          value={attendee}
          onChange={setAttendee}
          placeholder="G…"
          mono
          required
          hint="The wallet address that claims to hold the badge."
          error={fieldErrors.verifyAttendee}
        />

        <button type="button" onClick={() => void submitCheck()}>
          Verify
        </button>

        {checkAction.error !== null && <ErrorNotice error={checkAction.error} />}

        {result !== null && (
          <div
            className={`notice ${result.held ? 'notice-ok' : ''}`}
            role="status"
            aria-live="polite"
          >
            {result.held ? (
              <>
                <p className="notice-title">Yes — this address holds a badge for that event.</p>
                <p className="hint">
                  The record lives in the contract; the badge cannot have been moved there by
                  anyone, because nothing can move badges.
                </p>
              </>
            ) : (
              <p className="notice-title">
                No badge found for that address on that event.
              </p>
            )}
          </div>
        )}

        {result !== null && (
          <>
            {result.badges.map((badge) => (
              <BadgeCard key={badge.issuedAt.toString()} badge={badge} />
            ))}
            <CsvExport badges={result.badges} />
          </>
        )}
      </fieldset>
    </section>
  );
}
