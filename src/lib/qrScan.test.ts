// Tests for the camera-frame scanner (draft 02). Frames are rasterised from
// known matrices by `src/test/qrRaster.ts`, so each test is a small stand-in
// for a phone pointed at the organizer's screen: pixels in, ticket text out.
import { describe, expect, it } from 'vitest';

import { rasterizeQr } from '../test/qrRaster';
import { formatTicket } from './claimCode';
import { qrEncode, type ErrorCorrectionLevel } from './qr';
import { qrScan, type RasterImage } from './qrScan';

const CLAIM_CODE = '0123456789abcdef'.repeat(4);
const PROOF = ['ab'.repeat(32), 'cd'.repeat(32)];

function solidFrame(width: number, height: number, grey: number): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = grey;
    data[i * 4 + 1] = grey;
    data[i * 4 + 2] = grey;
  }
  return { width, height, data };
}

function noiseFrame(width: number, height: number, seed: number): RasterImage {
  let state = seed;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let i = 0; i < width * height; i += 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const grey = (state >> 16) & 0xff;
    data[i * 4] = grey;
    data[i * 4 + 1] = grey;
    data[i * 4 + 2] = grey;
  }
  return { width, height, data };
}

describe('qrScan reads rasterised symbols', () => {
  it('reads the claim code at several camera distances', () => {
    const qr = qrEncode(CLAIM_CODE, 'L');
    for (const modulePixels of [3, 5, 8]) {
      const frame = rasterizeQr(qr, { modulePixels });
      expect(qrScan(frame), `modulePixels=${modulePixels}`).toBe(CLAIM_CODE);
    }
  });

  it('reads a whole ticket, code and proof', () => {
    const ticket = formatTicket(CLAIM_CODE, PROOF);
    const frame = rasterizeQr(qrEncode(ticket, 'L'), { modulePixels: 3 });
    expect(qrScan(frame)).toBe(ticket);
  });

  it('reads every error correction level', () => {
    for (const level of ['L', 'M', 'Q', 'H'] as const satisfies readonly ErrorCorrectionLevel[]) {
      const frame = rasterizeQr(qrEncode(CLAIM_CODE, level), { modulePixels: 4 });
      expect(qrScan(frame), `level=${level}`).toBe(CLAIM_CODE);
    }
  });

  it('reads an off-centre symbol', () => {
    const qr = qrEncode(CLAIM_CODE, 'L');
    const frame = rasterizeQr(qr, { modulePixels: 4, offsetX: 37, offsetY: -21 });
    expect(qrScan(frame)).toBe(CLAIM_CODE);
  });

  it('reads a tilted symbol', () => {
    const qr = qrEncode(CLAIM_CODE, 'L');
    for (const angle of [0.3, -0.5, Math.PI / 2, Math.PI]) {
      const frame = rasterizeQr(qr, { modulePixels: 5, angle });
      expect(qrScan(frame), `angle=${angle}`).toBe(CLAIM_CODE);
    }
  });

  it('reads a noisy frame', () => {
    const qr = qrEncode(CLAIM_CODE, 'M');
    const frame = rasterizeQr(qr, { modulePixels: 5, noise: 30 });
    expect(qrScan(frame)).toBe(CLAIM_CODE);
  });

  it('reads a larger symbol', () => {
    const ticket = formatTicket(CLAIM_CODE, PROOF);
    const frame = rasterizeQr(qrEncode(ticket, 'Q'), { modulePixels: 3 });
    expect(qrScan(frame)).toBe(ticket);
  });

  it('reads whatever text the symbol carries', () => {
    const frame = rasterizeQr(qrEncode('hello, door', 'L'), { modulePixels: 5 });
    expect(qrScan(frame)).toBe('hello, door');
  });
});

describe('qrScan gives up cleanly', () => {
  it('returns null on a blank frame', () => {
    expect(qrScan(solidFrame(200, 200, 255))).toBeNull();
  });

  it('returns null on pure noise', () => {
    expect(qrScan(noiseFrame(200, 200, 42))).toBeNull();
  });

  it('returns null on a frame too small to hold a symbol', () => {
    expect(qrScan(solidFrame(10, 10, 0))).toBeNull();
  });

  it('returns null when a symbol is cropped to a sliver', () => {
    // A frame with finder-like corners but no complete symbol: draw only the
    // claim code QR's top-left quarter as noise-free pixels.
    const qr = qrEncode(CLAIM_CODE, 'L');
    const frame = rasterizeQr(qr, { modulePixels: 4 });
    const sliver: RasterImage = {
      width: frame.width,
      height: 12,
      data: frame.data.slice(0, frame.width * 12 * 4),
    };
    expect(qrScan(sliver)).toBeNull();
  });
});
