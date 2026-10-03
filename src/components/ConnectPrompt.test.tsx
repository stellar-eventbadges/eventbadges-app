// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

import { renderOnly, renderWithA11y, textOf, walletFactory } from '../test/render';

import { ConnectPrompt } from './ConnectPrompt';

describe('<ConnectPrompt />', () => {
  it('offers to connect and says why the app needs the wallet', () => {
    const connect = vi.fn(async () => {});
    const view = renderOnly(
      <ConnectPrompt wallet={walletFactory({ address: null, connect })} />,
    );
    expect(textOf(view.container)).toContain('Connect a wallet first');
    expect(textOf(view.container)).toContain('never');
    const button = view.getByRole('button', { name: 'Connect wallet' });
    button.click();
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('disables the button while connecting', () => {
    const view = renderOnly(
      <ConnectPrompt wallet={walletFactory({ address: null, connecting: true })} />,
    );
    const button = view.getByRole('button', { name: 'Connecting…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('stays enabled once an address exists — the page decides whether to show it', () => {
    const view = renderOnly(<ConnectPrompt wallet={walletFactory()} />);
    const button = view.getByRole('button', { name: 'Connect wallet' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(<ConnectPrompt wallet={walletFactory({ address: null })} />);
  });
});
