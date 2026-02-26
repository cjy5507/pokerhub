'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createOptionalClient } from '@/lib/supabase/client';
import { useCountdown } from '@/hooks/useCountdown';
import { syncBaccaratState, placeBaccaratBet, clearBaccaratBets } from '../actions';

type BaccaratState = 'waiting' | 'betting' | 'dealing' | 'result';
type BetZone = 'player' | 'banker' | 'tie' | 'player_pair' | 'banker_pair';

const PHASE_DEALING_MS = 5000;
const CARD_REVEAL_INTERVAL_MS = 800;
const CARD_DEAL_SOUND_INTERVAL_MS = 200;
const STATE_SYNC_THROTTLE_MS = 350;

function shallowEqualObject(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) { if (a[key] !== b[key]) return false; }
  return true;
}

function shallowEqualArray(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
  return true;
}

function cardsEqual(a: any[], b: any[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!a[i] || !b[i]) return false;
    if (a[i].suit !== b[i].suit || a[i].value !== b[i].value || a[i].score !== b[i].score) return false;
  }
  return true;
}

export function useBaccaratGame(tableId: string, userId: string | null, initialBalance?: number) {
  const [gameState, setGameState] = useState<BaccaratState>('betting');
  const [phaseEndsAtMs, setPhaseEndsAtMs] = useState(0);
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number>(1000);
  const [balance, setBalance] = useState(initialBalance || 0);
  const [myBets, setMyBets] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [playerCards, setPlayerCards] = useState<any[]>([]);
  const [bankerCards, setBankerCards] = useState<any[]>([]);
  const [playerScore, setPlayerScore] = useState<number | null>(null);
  const [bankerScore, setBankerScore] = useState<number | null>(null);
  const [revealedCards, setRevealedCards] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const gameStateRef = useRef<BaccaratState>('betting');
  const roundIdRef = useRef<string | null>(null);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const syncQueuedRef = useRef(false);
  const lastSyncAtRef = useRef(0);

  const chipSoundRef = useRef<HTMLAudioElement | null>(null);
  const dealSoundRef = useRef<HTMLAudioElement | null>(null);
  const flipSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    chipSoundRef.current = new Audio('/sounds/chip.mp3');
    dealSoundRef.current = new Audio('/sounds/card-slide.mp3');
    flipSoundRef.current = new Audio('/sounds/card-flip.mp3');
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
    const { table, round, serverTime, myBets: betsMap, balance: serverBalance } = data;

    if (gameStateRef.current !== 'result' && table.status === 'result') playSound(winSoundRef.current);

    if (gameStateRef.current !== table.status) {
      gameStateRef.current = table.status;
      setGameState(table.status);
    }

    const nextRoundId = table.currentRoundId ?? null;
    if (roundIdRef.current !== nextRoundId) {
      roundIdRef.current = nextRoundId;
      if (table.status === 'betting' && betsMap === undefined) {
        setMyBets(prev => Object.keys(prev).length === 0 ? prev : {});
      }
    }

    if (table.status === 'betting' && betsMap !== undefined) {
      const normalizedBetsMap = betsMap ?? {};
      setMyBets(prev => shallowEqualObject(prev, normalizedBetsMap) ? prev : normalizedBetsMap);
    }

    if (serverBalance !== undefined) setBalance(prev => prev === serverBalance ? prev : serverBalance);

    if (Array.isArray(table.history)) {
      setHistory(prev => shallowEqualArray(prev, table.history) ? prev : table.history);
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
      const nextPlayerCards = round.playerCards || [];
      const nextBankerCards = round.bankerCards || [];
      setPlayerCards(prev => cardsEqual(prev, nextPlayerCards) ? prev : nextPlayerCards);
      setBankerCards(prev => cardsEqual(prev, nextBankerCards) ? prev : nextBankerCards);
      setPlayerScore(prev => prev === round.playerScore ? prev : round.playerScore);
      setBankerScore(prev => prev === round.bankerScore ? prev : round.bankerScore);
    } else {
      setPlayerCards(prev => prev.length === 0 ? prev : []);
      setBankerCards(prev => prev.length === 0 ? prev : []);
      setPlayerScore(prev => prev === null ? prev : null);
      setBankerScore(prev => prev === null ? prev : null);
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
          const data = await syncBaccaratState(tableId);
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

    const channel = supabase.channel(`baccarat:${tableId}`);
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

  // Card reveal logic
  useEffect(() => {
    const totalCards = playerCards.length + bankerCards.length;
    if (totalCards === 0) { setRevealedCards(0); return; }
    if (gameState === 'result') { setRevealedCards(totalCards); return; }
    if (gameState !== 'dealing') { setRevealedCards(0); return; }

    const syncedNow = Date.now() + serverTimeOffsetMs;
    const dealingStartedAt = phaseEndsAtMs > 0 ? (phaseEndsAtMs - PHASE_DEALING_MS) : syncedNow;
    const elapsedMs = Math.max(0, syncedNow - dealingStartedAt);
    const alreadyRevealed = Math.min(totalCards, Math.floor(elapsedMs / CARD_REVEAL_INTERVAL_MS));

    setRevealedCards(prev => prev === alreadyRevealed ? prev : alreadyRevealed);

    const timers: NodeJS.Timeout[] = [];
    for (let i = alreadyRevealed; i < totalCards; i++) {
      const dealDelay = Math.max(0, (i * CARD_DEAL_SOUND_INTERVAL_MS + 100) - elapsedMs);
      timers.push(setTimeout(() => playSound(dealSoundRef.current), dealDelay));
      const revealDelay = Math.max(0, ((i + 1) * CARD_REVEAL_INTERVAL_MS) - elapsedMs);
      timers.push(setTimeout(() => {
        setRevealedCards(prev => Math.max(prev, i + 1));
        playSound(flipSoundRef.current);
      }, revealDelay));
    }
    return () => timers.forEach(clearTimeout);
  }, [gameState, playerCards, bankerCards, phaseEndsAtMs, serverTimeOffsetMs, playSound]);

  const placeBet = useCallback(async (zone: BetZone) => {
    if (gameState !== 'betting') return;
    playSound(chipSoundRef.current);
    try {
      const res = await placeBaccaratBet(tableId, zone, selectedChip);
      if (res && res.success) {
        setMyBets(prev => ({ ...prev, [zone]: (prev[zone] || 0) + selectedChip }));
        if (typeof res.balance === 'number') setBalance(res.balance);
      } else if (res && res.error) {
        alert(res.error);
      }
    } catch (err: any) {
      alert(err.message || 'Bet failed');
    }
  }, [gameState, playSound, tableId, selectedChip]);

  const clearBets = useCallback(async () => {
    if (gameState !== 'betting') return;
    try {
      const res = await clearBaccaratBets(tableId);
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
    playerCards, bankerCards, playerScore, bankerScore,
    revealedCards, isMounted, isDesktop, placeBet, clearBets,
  };
}
