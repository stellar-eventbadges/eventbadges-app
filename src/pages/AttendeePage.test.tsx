// @vitest-environment happy-dom
import { createHash } from 'node:crypto';

import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The write path goes through lib/wallet; mock it so no test can reach a real
// wallet, a real RPC endpoint, or a real key. runWrite's network gate and the
// signing step are stubbed to the success shape the pages expect.
vi.mock('../lib/wallet', () => ({
  checkWalletNetwork: async () => ({
    onTestnet: true,
    passphrase: 'Test SDF Network ; September 2015',
  }),
  signWithWallet: async (xdr: string) => `signed:${xdr}`,
  connectWallet: async () => {
    throw new Error('not used in tests');
  },
  disconnectWallet: async () => {},
  initWallet: () => {},
  rememberedAddress: async () => null,
}));

import {
  badgeFactory,
  clientFactory,
  eventFactory,
  fakeAccount,
  pagePropsFactory,
  renderOnly,
  renderWithA11y,
  textOf,
  walletFactory,
} from '../test/render';
import { bytesToHex } from '../lib/claimCode';
import { CLAIM_CODE_WARNING, NOTICE_ACK_LABEL, NOTICE_GATE_HINT } from '../lib/privacyNotice';

import { AttendeePage } from './AttendeePage';

vi.mock('../lib/camera', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/camera')>();
  return { ...original, grabFrame: vi.fn() };
});

import { qrEncode } from '../lib/qr';
import { rasterizeQr } from '../test/qrRaster';
import { grabFrame } from '../lib/camera';

const CODE = 'ab'.repeat(32); // 64 hexadecimal characters, synthetic.

function ticketFrame(): { width: number; height: number; data: Uint8ClampedArray } {
  return rasterizeQr(qrEncode(CODE, 'L'), { modulePixels: 4 });
}

/**
 * A camera stream whose release the test can watch. A real `MediaStream`
 * instance — happy-dom refuses a `srcObject` that is not one — with its track
 * list swapped for a stop spy. The same fake used in `QrScanner.test.tsx`.
 */
function fakeStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  const stream = new MediaStream();
  stream.getTracks = () => [{ stop } as unknown as MediaStreamTrack];
  return { stream, stop };
}

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
});

afterEach(() => {
  vi.mocked(grabFrame).mockReset();
  Reflect.deleteProperty(navigator, 'mediaDevices');
});

/** Ticks the privacy acknowledgement, which gates the claim button. */
async function acknowledge(
  user: ReturnType<typeof userEvent.setup>,
  view: ReturnType<typeof renderOnly>,
): Promise<void> {
  await user.click(view.getByRole('checkbox', { name: NOTICE_ACK_LABEL }));
}

