// @vitest-environment happy-dom
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

import { AttendeePage } from './AttendeePage';

const CODE = 'ab'.repeat(32); // 64 hexadecimal characters, synthetic.

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
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    expect(await view.findByText('Badge claimed')).not.toBeNull();
    expect(await view.findByText('Badge for event #1')).not.toBeNull();
  });

  it('maps a contract error on claim to the ERRORS.md wording', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()]);
    client.failNextWriteWith(new Error('HostError: Error(Contract, #11)'));
    const view = renderOnly(<AttendeePage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Claim code (64 hex characters)'), CODE);
    await user.click(view.getByRole('button', { name: 'Claim my badge' }));

    const alert = await view.findByRole('alert');
    expect(alert.textContent).toContain('That claim code is not valid for this event.');
    expect(alert.textContent).toContain('Check the code with the organizer and try again.');
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
