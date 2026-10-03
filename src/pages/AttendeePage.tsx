import { useState } from 'react';

import { BadgeCard } from '../components/BadgeCard';
import { ConnectPrompt } from '../components/ConnectPrompt';
import { ErrorNotice } from '../components/ErrorNotice';
import { Field } from '../components/Field';
import { TransactionResult } from '../components/TransactionResult';
import { useAction } from '../hooks/useAction';
import type { BadgeRecord } from '../lib/badge';
import { hexToBytes, validateClaimCode } from '../lib/claimCode';
import type { SubmitResult } from '../lib/contract';
import { runWrite } from '../lib/flow';
import { validateAccountAddress, validateEventId } from '../lib/validation';
import type { PageProps } from './shared';

/**
 * The attendee's screen: claim a badge with the organizer's code, then see the
 * badges this address holds. Claiming signs with the connected wallet — the
 * contract records the badge under that exact address.
 */
export function AttendeePage({ client, config, wallet }: PageProps) {
  const [eventId, setEventId] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [lookupAddress, setLookupAddress] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [badges, setBadges] = useState<BadgeRecord[] | null>(null);

  const claimAction = useAction<SubmitResult>();
  const lookupAction = useAction<BadgeRecord[]>();

  if (wallet.address === null) {
    return (
      <section>
        <h1>Claim your badge</h1>
        <ConnectPrompt wallet={wallet} />
      </section>
    );
  }

  const address = wallet.address;
  const busy = claimAction.busy || lookupAction.busy;

  async function submitClaim() {
    const idCheck = validateEventId(eventId);
    const codeCheck = validateClaimCode(claimCode);

    setFieldErrors({
      claimEvent: idCheck.ok ? null : idCheck.message,
      claimCode: codeCheck.ok ? null : codeCheck.message,
    });
    if (!idCheck.ok || !codeCheck.ok) return;

    const result = await claimAction.run(async () =>
      runWrite(client, address, config.passphrase, () =>
        client.prepareClaim({
          source: address,
          eventId: idCheck.value,
          attendee: address,
          claimCode: hexToBytes(codeCheck.code),
        }),
      ),
    );

    if (result !== undefined) {
      setClaimCode('');
      // Refresh the badge list for this event once the claim is in.
      await loadBadges(address, idCheck.value);
    }
  }

  async function loadBadges(who: string, id: bigint) {
    const addressCheck = validateAccountAddress(who);
    setFieldErrors((prev) => ({
      ...prev,
      lookup: addressCheck.ok ? null : addressCheck.message,
    }));
    if (!addressCheck.ok) {
      setBadges(null);
      return;
    }

    const loaded = await lookupAction.run(async () =>
      client.badgesOf(address, id, addressCheck.value),
    );
    if (loaded !== undefined) setBadges(loaded);
  }

  async function submitLookup() {
    const who = lookupAddress === '' ? address : lookupAddress;
    const idCheck = validateEventId(eventId);
    setFieldErrors((prev) => ({
      ...prev,
      claimEvent: idCheck.ok ? null : idCheck.message,
    }));
    if (!idCheck.ok) return;
    await loadBadges(who, idCheck.value);
  }

  return (
    <section>
      <h1>Claim your badge</h1>
      <p>
        Enter the event id and the claim code the organizer gave you. The code is checked against a
        hash the contract stores — the code itself is never published.
      </p>

      <fieldset disabled={busy}>
        <legend>Claim with a code</legend>

        <Field
          id="claimEvent"
          label="Event id"
          value={eventId}
          onChange={setEventId}
          inputMode="numeric"
          placeholder="1"
          required
          error={fieldErrors.claimEvent}
        />

        <Field
          id="claimCode"
          label="Claim code (64 hex characters)"
          value={claimCode}
          onChange={setClaimCode}
          placeholder="64 hexadecimal characters"
          mono
          required
          hint="Exactly as the organizer shared it. If it does not work, check it character by character — codes are long on purpose."
          error={fieldErrors.claimCode}
        />

        <button type="button" onClick={() => void submitClaim()}>
          Claim my badge
        </button>

        {claimAction.error !== null && <ErrorNotice error={claimAction.error} />}
        {claimAction.result !== null && (
          <>
            <TransactionResult
              hash={claimAction.result.hash}
              explorerBaseUrl={config.explorerBaseUrl}
              label="Badge claimed"
            />
            <div className="notice notice-ok" role="status">
              <p className="notice-title">The badge is recorded for your address</p>
              <p>
                It cannot be sold, given away or moved: the contract has no way to move it. See it
                under &ldquo;Your badges&rdquo; below.
              </p>
            </div>
          </>
        )}
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Your badges</legend>

        <Field
          id="lookup"
          label="Address to check"
          value={lookupAddress === '' ? address : lookupAddress}
          onChange={setLookupAddress}
          placeholder="G…"
          mono
          required
          hint="Defaults to your connected address. Badges are per event, so the event id above picks which event is checked."
          error={fieldErrors.lookup ?? lookupAction.error?.message ?? null}
        />
        <button type="button" onClick={() => void submitLookup()}>
          Show badges
        </button>

        {badges !== null && (
          <div role="status">
            {badges.length === 0 ? (
              <p className="hint">No badges found for this address on that event id.</p>
            ) : (
              badges.map((badge) => <BadgeCard key={badge.issuedAt.toString()} badge={badge} />)
            )}
          </div>
        )}
      </fieldset>
    </section>
  );
}