describe('<AttendeePage />', () => {
  it('asks for a wallet before anything else', () => {
    const view = renderOnly(
      <AttendeePage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />,
    );
    expect(view.getByRole('button', { name: 'Connect wallet' })).not.toBeNull();
    expect(view.queryByRole('button', { name: 'Claim my badge' })).toBeNull();
  });

  it('reports every validation failure before building a transaction', async () => {
    const user = userEvent.setup();
    const client = clientFactory();
    const submit = vi.spyOn(client, 'submit');
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    const alerts = await view.findAllByRole('alert');
    expect(alerts.length).toBe(2); // event id and claim code
    expect(submit).not.toHaveBeenCalled();
    expect(textOf(view.container)).not.toContain('Badge claimed');
  });

  it('rejects a malformed code before any call', async () => {
    const user = userEvent.setup();
    const client = clientFactory();
    const submit = vi.spyOn(client, 'submit');
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), 'abc');
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    const alert = await view.findByRole('alert');
    expect(alert.textContent).toContain('exactly 64 hexadecimal characters');
    expect(submit).not.toHaveBeenCalled();
  });

  it('claims a badge and then lists it under your badges', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const badge = badgeFactory({ eventId: 1n, attendee: address });
    const client = clientFactory([eventFactory()], [badge]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), CODE);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(await view.findByText('Badge claimed')).not.toBeNull();
    expect(await view.findByText('Badge for event #1')).not.toBeNull();
  });

  // The contract takes the code's leaf and proof. If the page ever sends the
  // code itself again, the raw secret is back in a public transaction and this
  // test is the tripwire.
  it('sends the code’s SHA-256, never the code', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const client = clientFactory([eventFactory()], [badgeFactory({ eventId: 1n, attendee: address })]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), CODE);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(client.preparedClaims).toHaveLength(1);
    const sent = client.preparedClaims[0].leafHash;
    expect(sent).toHaveLength(32);
    expect(bytesToHex(sent)).toBe(
      createHash('sha256').update(Buffer.from(CODE, 'hex')).digest('hex'),
    );
    // Not a value derived from the code by chance: the code's own bytes differ.
    expect(bytesToHex(sent)).not.toBe(CODE);
    // No proof was pasted, which is what a one-attendee event needs.
    expect(client.preparedClaims[0].proof).toEqual([]);
  });

  it('sends the pasted proof, one 32-byte sibling per part', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const client = clientFactory([eventFactory()], [badgeFactory({ eventId: 1n, attendee: address })]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);
    const sibling = 'cd'.repeat(32);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), CODE);
    await user.type(view.getByLabelText('Claim proof (optional)'), sibling);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(client.preparedClaims).toHaveLength(1);
    const proof = client.preparedClaims[0].proof;
    expect(proof).toHaveLength(1);
    expect(bytesToHex(proof[0])).toBe(sibling);
  });

  it('refuses a malformed proof before building a transaction', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), CODE);
    await user.type(view.getByLabelText('Claim proof (optional)'), 'not-a-hash');
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(await view.findByText(/64-character hexadecimal hash/)).not.toBeNull();
    expect(client.preparedClaims).toHaveLength(0);
  });

  it('accepts a whole ticket in the code field, proof and all', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const client = clientFactory([eventFactory()], [badgeFactory({ eventId: 1n, attendee: address })]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);
    const sibling = 'cd'.repeat(32);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), `${CODE}:${sibling}`);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(client.preparedClaims).toHaveLength(1);
    expect(bytesToHex(client.preparedClaims[0].leafHash)).toBe(
      createHash('sha256').update(Buffer.from(CODE, 'hex')).digest('hex'),
    );
    expect(client.preparedClaims[0].proof.map(bytesToHex)).toEqual([sibling]);
  });

  it('prefers a ticket’s own proof over the proof field when both are filled', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const client = clientFactory([eventFactory()], [badgeFactory({ eventId: 1n, attendee: address })]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);
    const ticketProof = 'cd'.repeat(32);
    const staleProof = 'ef'.repeat(32);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), `${CODE}:${ticketProof}`);
    await user.type(view.getByLabelText('Claim proof (optional)'), staleProof);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(client.preparedClaims).toHaveLength(1);
    expect(client.preparedClaims[0].proof.map(bytesToHex)).toEqual([ticketProof]);
  });

  it('refuses a ticket with a malformed proof before building a transaction', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), `${CODE}:not-a-hash`);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(await view.findByText(/64-character hexadecimal hash/)).not.toBeNull();
    expect(client.preparedClaims).toHaveLength(0);
  });

  it('maps a contract error on claim to the ERRORS.md wording', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()]);
    client.failNextWriteWith(new Error('HostError: Error(Contract, #14)'));
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), CODE);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    const alert = await view.findByRole('alert');
    expect(alert.textContent).toContain('That claim code is not valid for this event.');
    expect(alert.textContent).toContain(
      'Check the code with the organizer and try again; each attendee has their own code.',
    );
  });

  it('lists the badges an address holds for the event id above', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const badge = badgeFactory({ eventId: 2n, attendee: address });
    const client = clientFactory([eventFactory({ id: 2n })], [badge]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);

    await user.type(view.getByLabelText('Event id'), '2');
    await user.click(view.getByRole('button', { name: 'Show badges' }));

    expect(await view.findByText('Badge for event #2')).not.toBeNull();
  });

  it('offers a CSV of exactly the records the lookup read, and only after it', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const other = fakeAccount();
    const mine = badgeFactory({ eventId: 2n, attendee: address });
    const alsoMine = badgeFactory({ eventId: 2n, attendee: address, issuedAt: 1_790_000_500n });
    const theirs = badgeFactory({ eventId: 2n, attendee: other, issuedAt: 1_790_000_900n });
    const client = clientFactory([eventFactory({ id: 2n })], [mine, alsoMine, theirs]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);

    // Nothing to export before a read, even though the page is mounted.
    expect(view.queryByRole('button', { name: /as CSV/ })).toBeNull();

    await user.type(view.getByLabelText('Event id'), '2');
    await user.click(view.getByRole('button', { name: 'Show badges' }));

    // The lookup read one address's two records, so the export offers those.
    expect(
      await view.findByRole('button', { name: 'Download 2 badge records as CSV' }),
    ).not.toBeNull();
    expect(textOf(view.container)).toContain('not the event’s other attendees');
    expect(textOf(view.container)).not.toContain(theirs.attendee);
  });

  it('says plainly when no badge exists for that address and event', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()], []);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.click(view.getByRole('button', { name: 'Show badges' }));

    expect(await view.findByText('No badges found for this address on that event id.')).not.toBeNull();
  });

  it('shows the claim-code warning on the claim screen itself', () => {
    const view = renderOnly(<AttendeePage {...pagePropsFactory()} />);
    expect(textOf(view.container)).toContain(CLAIM_CODE_WARNING);
  });

  it('gates the claim button until the notice is acknowledged', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()]);
    const submit = vi.spyOn(client, 'submit');
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    const button = view.getByRole('button', { name: 'Claim my badge' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(view.container)).toContain(NOTICE_GATE_HINT);

    // A fully valid claim, refused because the notice was not acknowledged.
    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code or ticket'), CODE);
    await user.click(button);
    expect(submit).not.toHaveBeenCalled();

    await acknowledge(user, view);
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(textOf(view.container)).not.toContain(NOTICE_GATE_HINT);
  });

  it('offers a scan button on the claim screen', () => {
    const view = renderOnly(<AttendeePage {...pagePropsFactory()} />);
    expect(view.getByRole('button', { name: 'Scan the code with the camera' })).not.toBeNull();
  });

  it('scans a ticket through the page and releases the camera', async () => {
    const { stream, stop } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(grabFrame).mockReturnValue(ticketFrame());
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.click(view.getByRole('button', { name: 'Scan the code with the camera' }));

    // The decoded value lands in the field synchronously once the decoder
    // returns — that is the deterministic outcome, so wait on it rather than
    // on the camera-release side effect, which races with the 150ms poll
    // interval under concurrent test isolates.
    await vi.waitFor(
      () =>
        expect((view.getByLabelText('Claim code or ticket') as HTMLInputElement).value)
          .toBe(CODE),
      { timeout: 2000 },
    );
    expect(vi.mocked(grabFrame)).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it('refuses a scanned value that is not a valid claim code', async () => {
    const { stream, stop } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(grabFrame).mockReturnValue(
      rasterizeQr(qrEncode('not a claim code', 'L'), { modulePixels: 4 }),
    );
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.click(view.getByRole('button', { name: 'Scan the code with the camera' }));

    // Wait on the field being marked invalid — the deterministic outcome — then
    // confirm the camera was released (grabFrame was driven, stop was called).
    await vi.waitFor(
      () =>
        expect(
          view
            .getByLabelText('Claim code or ticket')
            .getAttribute('aria-invalid'),
        ).toBe('true'),
      { timeout: 2000 },
    );
    expect(vi.mocked(grabFrame)).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it('passes the accessibility check disconnected and connected', async () => {
    await renderWithA11y(
      <AttendeePage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />,
    );
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const client = clientFactory([eventFactory()], [badgeFactory({ attendee: address })]);
    await renderWithA11y(<AttendeePage {...pagePropsFactory({ client, wallet })} />);
  });
});
