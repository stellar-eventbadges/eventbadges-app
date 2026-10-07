/**
 * The camera half of draft 02 (`docs/issue-drafts/02-scan-claim-code-with-camera.md`):
 * turns one camera frame into the claim ticket inside it, or `null` when the
 * frame holds nothing readable. Pure pixel logic — no DOM, no network — so it
 * is unit-testable against synthetic frames and cannot make a request.
 *
 * The pipeline is the one every local QR scanner follows: binarise the frame
 * against its own local brightness, find the three 1:1:3:1:1 finder patterns,
 * take the symbol's geometry and orientation from them, sample the module
 * grid, and read the modules with `qrDecode` (which repairs wrong codewords up
 * to the level's Reed–Solomon budget). What is deliberately not implemented:
 * perspective correction beyond a flat affine estimate (a badly tilted symbol
 * may need a second attempt at a different angle), inverted symbols, and
 * multi-symbol scenes — the claim screen shows one ticket at a time.
 */

import { qrDecode, type QrMatrix } from './qr';

/** One camera frame: RGBA pixels, 4 bytes each, row-major (canvas ImageData). */
export interface RasterImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Module grid versions 1..40 can have `version * 4 + 17` modules per side. */
const MIN_DIMENSION = 21;

/**
 * Greyscale, then dark/light against the local mean: a frame's brightness
 * varies across its area (a screen in a dark room, a hand's shadow), so a
 * single global threshold would lose one corner or the other.
 */
function binarize(image: RasterImage): Uint8Array {
  const { width, height, data } = image;

  // Integral image of luminance, for constant-time window means.
  const stride = width + 1;
  const integral = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      // Integer luma: 0.299 R + 0.587 G + 0.114 B, scaled to 0..255.
      rowSum += (data[index] * 77 + data[index + 1] * 150 + data[index + 2] * 29) >> 8;
      integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + rowSum;
    }
  }

  const window = Math.max(4, Math.floor(Math.min(width, height) / 16));
  const dark = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const yTop = Math.max(0, y - window);
    const yBottom = Math.min(height, y + window + 1);
    for (let x = 0; x < width; x += 1) {
      const xLeft = Math.max(0, x - window);
      const xRight = Math.min(width, x + window + 1);
      const sum =
        integral[yBottom * stride + xRight] -
        integral[yTop * stride + xRight] -
        integral[yBottom * stride + xLeft] +
        integral[yTop * stride + xLeft];
      const count = (yBottom - yTop) * (xRight - xLeft);
      const gray =
        (data[(y * width + x) * 4] * 77 +
          data[(y * width + x) * 4 + 1] * 150 +
          data[(y * width + x) * 4 + 2] * 29) >>
        8;
      dark[y * width + x] = gray * count < sum - 5 * count ? 1 : 0;
    }
  }
  return dark;
}

/**
 * Slides a 1:1:3:1:1 run window over one line of the binary image and reports
 * each match's centre and module size. `read` returns 1 for dark.
 */
function scanLineForFinder(
  read: (index: number) => number,
  length: number,
  report: (centre: number, module: number) => void,
): void {
  const runStart: number[] = [];
  const runLength: number[] = [];
  const runDark: number[] = [];
  let x = 0;
  while (x < length) {
    const isDark = read(x);
    let run = 1;
    while (x + run < length && read(x + run) === isDark) run += 1;
    runStart.push(x);
    runLength.push(run);
    runDark.push(isDark);
    x += run;
  }

  for (let i = 2; i + 2 < runDark.length; i += 1) {
    if (
      runDark[i - 2] !== 1 ||
      runDark[i - 1] !== 0 ||
      runDark[i] !== 1 ||
      runDark[i + 1] !== 0 ||
      runDark[i + 2] !== 1
    ) {
      continue;
    }
    const middle = runLength[i];
    const module = middle / 3;
    if (module < 1) continue;
    const near = (value: number): boolean => Math.abs(value - module) <= module * 0.75;
    if (
      !near(runLength[i - 2]) ||
      !near(runLength[i - 1]) ||
      !near(runLength[i + 1]) ||
      !near(runLength[i + 2])
    ) {
      continue;
    }
    report(runStart[i] + middle / 2, module);
  }
}

interface FinderCentre {
  x: number;
  y: number;
  module: number;
  weight: number;
}

/**
 * The three finder patterns' centres, each cross-checked on its column so a
 * stray horizontal 1:1:3:1:1 (a table border, a line of text) is rejected.
 */
