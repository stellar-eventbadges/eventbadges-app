// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import {
  pagePropsFactory,
  renderOnly,
  renderWithA11y,
  textOf,
  walletFactory,
} from '../test/render';

import { HomePage } from './HomePage';

describe('<HomePage />', () => {
  it('explains who the app is for and what each screen does', () => {
    const view = renderOnly(<HomePage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />);
    const text = textOf(view.container);
    expect(text).toContain('Attendance badges that cannot be faked or sold');
    expect(text).toContain('Organizer:');
    expect(text).toContain('Attendee:');
    expect(text).toContain('verify that an address holds a badge');
  });

  it('states plainly what has not happened yet', () => {
    const view = renderOnly(<HomePage {...pagePropsFactory()} />);
    const text = textOf(view.container);
    expect(text).toContain('What has not happened yet');
    expect(text).toContain('No pilot has happened');
    expect(text).toContain('no flow here has been exercised end to end yet');
    expect(text).toContain('no security review or audit');
  });

  it('shows the configured contract id and a connect button', () => {
    const view = renderOnly(
      <HomePage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />,
    );
    const text = textOf(view.container);
    expect(text).toContain('Contract:');
    // Disconnected, both the header bar and the prompt offer to connect.
    expect(view.getAllByRole('button', { name: 'Connect wallet' }).length).toBe(2);
  });

  it('passes the accessibility check connected and disconnected', async () => {
    await renderWithA11y(<HomePage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />);
    await renderWithA11y(<HomePage {...pagePropsFactory()} />);
  });
});
