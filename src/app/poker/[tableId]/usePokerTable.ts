'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, SeatState, PlayerAction } from '@/lib/poker/types';
import { usePokerSounds } from '@/lib/poker/sounds';
import { createOptionalClient } from '@/lib/supabase/client';
import { useInterval } from '@/hooks/useInterval';
import { useTurnTimer } from '@/hooks/useCountdown';
import { joinTable, leaveTable, performAction, getTableState, getMyHoleCards } from '../actions';
import { ACTION_LABELS_KR, SEAT_POSITIONS_2, SEAT_POSITIONS_6, SEAT_POSITIONS_9, BET_POSITIONS_2, BET_POSITIONS_6, BET_POSITIONS_9, BET_PRESETS_CONFIG } from './constants';
import type { ActionLogEntry } from './components/PokerHandHistory';

// ─── Helper ───────────────────────────────────────────────────────

function mergeHoleCards(state: GameState, myCards: string[] | null, oddsUserId: string | null): GameState {
  if (!myCards || !oddsUserId) return state;
  return {
    ...state,
    seats: state.seats.map(seat => {
      if (seat && seat.userId === oddsUserId && !seat.holeCards) {
        return { ...seat, holeCards: myCards as any };
      }
      return seat;
    }),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────

export function usePokerTable(
  tableId: string,
  initialState: GameState,
  userId: string | null,
  nickname: string | null,
) {
  // ── State ──────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [heroHoleCards, setHeroHoleCards] = useState<string[] | null>(null);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [lastActions, setLastActions] = useState<Record<number, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [buyInModal, setBuyInModal] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [lastCompletedHandId, setLastCompletedHandId] = useState<string | null>(null);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const [betInputEditing, setBetInputEditing] = useState(false);
  const [betInputText, setBetInputText] = useState('');
  const [preAction, setPreAction] = useState<'fold' | 'check_fold' | 'call' | null>(null);
  const [potBounce, setPotBounce] = useState(false);
  const [winOverlay, setWinOverlay] = useState<{ name: string; amount: number } | null>(null);
  const [newCardsDealt, setNewCardsDealt] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────
  const logIdRef = useRef(0);
  const prevHandIdRef = useRef<string | null>(null);
  const prevCommunityCountRef = useRef(0);
  const prevTurnRef = useRef<number | null>(null);
  const prevLastActionRef = useRef<string | null>(null);
  const prevPotRef = useRef(0);
  const prevTimeLeftRef = useRef(30);
  const lastActionTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const heroHoleCardsRef = useRef<string[] | null>(null);
  const prevCCLengthForAnimRef = useRef(0);
  const newCardStartIndex = useRef(0);
  const lastPreActionRef = useRef<{ handId: string | null; street: string | null }>({ handId: null, street: null });

  // ── Sound system ───────────────────────────────────────────────
  const sounds = usePokerSounds();

  useEffect(() => { sounds.setMuted(isMuted); }, [isMuted, sounds]);

  // ── Derived state ──────────────────────────────────────────────
  const seats = gameState?.seats ?? [];
  const heroSeatIndex = seats.findIndex((s) => s?.userId === userId);
  const heroSeat = heroSeatIndex >= 0 ? seats[heroSeatIndex] : null;
  const isSeated = heroSeatIndex >= 0;
  const isHeroTurn = gameState?.currentSeat !== null && gameState?.currentSeat === heroSeatIndex;
  const isPlaying = gameState?.status === 'playing' && gameState?.handId !== null;
  const isShowdown = gameState?.street === 'showdown';
  const maxSeats = gameState?.maxSeats ?? 6;

  const seatPositions =
    maxSeats === 2 ? SEAT_POSITIONS_2 :
      maxSeats === 9 ? SEAT_POSITIONS_9 : SEAT_POSITIONS_6;
  const betPositions =
    maxSeats === 2 ? BET_POSITIONS_2 :
      maxSeats === 9 ? BET_POSITIONS_9 : BET_POSITIONS_6;

  const minBuyIn = (gameState?.bigBlind ?? 2) * 20;
  const maxBuyIn = (gameState?.bigBlind ?? 2) * 100;

  const callAmount = Math.max(0, gameState.currentBet - (heroSeat?.betInRound ?? 0));
  const canCheck = callAmount === 0;
  const minRaiseTotal = gameState.currentBet > 0
    ? gameState.currentBet + gameState.minRaise
    : gameState.minRaise;
  const maxRaiseTotal = heroSeat?.chipStack ?? 0;
  const pot = gameState.pot;
  const bigBlind = gameState.bigBlind;

  const betPresets = BET_PRESETS_CONFIG.map((preset) => {
    const raw = preset.getValue(pot, maxRaiseTotal);
    const clamped = Math.min(Math.max(raw, minRaiseTotal), maxRaiseTotal);
    const disabled = clamped < bigBlind && preset.label !== '올인';
    return { label: preset.label, value: clamped, disabled };
  });

  // Turn timer (RAF-based, only re-renders on second change)
  const turnTimeLeft = useTurnTimer(
    gameState.currentSeat !== null ? gameState.turnStartedAt : null,
  );

  // ── Effects ────────────────────────────────────────────────────

  useEffect(() => {
    if (isHeroTurn) setRaiseAmount(Math.min(minRaiseTotal, maxRaiseTotal));
  }, [isHeroTurn, minRaiseTotal, maxRaiseTotal]);

  useEffect(() => {
    if (!isHeroTurn) setShowRaiseSlider(false);
  }, [isHeroTurn]);

  useEffect(() => {
    if (!isPlaying || heroSeat?.isFolded) setPreAction(null);
  }, [isPlaying, heroSeat?.isFolded]);

  useEffect(() => {
    if (!isHeroTurn) return;
    if (turnTimeLeft <= 3 && turnTimeLeft > 0 && turnTimeLeft !== prevTimeLeftRef.current) {
      sounds.timerUrgent();
    } else if (turnTimeLeft <= 5 && turnTimeLeft > 3 && turnTimeLeft !== prevTimeLeftRef.current) {
      sounds.timerWarning();
    }
    prevTimeLeftRef.current = turnTimeLeft;
  }, [turnTimeLeft, isHeroTurn, sounds]);

  useEffect(() => {
    if (!gameState.handId || !userId) { setHeroHoleCards(null); return; }
    getMyHoleCards(tableId).then(cards => { if (cards) setHeroHoleCards(cards); });
  }, [gameState.handId, tableId, userId]);

  useEffect(() => { heroHoleCardsRef.current = heroHoleCards; }, [heroHoleCards]);

  // Track community card animation start index
  useEffect(() => {
    const prev = prevCCLengthForAnimRef.current;
    const curr = gameState.communityCards.length;
    if (curr > prev) newCardStartIndex.current = prev;
    prevCCLengthForAnimRef.current = curr;
  }, [gameState.communityCards.length]);

  // ── State update handler ───────────────────────────────────────

  const handleStateUpdate = useCallback((newState: GameState) => {
    if (newState.handId && newState.handId !== prevHandIdRef.current) {
      sounds.newHand();
      setNewCardsDealt(true);
      setTimeout(() => setNewCardsDealt(false), 1500);
      prevCommunityCountRef.current = 0;
      prevCCLengthForAnimRef.current = 0;
      newCardStartIndex.current = 0;
      if (prevHandIdRef.current) setLastCompletedHandId(prevHandIdRef.current);
      prevHandIdRef.current = newState.handId;
    }
    if (!newState.handId && prevHandIdRef.current) {
      setLastCompletedHandId(prevHandIdRef.current);
      prevHandIdRef.current = null;
    }

    const newCCCount = (newState.communityCards ?? []).length;
    if (newCCCount > prevCommunityCountRef.current) {
      const newCards = newCCCount - prevCommunityCountRef.current;
      for (let c = 0; c < newCards; c++) {
        setTimeout(() => { sounds.communityCard(); }, c * 150);
      }
      prevCommunityCountRef.current = newCCCount;
    }

    if (newState.currentSeat !== null && newState.currentSeat !== prevTurnRef.current) {
      const heroIdx = newState.seats.findIndex((s) => s?.userId === userId);
      if (newState.currentSeat === heroIdx) sounds.yourTurn();
      prevTurnRef.current = newState.currentSeat;
    }

    if (newState.pot > prevPotRef.current && prevPotRef.current > 0) {
      setPotBounce(true);
      setTimeout(() => setPotBounce(false), 400);
    }
    prevPotRef.current = newState.pot;

    if (newState.lastAction) {
      const la = newState.lastAction;
      const soundActionId = `${la.seat}-${la.action}-${Date.now()}`;
      if (soundActionId !== prevLastActionRef.current) {
        prevLastActionRef.current = soundActionId;
        switch (la.action) {
          case 'fold': sounds.fold(); break;
          case 'check': sounds.check(); break;
          case 'call': sounds.call(); break;
          case 'bet':
          case 'raise': sounds.raise(); break;
          case 'all_in': sounds.allIn(); break;
        }
      }
      const text = ACTION_LABELS_KR[la.action as string] ?? la.action;
      const display = la.amount > 0 ? `${text} ${la.amount.toLocaleString()}` : text;
      setLastActions(prev => ({ ...prev, [la.seat]: display }));
      const prevTimer = lastActionTimers.current.get(la.seat);
      if (prevTimer) clearTimeout(prevTimer);
      const timer = setTimeout(() => {
        setLastActions(prev => { const next = { ...prev }; delete next[la.seat]; return next; });
        lastActionTimers.current.delete(la.seat);
      }, 3000);
      lastActionTimers.current.set(la.seat, timer);
    }

    setGameState(newState);
  }, [userId, sounds]);

  // ── Supabase Realtime + fallback polling ───────────────────────

  useEffect(() => {
    const supabase = createOptionalClient();
    const channel = supabase?.channel(`poker:${tableId}`) ?? null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let lastUpdateTime = Date.now();
    let pollingIntervalMs = 1000;

    const fetchAndApplyLatestState = async () => {
      try {
        const freshState = await getTableState(tableId);
        if (freshState) { handleStateUpdate(freshState); lastUpdateTime = Date.now(); }
      } catch { /* noop */ }
    };

    const setPollingInterval = (nextMs: number) => {
      if (pollingIntervalMs === nextMs && fallbackTimer) return;
      pollingIntervalMs = nextMs;
      if (fallbackTimer) clearInterval(fallbackTimer);
      fallbackTimer = setInterval(async () => {
        if (Date.now() - lastUpdateTime > pollingIntervalMs) await fetchAndApplyLatestState();
      }, pollingIntervalMs);
    };

    setPollingInterval(1000);

    if (channel) {
      channel
        .on('broadcast', { event: 'game_state' }, (msg) => {
          lastUpdateTime = Date.now();
          const broadcastState = msg.payload?.state as GameState;
          if (broadcastState) {
            const merged = mergeHoleCards(broadcastState, heroHoleCardsRef.current, userId);
            handleStateUpdate(merged);
          }
        })
        .on('broadcast', { event: 'state_changed' }, async () => { await fetchAndApplyLatestState(); })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') { setPollingInterval(15000); return; }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setPollingInterval(1000);
          }
        });
    }

    fetchAndApplyLatestState();

    const actionTimers = lastActionTimers.current;
    return () => {
      if (supabase && channel) supabase.removeChannel(channel);
      if (fallbackTimer) clearInterval(fallbackTimer);
      actionTimers.forEach(t => clearTimeout(t));
      actionTimers.clear();
    };
  }, [tableId, handleStateUpdate, userId]);

  // ── Handlers ───────────────────────────────────────────────────

  const addLogEntry = useCallback((text: string) => {
    const id = ++logIdRef.current;
    setActionLog((prev) => [...prev.slice(-49), { id, text, timestamp: new Date() }]);
  }, []);

  const handleSitDown = useCallback((seatIndex: number) => {
    if (!userId) return;
    setBuyInModal(seatIndex);
  }, [userId]);

  const handleBuyInConfirm = useCallback(async (amount: number) => {
    if (buyInModal === null) return;
    try {
      await joinTable(tableId, buyInModal, amount);
      setBuyInModal(null);
      setGameState(prev => {
        const updated = { ...prev, seats: [...prev.seats] };
        updated.seats[buyInModal] = {
          seatNumber: buyInModal,
          userId: userId!,
          nickname: nickname ?? 'Player',
          chipStack: amount,
          holeCards: null,
          betInRound: 0,
          totalBetInHand: 0,
          isFolded: false,
          isAllIn: false,
          isSittingOut: false,
          isActive: true,
        };
        return updated;
      });
      addLogEntry(`${nickname ?? 'Player'} 좌석 ${buyInModal + 1}에 착석 (${amount.toLocaleString()}P)`);
    } catch (err: any) {
      alert(err.message || '착석할 수 없습니다');
    }
  }, [buyInModal, tableId, userId, nickname, addLogEntry]);

  const handleLeave = useCallback(async () => {
    if (!isSeated || isLeaving) return;
    if (isPlaying && !heroSeat?.isFolded) {
      const confirmed = window.confirm('핸드 진행 중 일어나면 칩을 잃을 수 있습니다. 계속하시겠습니까?');
      if (!confirmed) return;
    }
    setIsLeaving(true);
    try {
      const result = await leaveTable(tableId);
      addLogEntry(`${nickname ?? 'Player'} 퇴장 (${result.chipsReturned.toLocaleString()}P 반환)`);
      setGameState(prev => {
        const updated = { ...prev, seats: [...prev.seats] };
        updated.seats[heroSeatIndex] = null;
        return updated;
      });
    } catch (err: any) {
      alert(err.message || '퇴장할 수 없습니다');
    } finally {
      setIsLeaving(false);
    }
  }, [isSeated, isLeaving, isPlaying, heroSeat, tableId, nickname, heroSeatIndex, addLogEntry]);

  const handleAction = useCallback(async (action: PlayerAction, amount?: number) => {
    if (actionPending || !isHeroTurn) return;
    setActionPending(true);
    try {
      await performAction(tableId, action, amount);
      const actionText =
        action === 'fold' ? '폴드' :
          action === 'check' ? '체크' :
            action === 'call' ? `콜 ${(amount ?? callAmount).toLocaleString()}` :
              action === 'bet' ? `벳 ${(amount ?? 0).toLocaleString()}` :
                action === 'raise' ? `레이즈 ${(amount ?? 0).toLocaleString()}` :
                  `올인 ${(amount ?? 0).toLocaleString()}`;
      addLogEntry(`${nickname ?? 'Player'}: ${actionText}`);
      setShowRaiseSlider(false);
    } catch (err: any) {
      alert(err.message || '액션을 수행할 수 없습니다');
    } finally {
      setActionPending(false);
    }
  }, [actionPending, isHeroTurn, tableId, callAmount, nickname, addLogEntry]);

  // ── Pre-action auto-execute ────────────────────────────────────

  useEffect(() => {
    if (isHeroTurn && preAction && !actionPending) {
      const currentHandId = gameState?.handId ?? null;
      const currentStreet = gameState?.street ?? null;
      if (lastPreActionRef.current.handId === currentHandId &&
        lastPreActionRef.current.street === currentStreet) {
        setPreAction(null);
        return;
      }
      lastPreActionRef.current = { handId: currentHandId, street: currentStreet };
      if (preAction === 'fold') handleAction('fold');
      else if (preAction === 'check_fold') { if (canCheck) handleAction('check'); else handleAction('fold'); }
      else if (preAction === 'call') { if (canCheck) handleAction('check'); else handleAction('call', callAmount); }
      setPreAction(null);
    }
  }, [isHeroTurn, preAction, actionPending, canCheck, callAmount, handleAction, gameState?.handId, gameState?.street]);

  // ── Return ─────────────────────────────────────────────────────

  return {
    // State
    gameState, actionLog, lastActions, showHistory, setShowHistory,
    isMuted, setIsMuted, buyInModal, setBuyInModal,
    isLeaving, actionPending, lastCompletedHandId,
    raiseAmount, setRaiseAmount, showRaiseSlider, setShowRaiseSlider,
    betInputEditing, setBetInputEditing, betInputText, setBetInputText,
    preAction, setPreAction, potBounce, winOverlay, newCardsDealt, turnTimeLeft,
    // Derived
    seats, heroSeatIndex, heroSeat, isSeated, isHeroTurn, isPlaying, isShowdown,
    maxSeats, seatPositions, betPositions, minBuyIn, maxBuyIn,
    callAmount, canCheck, minRaiseTotal, maxRaiseTotal, pot, bigBlind, betPresets,
    // Refs
    newCardStartIndex,
    // Handlers
    handleSitDown, handleBuyInConfirm, handleLeave, handleAction,
  };
}
