import { useState } from 'react';

import { ConnectPrompt } from '../components/ConnectPrompt';
import { ErrorNotice } from '../components/ErrorNotice';
import { EventSummary } from '../components/EventSummary';
import { Field } from '../components/Field';
import { TransactionResult } from '../components/TransactionResult';
import { useAction } from '../hooks/useAction';
import { canIssue, type EventRecord } from '../lib/badge';
import type { SubmitResult } from '../lib/contract';
import { defaultClosesAt, unixSecondsFromLocalInput } from '../lib/datetime';
import { runWrite } from '../lib/flow';
import {
  browserRandomBytes,
  generateClaimCode,
  hashClaimCode,
  hexToBytes,
  validateClaimCode,
} from '../lib/claimCode';
import { scValToEventId } from '../lib/scval';
import { validateAccountAddress, validateEventId, validateMaxClaims } from '../lib/validation';
import type { PageProps } from './shared';

interface CreatedEvent {
  readonly result: SubmitResult;
  readonly eventId: bigint | null;
  readonly code: string;
  readonly hashHex: string;
}

/**
 * The organizer's screen: record an event (with a locally generated claim
 * code), then award or revoke badges for it. The organizer is the connected
 * wallet, so `create_event` is signed by the same address it records — the
 * contract checks exactly that.
 */
