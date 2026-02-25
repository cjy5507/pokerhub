'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
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

interface BaccaratTableClientProps {
    tableId: string;
    userId: string | null;
    nickname: string | null;
}

export function BaccaratTableClient({ tableId, userId, nickname }: BaccaratTableClientProps) {
    const [gameState, setGameState] = useState<BaccaratState>('betting');
    const [timeRemaining, setTimeRemaining] = useState(15);
    const [isMuted, setIsMuted] = useState(false);
    const [selectedChip, setSelectedChip] = useState<number>(1000); // 1k

    const [balance, setBalance] = useState(0);
    const [myBets, setMyBets] = useState<Record<string, number>>({});
    const [history, setHistory] = useState<string[]>([]);

    const [playerCards, setPlayerCards] = useState<any[]>([]);
    const [bankerCards, setBankerCards] = useState<any[]>([]);
    const [playerScore, setPlayerScore] = useState<number | null>(null);
    const [bankerScore, setBankerScore] = useState<number | null>(null);
    const [revealedCards, setRevealedCards] = useState<number>(0);

    // Audio Refs using HTML Audio for simplicity and preloading
    const chipSoundRef = useRef<HTMLAudioElement | null>(null);
    const dealSoundRef = useRef<HTMLAudioElement | null>(null);
    const flipSoundRef = useRef<HTMLAudioElement | null>(null);
    const winSoundRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        chipSoundRef.current = new Audio('/sounds/chip.mp3');
        dealSoundRef.current = new Audio('/sounds/card-slide.mp3');
        flipSoundRef.current = new Audio('/sounds/card-flip.mp3');
        winSoundRef.current = new Audio('/sounds/win.mp3');
    }, []);

    const playSound = (audio: HTMLAudioElement | null) => {
        if (!isMuted && audio) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
        }
    };

    const applyState = (data: any) => {
        if (!data || !data.table) return;
        const { table, round, serverTime, myBets: betsMap, balance: serverBalance } = data;

        // Transition logic for sounds
        if (gameState !== 'result' && table.status === 'result') {
            playSound(winSoundRef.current);
        }

        setGameState(table.status);
        if (table.status === 'betting' && betsMap !== undefined) {
            setMyBets(betsMap);
        }

        if (serverBalance !== undefined) {
            setBalance(serverBalance);
        }

        if (table.history) setHistory(table.history);

        const endsAt = new Date(table.phaseEndsAt).getTime();
        const diff = Math.max(0, Math.floor((endsAt - serverTime) / 1000));
        setTimeRemaining(diff);

        if (round) {
            setPlayerCards(round.playerCards || []);
            setBankerCards(round.bankerCards || []);
            setPlayerScore(round.playerScore);
            setBankerScore(round.bankerScore);
        } else {
            setPlayerCards([]);
            setBankerCards([]);
            setPlayerScore(null);
            setBankerScore(null);
        }
    };

    // Watchdog
    useEffect(() => {
        let mounted = true;
        async function fetchState() {
            try {
                const data = await syncBaccaratState(tableId);
                if (data && data.error) return;
                if (mounted && data) applyState(data);
            } catch (err) { }
        }
        fetchState();
        const watchdog = setInterval(fetchState, 3000);
        return () => {
            mounted = false;
            clearInterval(watchdog);
        };
    }, [tableId]);

    // Realtime Subs
    useEffect(() => {
        const supabase = createOptionalClient();
        if (!supabase) return;

        const channel = supabase.channel(`baccarat:${tableId}`);
        channel.on('broadcast', { event: 'game_state' }, (payload) => {
            applyState(payload.payload);
        }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableId]);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Sequentially Deal and Reveal logic
    useEffect(() => {
        if (gameState === 'dealing' || gameState === 'result') {
            const totalCards = playerCards.length + bankerCards.length;
            setRevealedCards(0);

            const timers: NodeJS.Timeout[] = [];
            // Deal sounds instantly
            for (let i = 0; i < totalCards; i++) {
                timers.push(setTimeout(() => {
                    playSound(dealSoundRef.current);
                }, i * 200 + 100));
            }

            // Flip sounds and state updates
            for (let i = 0; i < totalCards; i++) {
                timers.push(setTimeout(() => {
                    setRevealedCards(prev => prev + 1);
                    playSound(flipSoundRef.current);
                }, (i + 1) * 800)); // slightly slower for tension
            }
            return () => timers.forEach(clearTimeout);
        } else {
            setRevealedCards(0);
        }
    }, [gameState, playerCards.length, bankerCards.length]);

    const placeBet = async (zone: BetZone) => {
        if (gameState !== 'betting') return;
        playSound(chipSoundRef.current);

        try {
            const res = await placeBaccaratBet(tableId, zone, selectedChip);
            if (res.success) {
                setMyBets(prev => ({ ...prev, [zone]: (prev[zone] || 0) + selectedChip }));
            }
        } catch (err: any) {
            alert(err.message || 'Bet failed');
        }
    };

    const clearBets = async () => {
        if (gameState !== 'betting') return;
        try {
            const res = await clearBaccaratBets(tableId);
            if (res.success) setMyBets({});
        } catch (err: any) { }
    };

    return (
        <div className="w-full flex-1 min-h-[600px] h-[calc(100vh-120px)] bg-slate-900 dark:bg-[#0a0f12] rounded-xl flex flex-col overflow-hidden select-none relative font-sans text-white border border-white/10 shadow-2xl transition-colors">

            {/* Dynamic Animated Background Filter */}
            <div className={cn("absolute inset-0 opacity-40 pointer-events-none transition-all duration-[3000ms] ease-in-out",
                gameState === 'betting' ? "bg-[radial-gradient(circle_at_50%_50%,#b45309_0%,transparent_30%),radial-gradient(circle_at_80%_80%,#991b1b_0%,transparent_40%)]" :
                    gameState === 'dealing' ? "bg-[radial-gradient(circle_at_20%_20%,#0f172a_0%,transparent_40%),radial-gradient(circle_at_80%_20%,#1e3a8a_0%,transparent_40%)] blur-2xl opacity-50 scale-110" :
                        "bg-[radial-gradient(circle_at_50%_40%,#eab308_0%,transparent_50%)] blur-xl opacity-30 scale-100"
            )} />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f12]/60 via-[#0a0f12]/80 to-[#000000] pointer-events-none" />

            {/* TOP BAR */}
            <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Link href="/poker" className="text-white/50 hover:text-white transition-colors p-2 rounded-md bg-white/5 hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-sm md:text-base font-bold flex items-center gap-2 text-white">
                            바카라 <span className="text-yellow-500">프리미엄</span>
                        </h1>
                        <p className="text-[10px] md:text-xs text-white/50">테이블 {tableId.slice(0, 4)} • 최소 100 / 최대 1M</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">보유 포인트</span>
                        <span className="text-sm md:text-base font-black text-yellow-500 tabular-nums">{balance.toLocaleString('en-US')}</span>
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
            <div className="flex-1 flex flex-col lg:flex-row relative min-h-0 z-10 w-full">
                <BaccaratDealer
                    gameState={gameState}
                    timeRemaining={timeRemaining}
                    playerCards={playerCards}
                    bankerCards={bankerCards}
                    playerScore={playerScore}
                    bankerScore={bankerScore}
                    revealedCards={revealedCards}
                />

                <BaccaratRoadmap
                    history={history}
                    gameState={gameState}
                />
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
