// @vitest-environment happy-dom
import { fireEvent } from '@testing-library/react';
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
  clientFactory,
  eventFactory,
  fakeAccount,
  pagePropsFactory,
  renderOnly,
  renderWithA11y,
  textOf,
  walletFactory,
} from '../test/render';

import { u64ToScVal } from '../lib/scval';
import { OrganizerPage } from './OrganizerPage';

const NAME_HASH = 'cd'.repeat(32); // 64 hexadecimal characters, synthetic.

describe('<OrganizerPage />', () => {
  it('asks for a wallet before anything else', () => {
    const view = renderOnly(
      <OrganizerPage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />,
    );
    expect(view.getByRole('button', { name: 'Connect wallet' })).not.toBeNull();
    expect(view.queryByRole('button', { name: 'Create the event' })).toBeNull();
  });

  it('reports every validation failure before building a transaction', async () => {
    const user = userEvent.setup();
    const client = clientFactory();
    const submit = vi.spyOn(client, 'submit');
    const view = renderOnly(<OrganizerPage {...pagePropsFactory({ client })} />);

    await user.click(view.getByRole('button', { name: 'Create the event' }));

    const alerts = await view.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(2); // name hash and cap; the deadline defaults valid
    expect(submit).not.toHaveBeenCalled();
    expect(textOf(view.container)).not.toContain('Transaction submitted');
  });

  it('refuses a past deadline with the ERRORS.md wording, before any call', async () => {
    const user = userEvent.setup();
    const client = clientFactory();
    const submit = vi.spyOn(client, 'submit');
    const view = renderOnly(<OrganizerPage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event name hash (64 hex characters)'), NAME_HASH);
    await user.type(view.getByLabelText('Badge cap'), '50');
    fireEvent.change(view.getByLabelText('Claim deadline'), {
      target: { value: '2020-01-01T00:00' },
    });
    await user.click(view.getByRole('button', { name: 'Create the event' }));

    const alert = await view.findByRole('alert');
    expect(alert.textContent).toContain('The claim deadline must be in the future.');
    expect(submit).not.toHaveBeenCalled();
  });

  it('creates an event, shows the claim code, and loads the new event', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory({ id: 5n })]);
    client.submit = async () => ({ hash: 'b'.repeat(64), returnValue: u64ToScVal(5n) });
    const view = renderOnly(<OrganizerPage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event name hash (64 hex characters)'), NAME_HASH);
    await user.type(view.getByLabelText('Badge cap'), '50');
    await user.click(view.getByRole('button', { name: 'Create the event' }));

    expect(await view.findByText('Transaction submitted')).not.toBeNull();
    expect(textOf(view.container)).toContain('Event #5 created');

    // The claim code appears as 64 hex characters, with its on-chain hash.
    const text = textOf(view.container);
    expect(text).toContain('Claim code:');
    expect(text).toMatch(/[0-9a-f]{64}/);
    expect(text).toContain('Code hash (on-chain):');

    // The manage id is prefilled and the event record loads.
    const manageId = view.getAllByLabelText('Event id')[0] as HTMLInputElement;
    expect(manageId.value).toBe('5');
    expect(await view.findByText('Badges issued')).not.toBeNull();
  });

  it('awards a badge to a loaded event', async () => {
    const user = userEvent.setup();
    const attendee = fakeAccount();
    const client = clientFactory([eventFactory({ id: 1n, claimCount: 1 })]);
    const view = renderOnly(<OrganizerPage {...pagePropsFactory({ client })} />);

    await user.type(view.getAllByLabelText('Event id')[0], '1');
    await user.click(view.getByRole('button', { name: 'Load the event' }));
    await view.findByText('Award a badge');

    await user.type(view.getAllByLabelText('Attendee address')[0], attendee);
    await user.click(view.getByRole('button', { name: 'Award the badge' }));

    expect(await view.findByText('Badge awarded')).not.toBeNull();
  });

  it('maps a contract error on award to the ERRORS.md wording', async () => {
    const user = userEvent.setup();
    const attendee = fakeAccount();
    const client = clientFactory([eventFactory({ id: 1n })]);
    client.failNextWriteWith(new Error('HostError: Error(Contract, #13)'));
    const view = renderOnly(<OrganizerPage {...pagePropsFactory({ client })} />);

    await user.type(view.getAllByLabelText('Event id')[0], '1');
    await user.click(view.getByRole('button', { name: 'Load the event' }));
    await view.findByText('Award a badge');

    await user.type(view.getAllByLabelText('Attendee address')[0], attendee);
    await user.click(view.getByRole('button', { name: 'Award the badge' }));

    const alert = await view.findByRole('alert');
    expect(alert.textContent).toContain('This address already holds a badge for this event.');
  });

  it('disables awarding while the window is closed or the cap is reached', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory({ id: 1n, claimCount: 100 })]);
    const view = renderOnly(<OrganizerPage {...pagePropsFactory({ client })} />);

    await user.type(view.getAllByLabelText('Event id')[0], '1');
    await user.click(view.getByRole('button', { name: 'Load the event' }));

    expect(await view.findByText('Full')).not.toBeNull();
    const award = view.getByRole('button', { name: 'Award the badge' }) as HTMLButtonElement;
    expect(award.disabled).toBe(true);
  });

  it('passes the accessibility check disconnected and with the form open', async () => {
    await renderWithA11y(
      <OrganizerPage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />,
    );
    const client = clientFactory([eventFactory()]);
    await renderWithA11y(<OrganizerPage {...pagePropsFactory({ client })} />);
  });
});
