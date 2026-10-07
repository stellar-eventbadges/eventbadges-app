import { describe, expect, it, vi } from 'vitest';

import {
  CAMERA_DENIED,
  CAMERA_FAILED,
  CAMERA_MISSING,
  describeCameraFailure,
  grabFrame,
  stopStream,
} from './camera';

/** A rejected `getUserMedia` the way browsers actually throw it: Error with a DOM name. */
function namedError(name: string): Error {
  return Object.assign(new Error(`${name} happened`), { name });
}

describe('describeCameraFailure', () => {
  it('reads a refused camera as permission denied', () => {
    for (const name of ['NotAllowedError', 'PermissionDeniedError', 'SecurityError']) {
      const problem = describeCameraFailure(namedError(name));
      expect(problem, name).toBe(CAMERA_DENIED);
    }
  });

  it('reads a missing camera as no camera found', () => {
    for (const name of [
      'NotFoundError',
      'DevicesNotFoundError',
      'OverconstrainedError',
      'ConstraintNotSatisfiedError',
    ]) {
      const problem = describeCameraFailure(namedError(name));
      expect(problem, name).toBe(CAMERA_MISSING);
    }
  });

  it('never guesses past an error it does not know', () => {
    expect(describeCameraFailure(namedError('AbortError'))).toBe(CAMERA_FAILED);
    expect(describeCameraFailure(new Error('boom'))).toBe(CAMERA_FAILED);
    expect(describeCameraFailure('not an error at all')).toBe(CAMERA_FAILED);
    expect(describeCameraFailure(undefined)).toBe(CAMERA_FAILED);
  });

  it('gives every problem a message and a next action', () => {
    for (const problem of [CAMERA_DENIED, CAMERA_MISSING, CAMERA_FAILED]) {
      expect(problem.message.length).toBeGreaterThan(0);
      expect(problem.nextAction.length).toBeGreaterThan(0);
    }
  });
});

describe('stopStream', () => {
  it('stops every track of the stream', () => {
    const first = { stop: vi.fn() };
    const second = { stop: vi.fn() };
    stopStream({ getTracks: () => [first, second] });
    expect(first.stop).toHaveBeenCalledOnce();
    expect(second.stop).toHaveBeenCalledOnce();
  });

  it('accepts no stream at all', () => {
    expect(() => stopStream(null)).not.toThrow();
  });
});

describe('grabFrame', () => {
  it('returns nothing while there is no picture to grab', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(grabFrame(null, canvas)).toBeNull();
    expect(grabFrame(null, null)).toBeNull();
    expect(grabFrame({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement, canvas)).toBeNull();
    expect(
      grabFrame({ videoWidth: 4, videoHeight: 4 } as HTMLVideoElement, null),
    ).toBeNull();
  });
});
