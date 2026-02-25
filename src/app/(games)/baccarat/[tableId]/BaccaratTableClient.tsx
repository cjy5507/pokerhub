'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX, Info } from 'lucide-react';
import Link from 'next/link';
import { createOptionalClient } from '@/lib/supabase/client';
import { syncBaccaratState, placeBaccaratBet, clearBaccaratBets } from '../actions';

// Components
import { BaccaratDealer } from './components/BaccaratDealer';
import { BaccaratBettingGrid } from './components/BaccaratBettingGrid';
import { BaccaratRoadmap } from './components/BaccaratRoadmap';

type BaccaratState = 'waiting' | 'betting' | 'dealing' | 'result';
type BetZone = 'player' | 'banker' | 'tie' | 'player_pair' | 'banker_pair';

const PHASE_DEALING_MS = 5000;
const CARD_REVEAL_INTERVAL_MS = 800;
const CARD_DEAL_SOUND_INTERVAL_MS = 200;
const STATE_SYNC_THROTTLE_MS = 350;

interface BaccaratTableClientProps {
    tableId: string;
    userId: string | null;
    nickname: string | null;
    initialBalance?: number;
}

function shallowEqualObject(a: Record<string, number>, b: Record<string, number>) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
        if (a[key] !== b[key]) return false;
    }
    return true;
}

