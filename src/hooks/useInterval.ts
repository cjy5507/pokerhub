'use client';

import { useEffect, useRef } from 'react';

// ─── Dev-mode timer registry ──────────────────────────────────────

let _activeIntervalCount = 0;

function _devLog(delta: number) {
  if (process.env.NODE_ENV === 'development') {
    _activeIntervalCount += delta;
    // eslint-disable-next-line no-console
    console.debug(`[useInterval] active intervals: ${_activeIntervalCount}`);
  }
}

// ─── useInterval ──────────────────────────────────────────────────

/**
 * A safe setInterval wrapper that:
 * - Always calls the latest callback (no stale closures)
 * - Auto-cleans up on unmount
 * - Pauses when delay is null
 * - Logs active count in dev mode
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(callback);

  // Keep ref current without restarting the interval
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    _devLog(+1);

    return () => {
      clearInterval(id);
      _devLog(-1);
    };
  }, [delay]);
}
