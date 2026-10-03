// @vitest-environment happy-dom
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CLAIM_CODE_WARNING,
  NOTICE_ACK_LABEL,
  NOTICE_INTRO,
  NOTICE_TITLE,
  NOTICE_TOGGLE_LABEL,
  NOTICE_TOGGLE_LABEL_COLLAPSED,
} from '../lib/privacyNotice';
import { renderOnly, renderWithA11y, textOf } from '../test/render';

import { PrivacyNotice } from './PrivacyNotice';

describe('<PrivacyNotice />', () => {
  it('shows the short notice without opening anything', () => {
    const view = renderOnly(<PrivacyNotice acknowledged={false} onAcknowledge={() => {}} />);
    const text = textOf(view.container);
    expect(text).toContain(NOTICE_TITLE);
    expect(text).toContain(NOTICE_INTRO);
    expect(text).toContain(CLAIM_CODE_WARNING);
    // The full text stays closed until asked for.
    expect(view.queryByText('Why anyone can check you, too')).toBeNull();
  });

  it('opens and closes the full notice from one control', async () => {
    const user = userEvent.setup();
    const view = renderOnly(<PrivacyNotice acknowledged={false} onAcknowledge={() => {}} />);
    const toggle = view.getByRole('button', { name: NOTICE_TOGGLE_LABEL });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(view.getByText('Why anyone can check you, too')).not.toBeNull();
    // The short version is still there: the full one adds to it, never
    // replaces it.
    expect(textOf(view.container)).toContain(CLAIM_CODE_WARNING);

    await user.click(view.getByRole('button', { name: NOTICE_TOGGLE_LABEL_COLLAPSED }));
    expect(view.getByRole('button', { name: NOTICE_TOGGLE_LABEL }).getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(view.queryByText('Why anyone can check you, too')).toBeNull();
  });

  it('keeps the claim-code warning in the expanded text too', async () => {
    const user = userEvent.setup();
    const view = renderOnly(<PrivacyNotice acknowledged={false} onAcknowledge={() => {}} />);
    await user.click(view.getByRole('button', { name: NOTICE_TOGGLE_LABEL }));
    expect(textOf(view.container)).toContain(CLAIM_CODE_WARNING);
  });

  it('labels the acknowledgement checkbox and reports changes', async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    const view = renderOnly(
      <PrivacyNotice acknowledged={false} onAcknowledge={onAcknowledge} />,
    );

    const checkbox = view.getByRole('checkbox', { name: NOTICE_ACK_LABEL }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);
    expect(onAcknowledge).toHaveBeenCalledWith(true);
  });

  it('reflects an acknowledgement made elsewhere', () => {
    const view = renderOnly(<PrivacyNotice acknowledged onAcknowledge={() => {}} />);
    expect(
      (view.getByRole('checkbox', { name: NOTICE_ACK_LABEL }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('passes the accessibility check collapsed and expanded', async () => {
    const user = userEvent.setup();
    const view = await renderWithA11y(
      <PrivacyNotice acknowledged={false} onAcknowledge={() => {}} />,
    );
    await user.click(view.getByRole('button', { name: NOTICE_TOGGLE_LABEL }));
  });
});
