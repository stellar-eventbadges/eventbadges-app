import { useCallback, useRef, useState } from 'react';

import { describeContractError, type MappedError } from '../lib/contractErrors';

export interface ActionState<T> {
  readonly busy: boolean;
  readonly error: MappedError | null;
  readonly result: T | null;
  run: (task: () => Promise<T>) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Runs an async task and exposes `busy / error / result` for the UI. Every
 * failure is passed through `describeContractError`, so contract codes always
 * arrive as the reviewed wording from `ERRORS.md`.
 *
 * A `busyRef` blocks duplicate submission: if `run` is called while a task is
 * already in flight the call is dropped immediately. A `generation` counter
 * ensures a stale result from an abandoned task can never overwrite state set
 * by a later one.
 */
export function useAction<T>(): ActionState<T> {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MappedError | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const busyRef = useRef(false);
  const generationRef = useRef(0);

  const run = useCallback(async (task: () => Promise<T>): Promise<T | undefined> => {
    if (busyRef.current) return undefined;
    busyRef.current = true;
    const generation = ++generationRef.current;
    setBusy(true);
    setError(null);
    try {
      const value = await task();
      if (generation === generationRef.current) setResult(value);
      return value;
    } catch (thrown) {
      if (generation === generationRef.current) {
        setResult(null);
        setError(describeContractError(thrown));
      }
      return undefined;
    } finally {
      if (generation === generationRef.current) {
        setBusy(false);
        busyRef.current = false;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { busy, error, result, run, reset };
}
