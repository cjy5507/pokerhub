'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Dev-mode registry ────────────────────────────────────────────

let _activeRafCount = 0;

function _devLog(delta: number) {
  if (process.env.NODE_ENV === 'development') {
    _activeRafCount += delta;
    // eslint-disable-next-line no-console
    console.debug(`[useCountdown] active RAF timers: ${_activeRafCount}`);
  }
}

// ─── useCountdown ─────────────────────────────────────────────────

/**
 * Smooth countdown timer using requestAnimationFrame.
 * Returns seconds remaining (integer). Only triggers re-renders when
 * the second value changes, not on every animation frame.
 *
 * @param phaseEndsAtMs - Unix timestamp (ms) when the phase ends
 * @param serverTimeOffsetMs - Offset between server and client clocks
 * @returns seconds remaining (0 when expired)
 */
export function useCountdown(phaseEndsAtMs: number, serverTimeOffsetMs = 0): number {
  const computeRemaining = () => {
    if (!phaseEndsAtMs) return 0;
    const syncedNow = Date.now() + serverTimeOffsetMs;
    return Math.max(0, Math.floor((phaseEndsAtMs - syncedNow) / 1000));
  };

  const [seconds, setSeconds] = useState(computeRemaining);
  const rafRef = useRef<number | null>(null);
  const prevSecondsRef = useRef(seconds);

  useEffect(() => {
    if (!phaseEndsAtMs) {
      setSeconds(0);
      return;
    }

    _devLog(+1);

    const tick = () => {
      const remaining = computeRemaining();
      if (remaining !== prevSecondsRef.current) {
        prevSecondsRef.current = remaining;
        setSeconds(remaining);
      }
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      _devLog(-1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseEndsAtMs, serverTimeOffsetMs]);

  return seconds;
}

// ─── useTurnTimer ─────────────────────────────────────────────────

/**
 * Client-side turn timer based on a server-issued start timestamp.
 * Uses requestAnimationFrame for smooth progress bars.
 *
 * @param turnStartedAt - ISO timestamp string when current player's turn began
 * @param turnDurationSecs - Total seconds allowed per turn (default: 30)
 * @returns seconds remaining (integer)
 */
export function useTurnTimer(turnStartedAt: string | null, turnDurationSecs = 30): number {
  const [timeLeft, setTimeLeft] = useState(turnDurationSecs);
  const rafRef = useRef<number | null>(null);
  const prevTimeLeftRef = useRef(turnDurationSecs);

  useEffect(() => {
    if (!turnStartedAt) {
      setTimeLeft(turnDurationSecs);
      prevTimeLeftRef.current = turnDurationSecs;
      return;
    }

    const startMs = new Date(turnStartedAt).getTime();
    _devLog(+1);

    const tick = () => {
      const elapsed = (Date.now() - startMs) / 1000;
      const remaining = Math.max(0, Math.ceil(turnDurationSecs - elapsed));
      if (remaining !== prevTimeLeftRef.current) {
        prevTimeLeftRef.current = remaining;
        setTimeLeft(remaining);
      }
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      _devLog(-1);
    };
  }, [turnStartedAt, turnDurationSecs]);

  return timeLeft;
}