function findFinderCentres(dark: Uint8Array, width: number, height: number): FinderCentre[] {
  const clusters: FinderCentre[] = [];

  for (let y = 0; y < height; y += 1) {
    const row = y;
    scanLineForFinder(
      (index) => dark[row * width + index],
      width,
      (centreX, module) => {
        // Cross-check: the column through the centre must show the same
        // pattern, centred on this row.
        let vertical = false;
        scanLineForFinder(
          (index) => (index < height && index >= 0 ? dark[index * width + Math.round(centreX)] : 0),
          height,
          (centreY, verticalModule) => {
            if (Math.abs(centreY - y) <= module * 1.5 && Math.abs(verticalModule - module) <= module) {
              vertical = true;
            }
          },
        );
        if (!vertical) return;

        const centre: FinderCentre = { x: centreX, y, module, weight: 1 };
        const near = clusters.find(
          (cluster) =>
            Math.abs(cluster.x - centre.x) <= cluster.module * 2.5 &&
            Math.abs(cluster.y - centre.y) <= cluster.module * 2.5,
        );
        if (near === undefined) {
          clusters.push(centre);
        } else {
          const weight = near.weight + 1;
          near.x = (near.x * near.weight + centre.x) / weight;
          near.y = (near.y * near.weight + centre.y) / weight;
          near.module = (near.module * near.weight + module) / weight;
          near.weight = weight;
        }
      },
    );
  }

  return clusters.filter((cluster) => cluster.weight >= 2);
}

/**
 * How far a candidate triple is from three finder patterns of one symbol:
 * they share a module size and sit at the corners of a right isosceles
 * triangle (the right angle being the top-left finder). Zero is perfect.
 */
function tripleScore(triple: readonly FinderCentre[]): number {
  const [p, q, r] = triple;
  const meanModule = (p.module + q.module + r.module) / 3;
  if (meanModule <= 0) return Number.POSITIVE_INFINITY;
  const moduleSpread =
    (Math.max(p.module, q.module, r.module) - Math.min(p.module, q.module, r.module)) / meanModule;

  const sides = [
    Math.hypot(q.x - p.x, q.y - p.y),
    Math.hypot(r.x - p.x, r.y - p.y),
    Math.hypot(r.x - q.x, r.y - q.y),
  ].sort((a, b) => a - b);
  const [shortA, shortB, hypotenuse] = sides;
  const shortMean = (shortA + shortB) / 2;
  if (shortMean < meanModule * 2) return Number.POSITIVE_INFINITY;

  const sideSpread = Math.abs(shortA - shortB) / shortMean;
  const ratioError = Math.abs(hypotenuse / (Math.SQRT2 * shortMean) - 1);
  return moduleSpread + sideSpread + ratioError;
}

/**
 * The finder triples worth sampling, best first: real finders out-weigh and
 * out-shape the accidental 1:1:3:1:1 runs that data modules and noise produce,
 * so a frame with extra candidates is no longer thrown away — the geometry
 * decides which three are the symbol's corners.
 */
function chooseFinderTriples(clusters: readonly FinderCentre[]): FinderCentre[][] {
  const triples: { triple: FinderCentre[]; score: number; weight: number }[] = [];
  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      for (let k = j + 1; k < clusters.length; k += 1) {
        const triple = [clusters[i], clusters[j], clusters[k]];
        const score = tripleScore(triple);
        if (score <= 1) {
          triples.push({
            triple,
            score,
            weight: triple[0].weight + triple[1].weight + triple[2].weight,
          });
        }
      }
    }
  }
  triples.sort((a, b) => a.score - b.score || b.weight - a.weight);
  return triples.slice(0, 4).map((entry) => entry.triple);
}

