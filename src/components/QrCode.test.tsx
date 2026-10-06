// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { QR_QUIET_ZONE, qrEncode } from '../lib/qr';
import { decodeRenderedQr, renderOnly, renderWithA11y } from '../test/render';

import { QrCode } from './QrCode';

const CLAIM_CODE = 'fedcba9876543210'.repeat(4);
const TICKET = `${CLAIM_CODE}:${'ab'.repeat(32)}`;

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg.qr-code');
  if (svg === null) throw new Error('no svg');
  return svg as SVGSVGElement;
}

describe('<QrCode />', () => {
  it('renders an image with a caller-supplied accessible name', () => {
    const view = renderOnly(<QrCode value={CLAIM_CODE} label="QR code of the claim code" />);
    const svg = view.getByRole('img', { name: 'QR code of the claim code' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('decodes back to the exact 64-character claim code from the rendered SVG', () => {
    const view = renderOnly(<QrCode value={CLAIM_CODE} label="QR code of the claim code" />);
    expect(decodeRenderedQr(view.container)).toBe(CLAIM_CODE);
  });

  it('decodes a whole ticket, code and proof, from the rendered SVG', () => {
    const view = renderOnly(<QrCode value={TICKET} label="QR code of the claim ticket" />);
    expect(decodeRenderedQr(view.container)).toBe(TICKET);
  });

  it('includes the standard quiet zone in the viewBox', () => {
    const view = renderOnly(<QrCode value={CLAIM_CODE} label="QR code" />);
    // A 64-character code fits version 4 at level L: 33 modules per side.
    const extent = 33 + QR_QUIET_ZONE * 2;
    expect(svgOf(view.container).getAttribute('viewBox')).toBe(`0 0 ${extent} ${extent}`);
  });

  it('honours a requested correction level', () => {
    const view = renderOnly(<QrCode value={CLAIM_CODE} label="QR code" level="H" />);
    expect(decodeRenderedQr(view.container)).toBe(CLAIM_CODE);
    // Level H needs a larger symbol than level L for the same code, so this
    // also proves the level prop reached the encoder.
    const extent = qrEncode(CLAIM_CODE, 'H').size + QR_QUIET_ZONE * 2;
    expect(svgOf(view.container).getAttribute('viewBox')).toBe(`0 0 ${extent} ${extent}`);
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(<QrCode value={CLAIM_CODE} label="QR code of the claim code" />);
  });
});
