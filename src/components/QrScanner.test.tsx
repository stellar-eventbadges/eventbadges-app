// @vitest-environment happy-dom
// The camera is mocked; everything from the frame to the decoded text is the
// real decoder running over real pixels rasterised by `src/test/qrRaster.ts`.
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/camera', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/camera')>();
  return { ...original, grabFrame: vi.fn() };
});

import {
  CAMERA_DENIED,
  CAMERA_MISSING,
  CAMERA_UNSUPPORTED,
  grabFrame,
} from '../lib/camera';
import { qrEncode } from '../lib/qr';
import type { RasterImage } from '../lib/qrScan';
import { rasterizeQr } from '../test/qrRaster';
import { renderOnly, renderWithA11y } from '../test/render';

import { QrScanner } from './QrScanner';

const CLAIM_CODE = '0123456789abcdef'.repeat(4);

/**
 * A camera stream whose release the test can watch. A real `MediaStream`
 * instance — happy-dom (like browsers) refuses a `srcObject` that is not one —
 * with its track list swapped for a stop spy.
 */
function fakeStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  const stream = new MediaStream();
  stream.getTracks = () => [{ stop } as unknown as MediaStreamTrack];
  return { stream, stop };
}

let getUserMedia: ReturnType<typeof vi.fn>;

function frameWith(text: string): RasterImage {
  return rasterizeQr(qrEncode(text, 'L'), { modulePixels: 4 });
}

/** A frame with pixels but nothing to find: a blank page. */
function blankFrame(): RasterImage {
  const width = 120;
  const height = 120;
  return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) };
}

beforeEach(() => {
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
});

afterEach(() => {
  vi.mocked(grabFrame).mockReset();
  Reflect.deleteProperty(navigator, 'mediaDevices');
});

describe('<QrScanner />', () => {
  it('decodes the claim code out of camera frames and then releases the camera', async () => {
    const { stream, stop } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(grabFrame).mockReturnValue(frameWith(CLAIM_CODE));
    const onScan = vi.fn();

    const view = await renderWithA11y(<QrScanner onScan={onScan} onCancel={() => {}} />);
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });

    await vi.waitFor(() => expect(onScan).toHaveBeenCalledWith(CLAIM_CODE));
    expect(onScan).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalled();
    expect(view.queryByLabelText('Camera preview')).not.toBeNull();
  });

  it('keeps looking while frames hold no symbol', async () => {
    const { stream } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(grabFrame)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(blankFrame())
      .mockReturnValueOnce(frameWith(CLAIM_CODE));
    const onScan = vi.fn();

    await renderWithA11y(<QrScanner onScan={onScan} onCancel={() => {}} />);

    await vi.waitFor(() => expect(onScan).toHaveBeenCalledWith(CLAIM_CODE));
    expect(vi.mocked(grabFrame).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('releases the camera when the attendee cancels', async () => {
    const { stream, stop } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(grabFrame).mockReturnValue(null);
    const onCancel = vi.fn();
    const user = userEvent.setup();

    const view = await renderWithA11y(<QrScanner onScan={() => {}} onCancel={onCancel} />);
    await user.click(view.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalled();
  });

  it('releases the camera when the scanner is unmounted', async () => {
    const { stream, stop } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(grabFrame).mockReturnValue(null);

    const view = await renderWithA11y(<QrScanner onScan={() => {}} onCancel={() => {}} />);
    await vi.waitFor(() => expect(vi.mocked(grabFrame)).toHaveBeenCalled());
    view.unmount();

    expect(stop).toHaveBeenCalled();
  });

  it('releases a camera that answered after the scanner was closed', async () => {
    const { stream, stop } = fakeStream();
    let opened: (stream: MediaStream) => void = () => {};
    getUserMedia.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        opened = resolve;
      }),
    );
    vi.mocked(grabFrame).mockReturnValue(null);
    const user = userEvent.setup();

    const view = await renderWithA11y(<QrScanner onScan={() => {}} onCancel={() => {}} />);
    await user.click(view.getByRole('button', { name: 'Cancel' }));
    opened(stream);
    await vi.waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it('shows the reviewed wording when camera access is denied', async () => {
    getUserMedia.mockRejectedValue(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
    );
    const onScan = vi.fn();

    const view = await renderWithA11y(<QrScanner onScan={onScan} onCancel={() => {}} />);
    const alert = await view.findByRole('alert');

    expect(alert.textContent).toContain(CAMERA_DENIED.message);
    expect(alert.textContent).toContain(CAMERA_DENIED.nextAction);
    expect(onScan).not.toHaveBeenCalled();
  });

  it('shows the reviewed wording when there is no camera to open', async () => {
    getUserMedia.mockRejectedValue(
      Object.assign(new Error('none'), { name: 'NotFoundError' }),
    );

    const view = renderOnly(<QrScanner onScan={() => {}} onCancel={() => {}} />);
    const alert = await view.findByRole('alert');

    expect(alert.textContent).toContain(CAMERA_MISSING.message);
    expect(alert.textContent).toContain(CAMERA_MISSING.nextAction);
  });

  it('shows the reviewed wording when the browser has no camera at all', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });

    const view = renderOnly(<QrScanner onScan={() => {}} onCancel={() => {}} />);
    const alert = await view.findByRole('alert');

    expect(alert.textContent).toContain(CAMERA_UNSUPPORTED.message);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
