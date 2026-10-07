/**
 * Test-only rasteriser: turns an encoded `QrMatrix` into the kind of RGBA
 * frame the scanner sees, so `qrScan` can be tested end to end (pixels in,
 * text out) without a camera. Deliberately lives under `src/test/` — the app
 * never rasterises, it only reads frames the camera produced.
 */

import type { QrMatrix } from '../lib/qr';
import type { RasterImage } from '../lib/qrScan';

export interface RasterOptions {
  /** Pixels per module. Real frames sit around 3–10 for a phone at a door. */
  readonly modulePixels?: number;
  /** Light margin around the symbol, in modules (the standard says 4). */
  readonly quietModules?: number;
  /** Translation of the symbol from the frame's centre, in pixels. */
  readonly offsetX?: number;
  readonly offsetY?: number;
  /** In-plane rotation around the symbol's centre, in radians. */
  readonly angle?: number;
  /** Deterministic grey jitter amplitude (0..255) to rough up the frame. */
  readonly noise?: number;
  /** Grey level of the page behind the symbol (0..255). */
  readonly background?: number;
}

/** A tiny deterministic PRNG, so "random" frames are reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Renders `matrix` into an RGBA frame. The symbol is centred in the frame,
 * then shifted by (offsetX, offsetY) and rotated by `angle`, so tests can
 * exercise the scanner's geometry handling without a camera.
 */
export function rasterizeQr(matrix: QrMatrix, options: RasterOptions = {}): RasterImage {
  const modulePixels = options.modulePixels ?? 4;
  const quietModules = options.quietModules ?? 4;
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  const angle = options.angle ?? 0;
  const noise = options.noise ?? 0;
  const background = options.background ?? 255;

  const { size, modules } = matrix;
  const content = (size + 2 * quietModules) * modulePixels;
  // Room for the rotated bounding box and the translation.
  const extent = Math.ceil(content * 1.5) + 2 * (Math.abs(offsetX) + Math.abs(offsetY));
  const width = extent;
  const height = extent;

  const data = new Uint8ClampedArray(width * height * 4);
  const random = mulberry32(0x5eed);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      // Frame centre, minus the translation, then un-rotate into symbol space.
      const dx = px - (width / 2 + offsetX);
      const dy = py - (height / 2 + offsetY);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;

      let grey = background;
      const col = Math.floor(rx / modulePixels + size / 2);
      const row = Math.floor(ry / modulePixels + size / 2);
      if (col >= 0 && row >= 0 && col < size && row < size) {
        grey = modules[row][col] ? 0 : 255;
      }
      if (noise > 0) grey = Math.max(0, Math.min(255, grey + (random() - 0.5) * 2 * noise));

      const index = (py * width + px) * 4;
      data[index] = grey;
      data[index + 1] = grey;
      data[index + 2] = grey;
      data[index + 3] = 255;
    }
  }

  return { width, height, data };
}
