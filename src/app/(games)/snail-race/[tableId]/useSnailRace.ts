'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createOptionalClient } from '@/lib/supabase/client';
import { useCountdown } from '@/hooks/useCountdown';
import { syncSnailRaceState, placeSnailRaceBet, clearSnailRaceBets } from '../actions';

type SnailRaceState = 'betting' | 'racing' | 'result';

type RaceHistoryEntry = { first: number; second: number; third: number };

type RaceResult = { seed: string; finishOrder: number[] } | null;

const STATE_SYNC_THROTTLE_MS = 350;

function shallowEqualObject(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) { if (a[key] !== b[key]) return false; }
  return true;
}

function historyEqual(a: RaceHistoryEntry[], b: RaceHistoryEntry[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!a[i] || !b[i]) return false;
    if (a[i].first !== b[i].first || a[i].second !== b[i].second || a[i].third !== b[i].third) return false;
  }
  return true;
}

function raceResultEqual(a: RaceResult, b: RaceResult) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.seed !== b.seed) return false;
  if (a.finishOrder.length !== b.finishOrder.length) return false;
  for (let i = 0; i < a.finishOrder.length; i++) {
    if (a.finishOrder[i] !== b.finishOrder[i]) return false;
  }
  return true;
}

export function useSnailRace(tableId: string, userId: string | null, initialBalance?: number) {
  const [gameState, setGameState] = useState<SnailRaceState>('betting');
  const [phaseEndsAtMs, setPhaseEndsAtMs] = useState(0);
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number>(1000);
  const [balance, setBalance] = useState(initialBalance || 0);
  const [myBets, setMyBets] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<RaceHistoryEntry[]>([]);
  const [raceResult, setRaceResult] = useState<RaceResult>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [participants, setParticipants] = useState<number[]>([]);
  const [odds, setOdds] = useState<Record<number, number>>({});

  const gameStateRef = useRef<SnailRaceState>('betting');
  const roundIdRef = useRef<string | null>(null);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const syncQueuedRef = useRef(false);
  const lastSyncAtRef = useRef(0);

  const raceSoundRef = useRef<HTMLAudioElement | null>(null);
  const finishSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    raceSoundRef.current = new Audio('/sounds/card-slide.mp3');
    finishSoundRef.current = new Audio('/sounds/card-flip.mp3');
    winSoundRef.current = new Audio('/sounds/win.mp3');
  }, []);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const playSound = useCallback((audio: HTMLAudioElement | null) => {
    if (!isMuted && audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
  }, [isMuted]);

  const applyState = useCallback((data: any) => {
    if (!data || !data.table) return;
    const { table, round, serverTime, myBets: betsMap, balance: serverBalance, odds: serverOdds } = data;

    if (gameStateRef.current !== 'result' && table.status === 'result') playSound(winSoundRef.current);
    if (gameStateRef.current !== 'racing' && table.status === 'racing') playSound(raceSoundRef.current);
    if (gameStateRef.current === 'racing' && table.status === 'result') playSound(finishSoundRef.current);

    if (gameStateRef.current !== table.status) {
      gameStateRef.current = table.status;
      setGameState(table.status);
    }

    // Update odds
    if (serverOdds && typeof serverOdds === 'object') {
      setOdds(serverOdds);
    }

    const nextRoundId = table.currentRoundId ?? null;
    if (roundIdRef.current !== nextRoundId) {
      roundIdRef.current = nextRoundId;
      if (table.status === 'betting') {
        setMyBets({});
      }
      setRaceResult(null);
    }

    // Update participants from round
    if (round && Array.isArray(round.participants)) {
      setParticipants(prev => {
        if (prev.length === round.participants.length && prev.every((id: number, i: number) => id === round.participants[i])) return prev;
        return round.participants;
      });
    }

    if (table.status === 'betting' && betsMap !== undefined) {
      const normalizedBetsMap = betsMap ?? {};
      setMyBets(prev => shallowEqualObject(prev, normalizedBetsMap) ? prev : normalizedBetsMap);
    }

    if (serverBalance !== undefined) setBalance(prev => prev === serverBalance ? prev : serverBalance);

    if (Array.isArray(table.history)) {
      setHistory(prev => historyEqual(prev, table.history) ? prev : table.history);
    }

    if (typeof serverTime === 'number') {
      const nextOffset = Math.round(serverTime - Date.now());
      setServerTimeOffsetMs(prev => Math.abs(prev - nextOffset) < 200 ? prev : nextOffset);
    }

    const endsAt = table.phaseEndsAt ? new Date(table.phaseEndsAt).getTime() : 0;
    if (Number.isFinite(endsAt) && endsAt > 0) {
      setPhaseEndsAtMs(prev => prev === endsAt ? prev : endsAt);
    }

    if (round) {
      const nextResult: RaceResult = (round.raceSeed && Array.isArray(round.finishOrder))
        ? { seed: round.raceSeed, finishOrder: round.finishOrder }
        : null;
      setRaceResult(prev => raceResultEqual(prev, nextResult) ? prev : nextResult);
    } else {
      setRaceResult(prev => prev === null ? prev : null);
    }
  }, [playSound]);

  const requestStateSync = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastSyncAtRef.current < STATE_SYNC_THROTTLE_MS) return;
    if (syncInFlightRef.current) { syncQueuedRef.current = true; return syncInFlightRef.current; }

    const runSync = async () => {
      do {
        syncQueuedRef.current = false;
        lastSyncAtRef.current = Date.now();
        try {
          const data = await syncSnailRaceState(tableId);
          if (data && !data.error) applyState(data);
        } catch { /* no-op */ }
      } while (syncQueuedRef.current);
    };

    const task = runSync().finally(() => { syncInFlightRef.current = null; });
    syncInFlightRef.current = task;
    return task;
  }, [tableId, applyState]);

  // Countdown timer (RAF-based via shared hook)
  const timeRemaining = useCountdown(phaseEndsAtMs, serverTimeOffsetMs);

  // Realtime subscription
  useEffect(() => {
    let mounted = true;
    const supabase = createOptionalClient();
    if (!supabase) { void requestStateSync(true); return; }

    const channel = supabase.channel(`snail-race:${tableId}`);
    channel.on('broadcast', { event: 'game_state' }, (payload) => {
      if (mounted) applyState(payload.payload);
    }).subscribe((status) => {
      if (!mounted) return;
      if (status === 'SUBSCRIBED') void requestStateSync(true);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') void requestStateSync(true);
    });

    void requestStateSync(true);

    const onFocus = () => void requestStateSync();
    const onVisible = () => { if (document.visibilityState === 'visible') void requestStateSync(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [tableId, applyState, requestStateSync]);

  // Phase boundary sync
  useEffect(() => {
    if (!phaseEndsAtMs) return;
    const syncedNow = Date.now() + serverTimeOffsetMs;
    const msUntilPhaseEnd = phaseEndsAtMs - syncedNow;
    const jitter = Math.floor(Math.random() * 180);
    const delay = Math.max(120, msUntilPhaseEnd + 80 + jitter);
    const timer = setTimeout(() => void requestStateSync(true), delay);
    return () => clearTimeout(timer);
  }, [phaseEndsAtMs, serverTimeOffsetMs, requestStateSync]);

  const placeBet = useCallback(async (snailId: number) => {
    if (gameState !== 'betting') return;
    try {
      const res = await placeSnailRaceBet(tableId, snailId, selectedChip);
      if (res?.success) {
        // Simple single bet: replace any existing
        setMyBets({ [`win:${snailId}`]: selectedChip });
        if (typeof res.balance === 'number') setBalance(res.balance);
      } else if (res?.error) {
        alert(res.error);
      }
    } catch (err: any) {
      alert(err.message || 'Bet failed');
    }
  }, [gameState, tableId, selectedChip]);

  const clearBets = useCallback(async () => {
    if (gameState !== 'betting') return;
    try {
      const res = await clearSnailRaceBets(tableId);
      if (res && res.success) {
        setMyBets({});
        if (typeof res.balance === 'number') setBalance(res.balance);
      } else if (res && res.error) {
        alert(res.error);
      }
    } catch (err: any) {
      alert(err.message || 'Clear bet failed');
    }
  }, [gameState, tableId]);

  return {
    gameState, timeRemaining, isMuted, setIsMuted,
    selectedChip, setSelectedChip, balance, myBets, history,
    raceResult, isMounted, isDesktop, placeBet, clearBets,
    participants, odds,
  };
}
