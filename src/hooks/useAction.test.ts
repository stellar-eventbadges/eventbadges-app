// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONTRACT_ERRORS } from '../lib/contractErrors';
import { useAction } from './useAction';

afterEach(cleanup);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useAction', () => {
  it('drops duplicate submissions synchronously', async () => {
    const pending = deferred<string>();
    const { result } = renderHook(() => useAction<string>());
    const duplicate = vi.fn(async () => 'duplicate');
    let first!: Promise<string | undefined>;
    act(() => { first = result.current.run(() => pending.promise); });
    expect(await result.current.run(duplicate)).toBeUndefined();
    expect(duplicate).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(true);
    await act(async () => {
      pending.resolve('done');
      expect(await first).toBe('done');
    });
    expect(result.current.result).toBe('done');
    expect(result.current.busy).toBe(false);
  });

  it('abandons a reset result without allowing another task before it settles', async () => {
    const pending = deferred<string>();
    const { result } = renderHook(() => useAction<string>());
    let first!: Promise<string | undefined>;
    act(() => { first = result.current.run(() => pending.promise); });
    act(() => result.current.reset());
    const duplicate = vi.fn(async () => 'duplicate');
    expect(await result.current.run(duplicate)).toBeUndefined();
    expect(duplicate).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(true);
    await act(async () => {
      pending.resolve('abandoned');
      expect(await first).toBeUndefined();
    });
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
    await act(async () => { await result.current.run(async () => 'fresh'); });
    expect(result.current.result).toBe('fresh');
  });

  it('suppresses a reset failure and releases the duplicate guard', async () => {
    const pending = deferred<string>();
    const { result } = renderHook(() => useAction<string>());
    let first!: Promise<string | undefined>;
    act(() => { first = result.current.run(() => pending.promise); });
    act(() => result.current.reset());
    await act(async () => {
      pending.reject(new Error('HostError: Error(Contract, #1)'));
      expect(await first).toBeUndefined();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
    await act(async () => { await result.current.run(async () => 'fresh'); });
    expect(result.current.result).toBe('fresh');
  });

  it('clears previous results on retry and maps a current failure', async () => {
    const pending = deferred<string>();
    const { result } = renderHook(() => useAction<string>());
    await act(async () => { await result.current.run(async () => 'old'); });
    let retry!: Promise<string | undefined>;
    act(() => { retry = result.current.run(() => pending.promise); });
    expect(result.current.result).toBeNull();
    await act(async () => {
      pending.reject(new Error('HostError: Error(Contract, #1)'));
      await retry;
    });
    expect(result.current.error?.message).toBe(CONTRACT_ERRORS[1]?.message);
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it('returns no abandoned value after unmount', async () => {
    const pending = deferred<string>();
    const { result, unmount } = renderHook(() => useAction<string>());
    let task!: Promise<string | undefined>;
    act(() => { task = result.current.run(() => pending.promise); });
    unmount();
    pending.resolve('abandoned');
    expect(await task).toBeUndefined();
  });
});
