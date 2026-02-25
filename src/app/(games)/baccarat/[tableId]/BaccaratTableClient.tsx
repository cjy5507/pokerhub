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
    initialBalance?: number;
}

export function BaccaratTableClient({ tableId, userId, nickname, initialBalance }: BaccaratTableClientProps) {
    const [gameState, setGameState] = useState<BaccaratState>('betting');
    const [timeRemaining, setTimeRemaining] = useState(15);
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
            setPlayerCards(prev => JSON.stringify(prev) === JSON.stringify(round.playerCards) ? prev : (round.playerCards || []));
            setBankerCards(prev => JSON.stringify(prev) === JSON.stringify(round.bankerCards) ? prev : (round.bankerCards || []));
            setPlayerScore(round.playerScore);
            setBankerScore(round.bankerScore);
        } else {
            setPlayerCards(prev => prev.length === 0 ? prev : []);
            setBankerCards(prev => prev.length === 0 ? prev : []);
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
            if (totalCards === 0) return; // Wait until there are actually cards

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
    }, [gameState, playerCards, bankerCards]); // Corrected dependency to arrays to prevent infinite looping when refs don't change

    const placeBet = async (zone: BetZone) => {
        if (gameState !== 'betting') return;
        playSound(chipSoundRef.current);

        try {
            const res = await placeBaccaratBet(tableId, zone, selectedChip);
            if (res && res.success) {
                setMyBets(prev => ({ ...prev, [zone]: (prev[zone] || 0) + selectedChip }));
            } else if (res && res.error) {
                alert(res.error);
            }
        } catch (err: any) {
            alert(err.message || 'Bet failed');
        }
    };

    const clearBets = async () => {
        if (gameState !== 'betting') return;
        try {
            const res = await clearBaccaratBets(tableId);
            if (res && res.success) {
                setMyBets({});
            } else if (res && res.error) {
                alert(res.error);
            }
        } catch (err: any) {
            alert(err.message || 'Clear bet failed');
        }
    };

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

                {/* Roadmap on the left (Desktop) */}
                <div className="hidden xl:flex w-[320px] 2xl:w-[400px] border-r border-white/10 bg-black/40 flex-col">
                    <BaccaratRoadmap
                        history={history}
                        gameState={gameState}
                    />
                </div>

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

                {/* Roadmap on top/mobile */}
                <div className="flex xl:hidden w-full border-b border-white/5 bg-black/40">
                    <BaccaratRoadmap
                        history={history}
                        gameState={gameState}
                    />
                </div>
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
