// @vitest-environment happy-dom
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pagePropsFactory, renderOnly, renderWithA11y, textOf, walletFactory } from '../test/render';
import { HomePage } from './HomePage';

describe('<HomePage />', () => {
  it('takes each entry action to its existing workspace without connecting a wallet', () => {
    const onNavigate = vi.fn();
    const connect = vi.fn(async () => {});
    const view = renderOnly(<HomePage {...pagePropsFactory({ wallet: walletFactory({ address: null, connect }) })} onNavigate={onNavigate} />);
    fireEvent.click(view.getByRole('button', { name: 'Claim a badge' }));
    fireEvent.click(view.getByRole('button', { name: 'Verify attendance' }));
    fireEvent.click(view.getByRole('button', { name: 'Organize an event' }));
    expect(onNavigate.mock.calls).toEqual([['attendee'], ['verify'], ['organizer']]);
    expect(connect).not.toHaveBeenCalled();
  });

  it('distinguishes synthetic deployment from unverified browser-wallet and pilot flows', () => {
    const view = renderOnly(<HomePage {...pagePropsFactory()} />);
    const text = textOf(view.container);
    expect(text).toContain('verified synthetic testnet demonstration');
    expect(text).toContain('Real browser-wallet flows are still pending');
    expect(text).toContain('No pilot has happened');
    expect(text).toContain('no security review or audit');
    expect(text).toContain('does not establish a person’s identity');
    expect(text).toContain('QR scanning');
  });

  it('places the configured contract and prototype details in a keyboard-accessible disclosure', () => {
    const props = pagePropsFactory();
    const view = renderOnly(<HomePage {...props} />);
    const disclosure = view.container.querySelector('details');
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.querySelector('summary')).not.toBeNull();
    expect(disclosure?.textContent).toContain(props.config.contractId);
    expect(view.queryByRole('button', { name: 'Connect wallet' })).toBeNull();
  });

  it('passes the accessibility check connected and disconnected', async () => {
    await renderWithA11y(<HomePage {...pagePropsFactory({ wallet: walletFactory({ address: null }) })} />);
    await renderWithA11y(<HomePage {...pagePropsFactory()} />);
  });
});
