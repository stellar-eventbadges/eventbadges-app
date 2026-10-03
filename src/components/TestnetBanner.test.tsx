// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { renderOnly, renderWithA11y, textOf } from '../test/render';

import { TestnetBanner } from './TestnetBanner';

describe('<TestnetBanner />', () => {
  it('says testnet first, in a live region', () => {
    const view = renderOnly(<TestnetBanner />);
    expect(textOf(view.container)).toContain('TESTNET - no real money');
    const status = view.container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it('warns that the network can be reset', () => {
    const view = renderOnly(<TestnetBanner />);
    expect(textOf(view.container)).toContain('can be reset');
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(<TestnetBanner />);
  });
});