/** The sampled module grid, or null when the frame has no readable symbol. */
function sampleGrid(
  dark: Uint8Array,
  width: number,
  height: number,
  centres: readonly FinderCentre[],
  phaseX: number,
  phaseY: number,
): QrMatrix | null {
  // The right angle of the isoceles finder triangle is the top-left corner.
  const [a, b, c] = centres;
  const pairs: readonly (readonly [FinderCentre, FinderCentre, FinderCentre])[] = [
    [a, b, c],
    [b, c, a],
    [c, a, b],
  ];
  let topLeft = a;
  let otherA = b;
  let otherB = c;
  let longest = -1;
  for (const [p, q, rest] of pairs) {
    const distance = Math.hypot(q.x - p.x, q.y - p.y);
    if (distance > longest) {
      longest = distance;
      topLeft = rest;
      otherA = p;
      otherB = q;
    }
  }

  // Top-right vs bottom-left: the cross product of (right, down) is positive
  // in image coordinates when the triangle is the right way up.
  let topRight = otherA;
  let bottomLeft = otherB;
  const ux = topRight.x - topLeft.x;
  const uy = topRight.y - topLeft.y;
  const vx = bottomLeft.x - topLeft.x;
  const vy = bottomLeft.y - topLeft.y;
  if (ux * vy - uy * vx < 0) {
    [topRight, bottomLeft] = [bottomLeft, topRight];
  }

  // Finder centres sit 3 modules in from the symbol's corner, and the two
  // outer centres are `dimension - 7` modules apart. The clusters' module
  // sizes come from horizontal scanlines, which read wide by 1/cos φ when
  // the symbol is tilted φ away from its nearest axis (a finder pattern
  // looks the same every 90°, so fold the angle into ±45°); shrinking by
  // cos φ keeps the dimension estimate tilt-independent.
  const axisAngle = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
  let tilt = axisAngle % (Math.PI / 2);
  if (tilt > Math.PI / 4) tilt -= Math.PI / 2;
  if (tilt < -Math.PI / 4) tilt += Math.PI / 2;
  const moduleSize =
    ((topLeft.module + topRight.module + bottomLeft.module) / 3) * Math.cos(tilt);
  const edge = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const rawDimension = Math.round(edge / moduleSize) + 7;
  const version = Math.round((rawDimension - 17) / 4);
  const boundedVersion = Math.min(40, Math.max(1, version));
  const dimension = boundedVersion * 4 + 17;
  // The snapped symbol size has to agree with the geometry; a big gap means
  // the finder clusters were not the real ones.
  if (Math.abs(rawDimension - dimension) > 4) return null;

  // Per-module axis vectors, then the symbol's top-left corner.
  const stepXx = (topRight.x - topLeft.x) / (dimension - 7);
  const stepXy = (topRight.y - topLeft.y) / (dimension - 7);
  const stepYx = (bottomLeft.x - topLeft.x) / (dimension - 7);
  const stepYy = (bottomLeft.y - topLeft.y) / (dimension - 7);
  const originX = topLeft.x - 3.5 * stepXx - 3.5 * stepYx;
  const originY = topLeft.y - 3.5 * stepXy - 3.5 * stepYy;

  const modules: boolean[][] = [];
  for (let row = 0; row < dimension; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < dimension; col += 1) {
      const x = originX + (col + 0.5 + phaseX) * stepXx + (row + 0.5 + phaseY) * stepYx;
      const y = originY + (col + 0.5 + phaseX) * stepXy + (row + 0.5 + phaseY) * stepYy;
      // A 3x3 majority vote around the module centre keeps single noisy
      // pixels from flipping a module.
      let votes = 0;
      for (const offset of [-0.3, 0, 0.3]) {
        const sx = Math.round(x + offset * stepXx);
        const sy = Math.round(y + offset * stepXy);
        if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        votes += dark[sy * width + sx];
        const sx2 = Math.round(x + offset * stepYx);
        const sy2 = Math.round(y + offset * stepYy);
        if (sx2 >= 0 && sy2 >= 0 && sx2 < width && sy2 < height) {
          votes += dark[sy2 * width + sx2];
        }
      }
      line.push(votes * 2 > 5);
    }
    modules.push(line);
  }
  return { size: dimension, modules };
}

/**
 * Decodes the QR symbol in one frame. Returns the payload text, or `null` if
 * no readable symbol is found — the caller (the scanner UI) keeps looking.
 * The payload is returned as text, not validated: deciding whether it is a
 * claim ticket is the claim form's job, through the same check typed input
 * gets.
 */
export function qrScan(image: RasterImage): string | null {
  const { width, height } = image;
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) return null;

  const dark = binarize(image);
  const triples = chooseFinderTriples(findFinderCentres(dark, width, height));

  // Small sampling-phase shifts: the module grid estimate is close but not
  // exact, and one of these lands inside every module more often than not.
  const phases: readonly (readonly [number, number])[] = [
    [0, 0],
    [0.25, 0.25],
    [-0.25, 0.25],
    [0.25, -0.25],
    [-0.25, -0.25],
  ];
  for (const centres of triples) {
    for (const [phaseX, phaseY] of phases) {
      const grid = sampleGrid(dark, width, height, centres, phaseX, phaseY);
      if (grid === null) continue;
      try {
        return qrDecode(grid);
      } catch {
        // Not the right grid after all (or not a byte-mode symbol): try the
        // next phase, then the next triple, then give up on this frame.
      }
    }
  }
  return null;
}
