// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { renderOnly, renderWithA11y, textOf } from './render';

/**
 * The harness's own guard: proves the axe check in `renderWithA11y` actually
 * fails on a serious violation, so a future regression in the helper cannot
 * silently turn every accessibility test into a no-op. This keeps the
 * "break a label deliberately and confirm the check fails" step as a
 * permanent test instead of a one-off manual verification.
 */
describe('renderWithA11y (the accessibility harness itself)', () => {
  it('accepts a properly labelled control', async () => {
    await renderWithA11y(
      <label htmlFor="ok">
        Amount
        <input id="ok" type="text" />
      </label>,
    );
  });

  it('fails on a broken label — deliberately unlabelled input', async () => {
    let message = '';
    try {
      await renderWithA11y(
        <div>
          <span>Amount</span>
          <input type="text" />
        </div>,
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('axe found');
    expect(message).toContain('label');
  });

  it('keeps sr-only text reachable in the DOM for assertions', () => {
    const view = renderOnly(
      <p>
        <span className="sr-only"> Full hash: abc123</span>
      </p>,
    );
    expect(textOf(view.container)).toContain('abc123');
  });
});
