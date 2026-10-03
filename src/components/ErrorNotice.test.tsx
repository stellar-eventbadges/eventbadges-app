// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { renderOnly, renderWithA11y, textOf } from '../test/render';

import { ErrorNotice } from './ErrorNotice';

describe('<ErrorNotice />', () => {
  it('announces the mapped message as an alert', () => {
    const view = renderOnly(
      <ErrorNotice
        error={{
          message: 'That claim code is not valid for this event.',
          nextAction: 'Check the code with the organizer and try again.',
          code: 11,
        }}
      />,
    );
    const alert = view.container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(textOf(view.container)).toContain('That claim code is not valid for this event.');
  });

  it('shows the next action and the contract code when present', () => {
    const view = renderOnly(
      <ErrorNotice
        error={{
          message: 'The claim window for this event has closed.',
          nextAction: 'Ask the organizer whether another proof of attendance exists.',
          code: 10,
        }}
      />,
    );
    const text = textOf(view.container);
    expect(text).toContain('Ask the organizer whether another proof of attendance exists.');
    expect(text).toContain('Contract error code: 10');
  });

  it('omits the next action and code when the error has none', () => {
    const view = renderOnly(
      <ErrorNotice error={{ message: 'Something went wrong.' }} />,
    );
    const text = textOf(view.container);
    expect(text).not.toContain('Contract error code');
    expect(view.container.querySelectorAll('p')).toHaveLength(1);
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(
      <ErrorNotice error={{ message: 'The badge cap must be between 1 and 10,000.', code: 30 }} />,
    );
  });
});
