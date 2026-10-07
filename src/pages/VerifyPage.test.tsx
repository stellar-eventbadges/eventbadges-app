// @vitest-environment happy-dom
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

import { VerifyPage } from './VerifyPage';

// The verify screen reads only; the wallet is irrelevant, but the harness
// factory still provides one.
describe('<VerifyPage />', () => {
  it('verifies with Enter and removes stale records when the input changes', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const client = clientFactory([eventFactory()], [badgeFactory({ attendee: address })]);
    const view = await renderWithA11y(<VerifyPage {...pagePropsFactory({ client })} />);
    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Attendee address'), `${address}{Enter}`);
    expect(await view.findByText(/holds a badge for that event/)).not.toBeNull();
    await user.type(view.getByLabelText('Event id'), '2');
    expect(view.queryByText(/holds a badge for that event/)).toBeNull();
    expect(view.queryByRole('button', { name: /as CSV/ })).toBeNull();
  });

  it('removes a previous success when a new check fails', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const client = clientFactory([eventFactory()], [badgeFactory({ attendee: address })]);
    const view = await renderWithA11y(<VerifyPage {...pagePropsFactory({ client })} />);
    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Attendee address'), address);
    await user.click(view.getByRole('button', { name: 'Verify' }));
    expect(await view.findByText(/holds a badge for that event/)).not.toBeNull();
    client.failNextReadWith(new Error('HostError: Error(Contract, #1)'));
    await user.click(view.getByRole('button', { name: 'Verify' }));
    expect(await view.findByRole('alert')).not.toBeNull();
    expect(view.queryByText(/holds a badge for that event/)).toBeNull();
    expect(view.queryByRole('button', { name: /as CSV/ })).toBeNull();
  });
  it('verifies that an address holds a badge and shows the record', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const wallet = walletFactory({ address });
    const badge = badgeFactory({ eventId: 1n, attendee: address });
    const client = clientFactory([eventFactory()], [badge]);
    const view = renderOnly(<VerifyPage {...pagePropsFactory({ client, wallet })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Attendee address'), badge.attendee);
    await user.click(view.getByRole('button', { name: 'Verify' }));

    expect(await view.findByText(/holds a badge for that event/)).not.toBeNull();
    expect(textOf(view.container)).toContain('Badge for event #1');
    expect(view.container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('offers a CSV of exactly the records the check read', async () => {
    const user = userEvent.setup();
    const address = fakeAccount();
    const other = fakeAccount();
    const mine = badgeFactory({ eventId: 1n, attendee: address });
    const alsoMine = badgeFactory({ eventId: 1n, attendee: address, issuedAt: 1_790_000_500n });
    const theirs = badgeFactory({ eventId: 1n, attendee: other, issuedAt: 1_790_000_900n });
    const client = clientFactory([eventFactory()], [mine, alsoMine, theirs]);
    const view = renderOnly(<VerifyPage {...pagePropsFactory({ client })} />);

    // Nothing to export until a check has read something.
    expect(view.queryByRole('button', { name: /as CSV/ })).toBeNull();

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Attendee address'), address);
    await user.click(view.getByRole('button', { name: 'Verify' }));

    expect(
      await view.findByRole('button', { name: 'Download 2 badge records as CSV' }),
    ).not.toBeNull();
    expect(textOf(view.container)).toContain('not the event’s other attendees');
    expect(textOf(view.container)).not.toContain(theirs.attendee);
  });

  it('says plainly when the address holds nothing', async () => {
    const user = userEvent.setup();
    const client = clientFactory([eventFactory()], []);
    const view = renderOnly(<VerifyPage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '1');
    await user.type(view.getByLabelText('Attendee address'), walletAddress());
    await user.click(view.getByRole('button', { name: 'Verify' }));

    expect(await view.findByText(/No badge found/)).not.toBeNull();
    expect(textOf(view.container)).not.toContain('Badge for event');
  });

  it('reports every validation failure before calling the contract', async () => {
    const user = userEvent.setup();
    const client = clientFactory();
    const hasBadge = vi.spyOn(client, 'hasBadge');
    const view = renderOnly(<VerifyPage {...pagePropsFactory({ client })} />);

    await user.click(view.getByRole('button', { name: 'Verify' }));

    const alerts = await view.findAllByRole('alert');
    expect(alerts.length).toBe(2); // event id and attendee address
    expect(hasBadge).not.toHaveBeenCalled();
  });

  it('maps a contract error to the ERRORS.md wording', async () => {
    const user = userEvent.setup();
    const client = clientFactory();
    client.failNextReadWith(new Error('HostError: Error(Contract, #1)'));
    const view = renderOnly(<VerifyPage {...pagePropsFactory({ client })} />);

    await user.type(view.getByLabelText('Event id'), '99');
    await user.type(view.getByLabelText('Attendee address'), walletAddress());
    await user.click(view.getByRole('button', { name: 'Verify' }));

    const alert = await view.findByRole('alert');
    expect(alert.textContent).toContain(
      "We couldn't find that event. Check the event id with the organizer.",
    );
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(<VerifyPage {...pagePropsFactory()} />);
    const client = clientFactory([eventFactory()], [badgeFactory()]);
    await renderWithA11y(<VerifyPage {...pagePropsFactory({ client })} />);
  });
});

/** A syntactically valid address generated by the SDK, for typing into forms. */
function walletAddress(): string {
  return fakeAccount();
}
