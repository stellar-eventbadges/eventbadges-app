// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { renderOnly, renderWithA11y, textOf, walletFactory } from '../test/render';

import { WalletBar } from './WalletBar';

describe('<WalletBar />', () => {
  it('offers a connect button before a wallet is connected', () => {
    const view = renderOnly(<WalletBar wallet={walletFactory({ address: null })} />);
    expect(view.getByRole('button', { name: 'Connect wallet' })).not.toBeNull();
  });

  it('shows the shortened address, the testnet badge and disconnect when connected', () => {
    const wallet = walletFactory();
    const view = renderOnly(<WalletBar wallet={wallet} />);
    const text = textOf(view.container);
    expect(text).toContain(String(wallet.address).slice(0, 6));
    expect(text).toContain('testnet');
    expect(view.getByRole('button', { name: 'Disconnect' })).not.toBeNull();
  });

  it('keeps the full address in the accessible text', () => {
    // A hover tooltip is not enough for screen-reader and touch users.
    const wallet = walletFactory();
    const view = renderOnly(<WalletBar wallet={wallet} />);
    expect(textOf(view.container)).toContain(String(wallet.address));
  });

  it('warns when the wallet is not on testnet', () => {
    const view = renderOnly(<WalletBar wallet={walletFactory({ onTestnet: false })} />);
    const text = textOf(view.container);
    expect(text).toContain('not testnet');
    expect(text).toContain('different network');
    expect(view.container.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });

  it('shows a wallet error as an alert', () => {
    const view = renderOnly(
      <WalletBar wallet={walletFactory({ error: 'The wallet did not connect.' })} />,
    );
    expect(textOf(view.container)).toContain('The wallet did not connect.');
  });

  it('passes the accessibility check connected and disconnected', async () => {
    await renderWithA11y(<WalletBar wallet={walletFactory()} />);
    await renderWithA11y(<WalletBar wallet={walletFactory({ address: null })} />);
  });
});
