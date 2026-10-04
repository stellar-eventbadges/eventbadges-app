import { useState } from 'react';

import { BadgeCard } from '../components/BadgeCard';
import { ConnectPrompt } from '../components/ConnectPrompt';
import { ErrorNotice } from '../components/ErrorNotice';
import { Field } from '../components/Field';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { TransactionResult } from '../components/TransactionResult';
import { useAction } from '../hooks/useAction';
import type { BadgeRecord } from '../lib/badge';
import {
  hashClaimCode,
  hexToBytes,
  parseClaimProof,
  validateClaimCode,
} from '../lib/claimCode';
import type { SubmitResult } from '../lib/contract';
import { runWrite } from '../lib/flow';
import { NOTICE_GATE_HINT } from '../lib/privacyNotice';
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
  const [claimProof, setClaimProof] = useState('');
  const [lookupAddress, setLookupAddress] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [badges, setBadges] = useState<BadgeRecord[] | null>(null);
  // The privacy notice is shown above the claim button and must be
  // acknowledged before a claim can be signed. `aria-disabled` rather than the
  // `disabled` attribute so the button stays focusable and its explanation
  // stays reachable by keyboard and screen reader; `submitClaim` refuses too.
  const [acknowledged, setAcknowledged] = useState(false);

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
    if (!acknowledged) return;

    const idCheck = validateEventId(eventId);
    const codeCheck = validateClaimCode(claimCode);
    const proofCheck = parseClaimProof(claimProof);

    setFieldErrors({
      claimEvent: idCheck.ok ? null : idCheck.message,
      claimCode: codeCheck.ok ? null : codeCheck.message,
      claimProof: proofCheck.ok ? null : proofCheck.message,
    });
    if (!idCheck.ok || !codeCheck.ok || !proofCheck.ok) return;

    // The contract takes the code's SHA-256, not the code: hashing here keeps
    // the raw secret on this device and out of the transaction.
    const hashed = await hashClaimCode(codeCheck.code);
    if (!hashed.ok) {
      setFieldErrors((prev) => ({ ...prev, claimCode: hashed.message }));
      return;
    }

    const result = await claimAction.run(async () =>
      runWrite(client, address, config.passphrase, () =>
        client.prepareClaim({
          source: address,
          eventId: idCheck.value,
          attendee: address,
          leafHash: hexToBytes(hashed.hashHex),
          proof: proofCheck.value,
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
        Enter the event id, the claim code the organizer gave you, and the proof that came with it.
        The code is hashed here in your browser; the hash and the proof go to the contract, and the
        code itself is never published.
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

        <Field
          id="claimProof"
          label="Claim proof (optional)"
          value={claimProof}
          onChange={setClaimProof}
          placeholder="64-character hashes, separated by spaces"
          mono
          hint="The organizer's proof that your code belongs to this event, one hash per line. Leave it empty only if the event has a single attendee."
          error={fieldErrors.claimProof}
        />

        <PrivacyNotice
          acknowledged={acknowledged}
          onAcknowledge={setAcknowledged}
        />

        <button
          type="button"
          aria-disabled={!acknowledged || undefined}
          aria-describedby={!acknowledged ? 'claim-gate-hint' : undefined}
          onClick={() => void submitClaim()}
        >
          Claim my badge
        </button>
        {!acknowledged && (
          <p className="hint" id="claim-gate-hint">
            {NOTICE_GATE_HINT}
          </p>
        )}

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
