import { useEffect, useRef, useState } from 'react';

import {
  CAMERA_UNSUPPORTED,
  describeCameraFailure,
  grabFrame,
  stopStream,
  type CameraProblem,
} from '../lib/camera';
import { qrScan } from '../lib/qrScan';

/** How often the preview is checked for a symbol, in milliseconds. */
const SCAN_INTERVAL_MS = 150;

export interface QrScannerProps {
  /**
   * The decoded symbol text. The caller decides what it means: the claim form
   * puts it through exactly the check typed input gets.
   */
  onScan: (text: string) => void;
  /** Closes the scanner without a result. */
  onCancel: () => void;
}

/**
 * The camera half of claiming by scan (draft 02): a live preview that is read
 * frame by frame by the local `qrScan` decoder until a symbol comes out. The
 * component is only ever mounted as the result of an explicit user action
 * (the "Scan the code with the camera" button), and it stops the camera
 * stream on success, on cancel and on unmount — the three ways out all end
 * in `finish`, and stopping twice is harmless.
 *
 * Nothing here decodes anywhere but this device: the frame goes straight to
 * `qrScan`, so scanning makes no network request.
 */
export function QrScanner({ onScan, onCancel }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [scanning, setScanning] = useState(false);

  // The effect below owns the whole camera lifetime and runs once. The
  // caller's `onScan` / `onCancel` callbacks change across renders, so they
  // are read through a ref (set once per render by a tiny non-camera effect)
  // so the main effect can stay mounted for the camera's whole lifetime.
  const onScanRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  // Cancel stops the camera here and now, whether or not the caller unmounts.
  const releaseRef = useRef<() => void>(() => {});

  // Whether the browser offers a camera API at all — nullish on old browsers
  // and on insecure contexts. Derived from the global `navigator`, which is
  // stable for the component's lifetime, so the main effect can read it at
  // call time without a dependency on it.
  useEffect(() => {
    // Derived from the global `navigator` at call time; the effect runs once
    // and never re-runs, so this does not need to be a dependency.
    const mediaDevices: MediaDevices | null =
      typeof navigator.mediaDevices === 'object' &&
      navigator.mediaDevices !== null
        ? navigator.mediaDevices
        : null;
    if (
      mediaDevices === null ||
      typeof mediaDevices.getUserMedia !== 'function'
    ) {
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let finished = false;

    const finish = (): void => {
      if (finished) return;
      finished = true;
      if (timer !== null) window.clearInterval(timer);
      stopStream(stream);
    };

    void mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((opened) => {
        // Cancelled while the permission prompt was still open.
        if (finished) {
          stopStream(opened);
          return;
        }
        stream = opened;
          if (video !== null) video.srcObject = opened;
        setScanning(true);
        timer = window.setInterval(() => {
          const frame = grabFrame(video, canvas);
          if (frame === null) return;
          const text = qrScan(frame);
          if (text === null) return;
          finish();
          onScanRef.current(text);
        }, SCAN_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        if (finished) return;
        setProblem(describeCameraFailure(error));
      });

    releaseRef.current = finish;
    return finish;
  }, []);

  // The camera is unwanted if it can't start at all (old browser / insecure
  // page) — that is known synchronously from `navigator` and shown without
  // any state update, so the unsupported branch never sets state in an effect.
  const unsupportedProblem: CameraProblem | null = typeof navigator.mediaDevices === 'object' &&
    navigator.mediaDevices !== null &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
    ? null
    : CAMERA_UNSUPPORTED;

  return (
    <div className="scanner">
      {/* The preview is a visual aid; status and failures are in text below. */}
      <video
        ref={videoRef}
        className="scanner-preview"
        autoPlay
        muted
        playsInline
        aria-label="Camera preview"
      />
      {/* Carries the pixels to the decoder; never shown. */}
      <canvas ref={canvasRef} hidden />
      {(problem ?? unsupportedProblem) !== null ? (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">{(problem ?? unsupportedProblem)!.message}</p>
          <p>{(problem ?? unsupportedProblem)!.nextAction}</p>
        </div>
      ) : (
        <p className="hint" role="status">
          {scanning
            ? 'Scanning… hold the code up to the camera.'
            : 'Starting the camera…'}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          releaseRef.current();
          onCancel();
        }}
      >
        Cancel
      </button>
    </div>
  );
}
