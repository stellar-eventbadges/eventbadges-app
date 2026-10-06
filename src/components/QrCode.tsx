import { useMemo } from 'react';

import { QR_QUIET_ZONE, qrEncode, type ErrorCorrectionLevel } from '../lib/qr';

/**
 * One claim ticket's QR code (draft 01, `docs/issue-drafts/01-claim-code-as-qr.md`).
 *
 * The symbol is built in this browser from the payload alone — no image file,
 * no request — and drawn as a single `<path>` of unit squares, with the
 * standard's four-module quiet zone included in the viewBox. It is `role="img"`
 * with a caller-supplied label rather than `aria-hidden`: the code is also
 * shown as text beside it, but the QR is a real affordance, so a screen reader
 * is told what it is instead of finding a bare graphic.
 *
 * The colours are fixed black-on-white regardless of the app's palette:
 * scanners need that contrast, and the quiet zone is part of the symbol.
 */
export interface QrCodeProps {
  /** The text to encode — a claim ticket, or a bare claim code. */
  readonly value: string;
  /** The accessible name, e.g. "QR code of attendee 1's claim ticket". */
  readonly label: string;
  /** Error correction level; L is the smallest symbol that fits the code. */
  readonly level?: ErrorCorrectionLevel;
}

/** Dark modules as unit squares in one path, merging each horizontal run. */
function darkPath(modules: readonly (readonly boolean[])[]): string {
  const parts: string[] = [];
  for (let y = 0; y < modules.length; y += 1) {
    const row = modules[y];
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      const width = x - start;
      parts.push(
        `M${start + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h${width}v1h-${width}z`,
      );
    }
  }
  return parts.join('');
}

export function QrCode({ value, label, level = 'L' }: QrCodeProps) {
  const matrix = useMemo(() => qrEncode(value, level), [value, level]);
  const extent = matrix.size + QR_QUIET_ZONE * 2;

  return (
    <svg
      className="qr-code"
      viewBox={`0 0 ${extent} ${extent}`}
      role="img"
      aria-label={label}
      focusable="false"
      shapeRendering="crispEdges"
    >
      <rect className="qr-code-quiet" x="0" y="0" width={extent} height={extent} />
      <path className="qr-code-dark" d={darkPath(matrix.modules)} />
    </svg>
  );
}
