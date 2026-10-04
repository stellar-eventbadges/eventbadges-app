// @vitest-environment happy-dom
import { createHash } from 'node:crypto';

import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

const CODE = 'ab'.repeat(32); // 64 hexadecimal characters, synthetic.

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
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), 'abc');
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
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), CODE);
    await acknowledge(user, view);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(await view.findByText('Badge claimed')).not.toBeNull();
    expect(await view.findByText('Badge for event #1')).not.toBeNull();
  });

  // The contract takes the claim code's SHA-256. If the page ever sends the
  // code itself again, the raw secret is back in a public transaction and this
  // test is the tripwire.
  it('sends the code’s SHA-256, never the code', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const client = clientFactory([eventFactory()], [badgeFactory({ eventId: 1n, attendee: address })]);
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client, wallet })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), CODE);
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
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), CODE);
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
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), CODE);
    await user.type(view.getByLabelText('Claim proof (optional)'), 'not-a-hash');
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
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), CODE);
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
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), CODE);
    await user.click(button);
    expect(submit).not.toHaveBeenCalled();

    await acknowledge(user, view);
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(textOf(view.container)).not.toContain(NOTICE_GATE_HINT);
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
