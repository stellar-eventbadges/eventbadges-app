// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { renderOnly, renderWithA11y, textOf } from '../test/render';

import { TransactionResult } from './TransactionResult';

const BASE = 'https://example.testexplorer.invalid';
const HASH = 'a'.repeat(64);

describe('<TransactionResult />', () => {
  it('shows the label, a shortened hash and the full hash accessibly', () => {
    const view = renderOnly(<TransactionResult hash={HASH} explorerBaseUrl={BASE} />);
    expect(textOf(view.container)).toContain('Transaction submitted');
    expect(textOf(view.container)).toContain(HASH); // sr-only full hash
    const short = view.container.querySelector('.mono')?.textContent ?? '';
    expect(short).toContain(`a`.repeat(10));
    expect(short).toContain('…');
  });

  it('links to the transaction on the configured explorer', () => {
    const view = renderOnly(<TransactionResult hash={HASH} explorerBaseUrl={BASE} />);
    const link = view.getByRole('link', { name: 'Open it in the explorer' }) as HTMLAnchorElement;
    expect(link.href).toBe(`${BASE}/tx/${HASH}`);
    expect(link.target).toBe('_blank');
  });

  it('announces the result politely in a live region', () => {
    const view = renderOnly(
      <TransactionResult hash={HASH} explorerBaseUrl={BASE} label="Badge awarded" />,
    );
    expect(view.container.querySelector('[role="status"]')).not.toBeNull();
    expect(textOf(view.container)).toContain('Badge awarded');
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(<TransactionResult hash={HASH} explorerBaseUrl={BASE} />);
  });
});
