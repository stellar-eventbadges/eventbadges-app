// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { renderOnly, renderWithA11y, textOf } from '../test/render';

import { ConfigNotice } from './ConfigNotice';

describe('<ConfigNotice />', () => {
  it('lists every configuration problem it was given', () => {
    const view = renderOnly(
      <ConfigNotice
        problems={[
          'VITE_STELLAR_NETWORK is not set.',
          'VITE_CONTRACT_ID is not set.',
        ]}
      />,
    );
    const text = textOf(view.container);
    expect(text).toContain('This app is not configured yet');
    expect(text).toContain('VITE_STELLAR_NETWORK is not set.');
    expect(text).toContain('VITE_CONTRACT_ID is not set.');
    expect(view.container.querySelectorAll('li')).toHaveLength(2);
  });

  it('tells the reader where the values come from', () => {
    const view = renderOnly(<ConfigNotice problems={['VITE_SOROBAN_RPC_URL is not set.']} />);
    expect(textOf(view.container)).toContain('.env.example');
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(
      <ConfigNotice problems={['VITE_CONTRACT_ID is not a valid contract id.']} />,
    );
  });
});
