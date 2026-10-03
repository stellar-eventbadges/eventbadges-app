// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { renderOnly, renderWithA11y } from '../test/render';

import { Field } from './Field';

describe('<Field />', () => {
  it('labels the input through htmlFor and wires the hint', () => {
    const view = renderOnly(
      <Field
        id="maxClaims"
        label="Badge cap"
        value=""
        onChange={() => {}}
        hint="Between 1 and 10,000."
      />,
    );
    const input = view.getByLabelText('Badge cap') as HTMLInputElement;
    expect(input.id).toBe('maxClaims');
    expect(input.getAttribute('aria-describedby')).toBe('maxClaims-hint');
    expect(document.getElementById('maxClaims-hint')?.textContent).toContain('Between 1 and 10,000');
  });

  it('marks errors with aria-invalid, role=alert and describedby', () => {
    const view = renderOnly(
      <Field id="eventId" label="Event id" value="" onChange={() => {}} error="Enter an event id." />,
    );
    const input = view.getByLabelText('Event id') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('eventId-error');
    const alert = document.getElementById('eventId-error');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toBe('Enter an event id.');
  });

  it('wires both hint and error into describedby', () => {
    const view = renderOnly(
      <Field
        id="claimCode"
        label="Claim code"
        value=""
        onChange={() => {}}
        hint="Exactly as the organizer shared it."
        error="A claim code is exactly 64 hexadecimal characters."
      />,
    );
    expect(
      (view.getByLabelText('Claim code') as HTMLInputElement).getAttribute('aria-describedby'),
    ).toBe('claimCode-hint claimCode-error');
  });

  it('disables the input when asked', () => {
    const view = renderOnly(<Field id="x" label="X" value="1" onChange={() => {}} disabled />);
    expect((view.getByLabelText('X') as HTMLInputElement).disabled).toBe(true);
  });

  it('passes the accessibility check with hint and error present', async () => {
    await renderWithA11y(
      <Field
        id="nameHash"
        label="Event name hash"
        value=""
        onChange={() => {}}
        hint="64 hexadecimal characters."
        error="Enter the name hash."
      />,
    );
  });
});