export function OrganizerPage({ client, config, wallet }: PageProps) {
  const [nameHashHex, setNameHashHex] = useState('');
  const [maxClaims, setMaxClaims] = useState('');
  const [closesAt, setClosesAt] = useState(defaultClosesAt());
  const [manageId, setManageId] = useState('');
  const [awardAttendee, setAwardAttendee] = useState('');
  const [revokeEventId, setRevokeEventId] = useState('');
  const [revokeAttendee, setRevokeAttendee] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [loadedEvent, setLoadedEvent] = useState<EventRecord | null>(null);
  // Set when an event loads (never during render), so the derived window state
  // the UI shows is a snapshot taken with that load.
  const [nowSeconds, setNowSeconds] = useState(0);

  const createAction = useAction<CreatedEvent>();
  const loadAction = useAction<EventRecord>();
  const awardAction = useAction<SubmitResult>();
  const revokeAction = useAction<SubmitResult>();

  if (wallet.address === null) {
    return (
      <section>
        <h1>Organizer</h1>
        <ConnectPrompt wallet={wallet} />
      </section>
    );
  }

  const address = wallet.address;
  const busy = createAction.busy || loadAction.busy || awardAction.busy || revokeAction.busy;

  async function loadEvent(idInput: string) {
    const idCheck = validateEventId(idInput);
    setFieldErrors((prev) => ({ ...prev, manageId: idCheck.ok ? null : idCheck.message }));
    if (!idCheck.ok) {
      setLoadedEvent(null);
      return;
    }

    const event = await loadAction.run(async () => client.getEvent(address, idCheck.value));
    setLoadedEvent(event ?? null);
    if (event !== undefined) setNowSeconds(Math.floor(Date.now() / 1000));
  }

  async function submitCreate() {
    // The name hash and the claim code hash share the same 32-byte hex shape;
    // validateClaimCode is the 32-byte hex check.
    const nameHashCheck = validateClaimCode(nameHashHex);
    const capCheck = validateMaxClaims(maxClaims);

    const closesSeconds = unixSecondsFromLocalInput(closesAt);
    const nowSeconds = Math.floor(Date.now() / 1000);
    // Same wording as the ClosesAtInPast row in ERRORS.md.
    const closesError =
      closesSeconds === null
        ? 'Choose a claim deadline.'
        : closesSeconds <= nowSeconds
          ? 'The claim deadline must be in the future.'
          : null;

    const nextErrors: Record<string, string | null> = {
      nameHash: nameHashCheck.ok ? null : nameHashCheck.message,
      maxClaims: capCheck.ok ? null : capCheck.message,
      closesAt: closesError,
    };
    setFieldErrors(nextErrors);

    if (!nameHashCheck.ok || !capCheck.ok || closesSeconds === null || closesError !== null) {
      return;
    }

    // The claim code is generated here, hashed here, and shown once. Nothing
    // but the hash goes into the transaction; the code never leaves the page
    // except through the organizer's own sharing.
    const generated = generateClaimCode(browserRandomBytes);
    if (!generated.ok) {
      setFieldErrors((prev) => ({ ...prev, nameHash: generated.message }));
      return;
    }
    const hashed = await hashClaimCode(generated.code);
    if (!hashed.ok) {
      setFieldErrors((prev) => ({ ...prev, nameHash: hashed.message }));
      return;
    }

    const created = await createAction.run(async () => {
      const submit = await runWrite(client, address, config.passphrase, () =>
        client.prepareCreateEvent({
          source: address,
          organizer: address,
          nameHash: hexToBytes(nameHashCheck.code),
          claimRoot: hexToBytes(hashed.hashHex),
          maxClaims: capCheck.value,
          closesAt: BigInt(closesSeconds),
        }),
      );
      return {
        result: submit,
        eventId: submit.returnValue === undefined ? null : scValToEventId(submit.returnValue),
        code: generated.code,
        hashHex: hashed.hashHex,
      };
    });

    if (created !== undefined && created.eventId !== null) {
      setNameHashHex('');
      setManageId(created.eventId.toString());
      await loadEvent(created.eventId.toString());
    }
  }

  async function submitAward() {
    if (loadedEvent === null) return;
    const attendeeCheck = validateAccountAddress(awardAttendee);
    setFieldErrors((prev) => ({ ...prev, award: attendeeCheck.ok ? null : attendeeCheck.message }));
    if (!attendeeCheck.ok) return;

    const result = await awardAction.run(async () =>
      runWrite(client, address, config.passphrase, () =>
        client.prepareAward({
          source: address,
          eventId: loadedEvent.id,
          attendee: attendeeCheck.value,
        }),
      ),
    );
    if (result !== undefined) {
      setAwardAttendee('');
      await loadEvent(loadedEvent.id.toString());
    }
  }

  async function submitRevoke() {
    const idCheck = validateEventId(revokeEventId);
    const attendeeCheck = validateAccountAddress(revokeAttendee);
    setFieldErrors((prev) => ({
      ...prev,
      revokeId: idCheck.ok ? null : idCheck.message,
      revoke: attendeeCheck.ok ? null : attendeeCheck.message,
    }));
    if (!idCheck.ok || !attendeeCheck.ok) return;

    const result = await revokeAction.run(async () =>
      runWrite(client, address, config.passphrase, () =>
        client.prepareRevoke({
          source: address,
          eventId: idCheck.value,
          attendee: attendeeCheck.value,
        }),
      ),
    );
    if (result !== undefined) {
      setRevokeAttendee('');
      if (loadedEvent !== null && loadedEvent.id === idCheck.value) {
        await loadEvent(idCheck.value.toString());
      }
    }
  }

  return (
    <section>
      <h1>Organizer</h1>
      <p>
        You are the organizer of every event you create here: your connected address is recorded as
        the only address that can award or revoke badges for it.
      </p>

      <fieldset disabled={busy}>
        <legend>Create an event</legend>

        <Field
          id="nameHash"
          label="Event name hash (64 hex characters)"
          value={nameHashHex}
          onChange={setNameHashHex}
          placeholder="64 hexadecimal characters"
          mono
          required
          hint="The SHA-256 of your event's name, or any 32-byte opaque value. The chain never stores the readable name."
          error={fieldErrors.nameHash}
        />

        <Field
          id="maxClaims"
          label="Badge cap"
          value={maxClaims}
          onChange={setMaxClaims}
          inputMode="numeric"
          placeholder="100"
          required
          hint="Between 1 and 10,000. This is the total number of badges the event can ever issue."
          error={fieldErrors.maxClaims}
        />

        <Field
          id="closesAt"
          label="Claim deadline"
          value={closesAt}
          onChange={setClosesAt}
          type="datetime-local"
          required
          hint="In your local time zone. Claims and awards fail after it; revocation does not."
          error={fieldErrors.closesAt}
        />

        <button type="button" onClick={() => void submitCreate()}>
          Create the event
        </button>

        {createAction.error !== null && <ErrorNotice error={createAction.error} />}

        {createAction.result !== null && (
          <>
            <TransactionResult
              hash={createAction.result.result.hash}
              explorerBaseUrl={config.explorerBaseUrl}
            />
            {createAction.result.eventId !== null && (
              <div className="notice notice-ok" role="status">
                <p className="notice-title">
                  Event #{createAction.result.eventId.toString()} created
                </p>
                <p>
                  The claim code below was generated in your browser and is shown{' '}
                  <strong>once</strong>. Its SHA-256 is what the contract stores. Share the code
                  with attendees out-of-band (in person, or a channel you trust) — never by posting
                  it where strangers can read it.
                </p>
                <p className="mono" aria-live="polite">
                  <span className="hint">Claim code: </span>
                  {createAction.result.code}
                </p>
                <p className="mono">
                  <span className="hint">Code hash (on-chain): </span>
                  {createAction.result.hashHex}
                </p>
                <p className="hint">
                  There is no way to recover this code later — the chain only has the hash. If you
                  lose it, award badges directly instead.
                </p>
              </div>
            )}
          </>
        )}
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Manage an event</legend>

        <Field
          id="manageId"
          label="Event id"
          value={manageId}
          onChange={setManageId}
          inputMode="numeric"
          placeholder="1"
          required
          hint="Loads the event record so you can award badges against it."
          error={fieldErrors.manageId ?? loadAction.error?.message ?? null}
        />
        <button type="button" onClick={() => void loadEvent(manageId)}>
          Load the event
        </button>

        {loadedEvent !== null && (
          <div className="card">
            <EventSummary event={loadedEvent} nowSeconds={nowSeconds} />

            <h2>Award a badge</h2>
            <p className="hint">
              For attendees who cannot claim — no code, or a lost one. Same cap and deadline rules
              as claiming.
            </p>
            <Field
              id="award"
              label="Attendee address"
              value={awardAttendee}
              onChange={setAwardAttendee}
              placeholder="G…"
              mono
              required
              error={fieldErrors.award}
            />
            <button
              type="button"
              disabled={!canIssue(loadedEvent, nowSeconds)}
              onClick={() => void submitAward()}
            >
              Award the badge
            </button>
            {!canIssue(loadedEvent, nowSeconds) && (
              <p className="hint">
                The window is closed or the cap is reached, so the contract would reject this.
              </p>
            )}
            {awardAction.error !== null && <ErrorNotice error={awardAction.error} />}
            {awardAction.result !== null && (
              <TransactionResult
                hash={awardAction.result.hash}
                explorerBaseUrl={config.explorerBaseUrl}
                label="Badge awarded"
              />
            )}
          </div>
        )}
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Revoke a badge</legend>
        <p className="hint">
          Removes a badge issued in error. Works at any time, even after the deadline.
        </p>
        <Field
          id="revokeId"
          label="Event id"
          value={revokeEventId}
          onChange={setRevokeEventId}
          inputMode="numeric"
          placeholder="1"
          required
          error={fieldErrors.revokeId}
        />
        <Field
          id="revoke"
          label="Attendee address"
          value={revokeAttendee}
          onChange={setRevokeAttendee}
          placeholder="G…"
          mono
          required
          error={fieldErrors.revoke}
        />
        <button type="button" onClick={() => void submitRevoke()}>
          Revoke the badge
        </button>
        {revokeAction.error !== null && <ErrorNotice error={revokeAction.error} />}
        {revokeAction.result !== null && (
          <TransactionResult
            hash={revokeAction.result.hash}
            explorerBaseUrl={config.explorerBaseUrl}
            label="Badge revoked"
          />
        )}
      </fieldset>
    </section>
  );
}