function shallowEqualArray(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function cardsEqual(a: any[], b: any[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (!a[i] || !b[i]) return false;
        if (a[i].suit !== b[i].suit || a[i].value !== b[i].value || a[i].score !== b[i].score) {
            return false;
        }
    }
    return true;
}

export function BaccaratTableClient({ tableId, userId, nickname, initialBalance }: BaccaratTableClientProps) {
    const [gameState, setGameState] = useState<BaccaratState>('betting');
    const [timeRemaining, setTimeRemaining] = useState(15);
    const [phaseEndsAtMs, setPhaseEndsAtMs] = useState(0);
    const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [selectedChip, setSelectedChip] = useState<number>(1000); // 1k

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

    // Audio Refs using HTML Audio for simplicity and preloading
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

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 1280px)');
        const handleChange = () => setIsDesktop(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    const playSound = useCallback((audio: HTMLAudioElement | null) => {
        if (!isMuted && audio) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
        }
    }, [isMuted]);

    const applyState = useCallback((data: any) => {
        if (!data || !data.table) return;
        const { table, round, serverTime, myBets: betsMap, balance: serverBalance } = data;

        // Transition logic for sounds
        if (gameStateRef.current !== 'result' && table.status === 'result') {
            playSound(winSoundRef.current);
        }

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

        if (serverBalance !== undefined) {
            setBalance(prev => prev === serverBalance ? prev : serverBalance);
        }

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
            if (typeof serverTime === 'number') {
                const diff = Math.max(0, Math.floor((endsAt - serverTime) / 1000));
                setTimeRemaining(prev => prev === diff ? prev : diff);
            }
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
        if (!force && now - lastSyncAtRef.current < STATE_SYNC_THROTTLE_MS) {
            return;
        }

        if (syncInFlightRef.current) {
            syncQueuedRef.current = true;
            return syncInFlightRef.current;
        }

        const runSync = async () => {
            do {
                syncQueuedRef.current = false;
                lastSyncAtRef.current = Date.now();
                try {
                    const data = await syncBaccaratState(tableId);
                    if (data && !data.error) {
                        applyState(data);
                    }
                } catch {
                    // no-op
                }
            } while (syncQueuedRef.current);
        };

        const task = runSync().finally(() => {
            syncInFlightRef.current = null;
        });
        syncInFlightRef.current = task;
        return task;
    }, [tableId, applyState]);

    // Countdown timer
    useEffect(() => {
        if (!phaseEndsAtMs) return;

        const updateCountdown = () => {
            const syncedNow = Date.now() + serverTimeOffsetMs;
            const diff = Math.max(0, Math.floor((phaseEndsAtMs - syncedNow) / 1000));
            setTimeRemaining(prev => prev === diff ? prev : diff);
        };

        updateCountdown();
        const timer = setInterval(() => {
            updateCountdown();
        }, 1000);
        return () => clearInterval(timer);
    }, [phaseEndsAtMs, serverTimeOffsetMs]);

    // Realtime Subs
    useEffect(() => {
        let mounted = true;
        const supabase = createOptionalClient();
        if (!supabase) {
            void requestStateSync(true);
            return;
        }

        const channel = supabase.channel(`baccarat:${tableId}`);
        channel.on('broadcast', { event: 'game_state' }, (payload) => {
            if (mounted) {
                applyState(payload.payload);
            }
        }).subscribe((status) => {
            if (!mounted) return;
            if (status === 'SUBSCRIBED') {
                void requestStateSync(true);
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                void requestStateSync(true);
            }
        });

        void requestStateSync(true);

        const onFocus = () => {
            void requestStateSync();
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                void requestStateSync();
            }
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            mounted = false;
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisible);
            supabase.removeChannel(channel);
        };
    }, [tableId, applyState, requestStateSync]);

    // Phase boundary sync scheduler (no polling loop)
    useEffect(() => {
        if (!phaseEndsAtMs) return;

        const syncedNow = Date.now() + serverTimeOffsetMs;
        const msUntilPhaseEnd = phaseEndsAtMs - syncedNow;
        const jitter = Math.floor(Math.random() * 180);
        const delay = Math.max(120, msUntilPhaseEnd + 80 + jitter);

        const timer = setTimeout(() => {
            void requestStateSync(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [phaseEndsAtMs, serverTimeOffsetMs, requestStateSync]);

    // Sequentially Deal and Reveal logic
    useEffect(() => {
        const totalCards = playerCards.length + bankerCards.length;

        if (totalCards === 0) {
            setRevealedCards(0);
            return;
        }

        if (gameState === 'result') {
            setRevealedCards(totalCards);
            return;
        }

        if (gameState !== 'dealing') {
            setRevealedCards(0);
            return;
        }

        const syncedNow = Date.now() + serverTimeOffsetMs;
        const dealingStartedAt = phaseEndsAtMs > 0 ? (phaseEndsAtMs - PHASE_DEALING_MS) : syncedNow;
        const elapsedMs = Math.max(0, syncedNow - dealingStartedAt);
        const alreadyRevealed = Math.min(totalCards, Math.floor(elapsedMs / CARD_REVEAL_INTERVAL_MS));

        setRevealedCards(prev => prev === alreadyRevealed ? prev : alreadyRevealed);

        const timers: NodeJS.Timeout[] = [];
        for (let i = alreadyRevealed; i < totalCards; i++) {
            const dealDelay = Math.max(0, (i * CARD_DEAL_SOUND_INTERVAL_MS + 100) - elapsedMs);
            timers.push(setTimeout(() => {
                playSound(dealSoundRef.current);
            }, dealDelay));

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
                if (typeof res.balance === 'number') {
                    setBalance(res.balance);
                }
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
                if (typeof res.balance === 'number') {
                    setBalance(res.balance);
                }
            } else if (res && res.error) {
                alert(res.error);
            }
        } catch (err: any) {
            alert(err.message || 'Clear bet failed');
        }
    }, [gameState, tableId]);

    if (!isMounted) {
        return (
            <div className="w-full flex-1 min-h-[600px] h-[calc(100vh-120px)] bg-[#1a1c20] rounded-xl flex items-center justify-center border border-white/10 shadow-2xl transition-colors">
                <div className="animate-pulse text-white/50 text-sm font-bold tracking-widest">LOADING TABLE...</div>
            </div>
        );
    }

    return (
        <div className="w-full flex-1 min-h-[600px] h-[calc(100vh-120px)] bg-[#1a1c20] rounded-xl flex flex-col overflow-hidden select-none relative font-sans text-white border border-white/10 shadow-2xl transition-colors">

            {/* Professional Dark Casino Background */}
            <div className="absolute inset-0 pointer-events-none transition-colors bg-[radial-gradient(circle_at_50%_0%,#374151_0%,#1a1c20_60%)] opacity-80" />

            {/* Soft grid overlay for table texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* TOP BAR */}
            <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 z-30 border-b border-white/5 bg-black/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Link href="/poker" className="text-white/50 hover:text-white transition-colors p-2 rounded-md bg-white/5 hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-sm md:text-base font-bold flex items-center gap-2 text-white/90">
                            PATO 스피드 바카라 <span className="text-yellow-500 font-mono italic text-xs ml-1">v2.0</span>
                        </h1>
                        <p className="text-[10px] md:text-xs text-white/40">[{tableId.slice(0, 4)}] 회차 진행중</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">보유 포인트</span>
                        <span className="text-sm md:text-base font-black text-yellow-500 tabular-nums">₩{balance.toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10">
                            <Info className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsMuted(m => !m)} className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10">
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN GAME AREA */}
            <div className="flex-1 flex flex-col xl:flex-row relative min-h-0 z-10 w-full">

                {isDesktop && (
                    <div className="hidden xl:flex w-[320px] 2xl:w-[400px] border-r border-white/10 bg-black/40 flex-col">
                        <BaccaratRoadmap
                            history={history}
                            gameState={gameState}
                        />
                    </div>
                )}

                <div className="flex-1 flex flex-col relative w-full h-full pb-4">
                    <BaccaratDealer
                        gameState={gameState}
                        timeRemaining={timeRemaining}
                        playerCards={playerCards}
                        bankerCards={bankerCards}
                        playerScore={playerScore}
                        bankerScore={bankerScore}
                        revealedCards={revealedCards}
                    />
                </div>

                {!isDesktop && (
                    <div className="flex xl:hidden w-full border-b border-white/5 bg-black/40">
                        <BaccaratRoadmap
                            history={history}
                            gameState={gameState}
                        />
                    </div>
                )}
            </div>

            {/* BOTTOM: Betting Grid & Action Bar */}
            <BaccaratBettingGrid
                gameState={gameState}
                myBets={myBets}
                selectedChip={selectedChip}
                setSelectedChip={setSelectedChip}
                placeBet={placeBet}
                clearBets={clearBets}
            />
        </div>
    );
}
