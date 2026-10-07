/**
 * Camera plumbing for the scanner (draft 02): the reviewed wording for every
 * way camera startup can fail, and the small pieces that stop a stream and
 * grab one frame from the preview.
 *
 * The contract's `ERRORS.md` covers contract codes only, so — like
 * `WRONG_NETWORK_MESSAGE` in `contractErrors.ts` — the strings below are
 * app-level wording defined here and reviewed with the feature, not copied
 * from `docs/contract-errors.md`. They follow the same house style: say what
 * happened in one sentence, then say what to do about it.
 *
 * Nothing here touches the network: frames are decoded locally by `qrScan`.
 */

import type { RasterImage } from './qrScan';

export interface CameraProblem {
  readonly message: string;
  readonly nextAction: string;
}

/** The browser (or the user) refused camera access. */
export const CAMERA_DENIED: CameraProblem = {
  message: 'This page is not allowed to use the camera.',
  nextAction:
    'Allow camera access for this page in your browser settings and try again — or paste the code by hand.',
};

/** No camera device exists to open. */
export const CAMERA_MISSING: CameraProblem = {
  message: 'No camera was found on this device.',
  nextAction: 'Paste the code by hand, or try again on a device with a camera.',
};

/** No camera API at all: an old browser, or a page that is not a secure context. */
export const CAMERA_UNSUPPORTED: CameraProblem = {
  message: 'This browser cannot open the camera here.',
  nextAction:
    'Camera access needs a secure page (https or localhost). Paste the code by hand for now.',
};

/** The camera exists but would not start; keep the cause out of the wording. */
export const CAMERA_FAILED: CameraProblem = {
  message: 'The camera could not be started.',
  nextAction: 'Paste the code by hand, or close other apps using the camera and try again.',
};

/**
 * Maps whatever `getUserMedia` rejected with to the reviewed wording. The
 * DOM exception names are matched by name because browsers disagree about
 * which constructor they throw; anything unrecognised becomes the generic
 * failure rather than a message that guesses wrong.
 */
export function describeCameraFailure(error: unknown): CameraProblem {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return CAMERA_DENIED;
  }
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError' ||
    name === 'ConstraintNotSatisfiedError'
  ) {
    return CAMERA_MISSING;
  }
  return CAMERA_FAILED;
}

/** The structural shape `stopStream` needs — a real `MediaStream` fits it. */
export interface StreamLike {
  getTracks(): readonly { stop(): void }[];
}

/**
 * Releases every track of a camera stream. Stopping is idempotent and null is
 * accepted, so the scanner can call this on success, on cancel and on unmount
 * without bookkeeping about which one already ran.
 */
export function stopStream(stream: StreamLike | null): void {
  if (stream === null) return;
  for (const track of stream.getTracks()) track.stop();
}

/**
 * Copies the current preview picture into an RGBA frame the decoder can read.
 * Returns null while the video has no picture yet (or the canvas is gone):
 * the scanner just tries again on its next tick.
 */
export function grabFrame(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null,
): RasterImage | null {
  if (video === null || canvas === null) return null;
  const width = video.videoWidth;
  const height = video.videoHeight;
  // Zero in a real browser before the first frame; falsy in test DOMs.
  if (!width || !height) return null;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) return null;
  context.drawImage(video, 0, 0, width, height);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}
