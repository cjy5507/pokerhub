'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, History, Volume2, VolumeX, Info } from 'lucide-react';
import Link from 'next/link';
import { createOptionalClient } from '@/lib/supabase/client';
import { syncBaccaratState, placeBaccaratBet, clearBaccaratBets } from '../actions';

const SuitIcon = ({ suit, className = "w-6 h-6" }: { suit: string; className?: string }) => {
    switch (suit) {
        case 'S':
            return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8 6 4 10 4 14C4 18.418 7.582 22 12 22C16.418 22 20 18.418 20 14C20 10 16 6 12 2Z" /></svg>;
        case 'H':
            return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
        case 'C':
            return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C10.3431 2 9 3.34315 9 5C9 6.27648 9.80006 7.35987 10.9257 7.78453C9.09885 8.12781 7.2345 8.92203 6.00004 10.7499C4.65434 12.7426 4.96023 15.4284 6.78207 17.0674C8.61864 18.7197 11.3972 18.5985 13.0854 16.788L11.8398 22H12.1601L10.9146 16.788C12.6028 18.5985 15.3813 18.7197 17.2179 17.0674C19.0397 15.4284 19.3456 12.7426 17.9999 10.7499C16.7655 8.92203 14.9011 8.12781 13.0743 7.78453C14.1999 7.35987 15 6.27648 15 5C15 3.34315 13.6568 2 12 2Z" /></svg>;
        case 'D':
            return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12L12 22L22 12L12 2Z" /></svg>;
        default:
            return null;
    }
};

const getSuitColor = (suit: string) => {
    return suit === 'H' || suit === 'D' ? 'text-rose-600' : 'text-slate-900';
};

// Types
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

    // Balance (Mock UI)
    const [balance, setBalance] = useState(500000);
    const [myBets, setMyBets] = useState<Record<string, number>>({});
    const [history, setHistory] = useState<string[]>([]);

    const [playerCards, setPlayerCards] = useState<any[]>([]);
    const [bankerCards, setBankerCards] = useState<any[]>([]);
    const [playerScore, setPlayerScore] = useState<number | null>(null);
    const [bankerScore, setBankerScore] = useState<number | null>(null);

    const applyState = (data: any) => {
        if (!data || !data.table) return;
        const { table, round, serverTime, myBets: betsMap } = data;

        setGameState(table.status);
        if (table.status === 'betting' && betsMap !== undefined) {
            setMyBets(betsMap);
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

    // Sync Loop (Watchdog)
    useEffect(() => {
        let mounted = true;
        async function fetchState() {
            try {
                const data = await syncBaccaratState(tableId);
                if (mounted && data) applyState(data);
            } catch (err) {
                console.error(err);
            }
        }

        fetchState();
        const watchdog = setInterval(fetchState, 3000);
        return () => {
            mounted = false;
            clearInterval(watchdog);
        };
    }, [tableId]);

    // Supabase Realtime Broadcast Listener
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

    // Local countdown timer for smooth UI
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Handle betting
    const placeBet = async (zone: BetZone) => {
        if (gameState !== 'betting') return;

        // Plop sound logic would go here
        if (!isMuted) {
            // new Audio('/sounds/chip.mp3').play().catch(()=>{});
        }

        try {
            const res = await placeBaccaratBet(tableId, zone, selectedChip);
            if (res.success) {
                // Optimistic UI update
                setMyBets(prev => ({
                    ...prev,
                    [zone]: (prev[zone] || 0) + selectedChip
                }));
                // Real balance should come from server, but for now we rely on the next fetch
            }
        } catch (err: any) {
            alert(err.message || 'Bet failed');
        }
    };

    const clearBets = async () => {
        if (gameState !== 'betting') return;
        try {
            const res = await clearBaccaratBets(tableId);
            if (res.success) {
                setMyBets({});
            }
        } catch (err: any) {
            alert(err.message || 'Clear bets failed');
        }
    };

    const chips = [100, 500, 1000, 5000, 10000, 50000];

    return (
        <div className="w-full flex-1 min-h-[600px] h-[calc(100vh-120px)] bg-slate-50 dark:bg-[#050505] rounded-xl flex flex-col overflow-hidden select-none relative font-sans text-slate-900 dark:text-white border border-black/5 dark:border-white/10 shadow-2xl transition-colors">
            {/* Generative Dopamine UI & Lo-fi Noise */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.02] dark:opacity-[0.04] mix-blend-overlay z-[1]"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" /></filter><rect width="100%" height="100%" filter="url(#noiseFilter)" /></svg>
            <div className={cn("absolute inset-0 opacity-20 dark:opacity-40 pointer-events-none transition-all duration-[3000ms] ease-in-out", gameState === 'betting' ? "bg-[radial-gradient(circle_at_50%_50%,#3b82f6_0%,transparent_30%),radial-gradient(circle_at_80%_80%,#eab308_0%,transparent_40%)]" : gameState === 'dealing' ? "bg-[radial-gradient(circle_at_20%_20%,#ef4444_0%,transparent_40%),radial-gradient(circle_at_80%_20%,#3b82f6_0%,transparent_40%)] blur-2xl opacity-30 dark:opacity-50 scale-110" : "bg-[radial-gradient(circle_at_50%_40%,#eab308_0%,transparent_50%)] blur-xl opacity-15 dark:opacity-30 scale-100")} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/80 to-white dark:from-[#050505]/40 dark:via-[#0a0a0a]/80 dark:to-[#050505] pointer-events-none transition-colors" />

            {/* TOP BAR */}
            <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 z-30 border-b border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md transition-colors">
                <div className="flex items-center gap-4">
                    <Link href="/poker" className="text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors p-2 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-sm md:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            Baccarat <span className="text-op-gold">Pro</span>
                        </h1>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-white/50">Table {tableId.slice(0, 4)} • Min 100 / Max 1M</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-wider font-bold">Balance</span>
                        <span className="text-sm md:text-base font-black text-op-gold tabular-nums">${balance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                            <Info className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsMuted(m => !m)} className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN GAME AREA (Dealer + History) */}
            <div className="flex-1 flex flex-col lg:flex-row relative min-h-0 z-10 w-full">

                {/* 1. Dealer / Board View (Evolution Style) */}
                <div className="flex-1 relative flex flex-col justify-center items-center py-6 min-h-[250px] lg:min-h-0">

                    {/* Status Text (Floating) */}
                    <div className="absolute top-4 lg:top-8 w-full flex justify-center z-20">
                        <div className={cn(
                            "px-8 py-2 md:py-3 rounded-full border backdrop-blur-md transition-all duration-300 shadow-xl dark:shadow-2xl",
                            gameState === 'betting' ? "bg-white/80 dark:bg-black/60 border-op-warning/30 dark:border-op-warning/50" :
                                gameState === 'dealing' ? "bg-white/90 dark:bg-black/80 border-black/10 dark:border-white/20" : "bg-white/90 dark:bg-black/80 border-op-success/30 dark:border-op-success/50"
                        )}>
                            <span className={cn(
                                "text-sm md:text-lg font-black uppercase tracking-widest text-shadow-sm",
                                gameState === 'betting' ? "text-op-warning animate-pulse" :
                                    gameState === 'dealing' ? "text-slate-900 dark:text-white" : "text-op-success"
                            )}>
                                {gameState === 'betting' ? `PLACE YOUR BETS (${timeRemaining}s)` :
                                    gameState === 'dealing' ? "NO MORE BETS" : "BANKER WINS 8 TO 5"}
                            </span>
                        </div>
                    </div>

                    {/* Cards Display */}
                    <div className="flex justify-center gap-8 md:gap-24 relative z-10 w-full px-4 mt-8 md:mt-2">
                        {/* Player Side */}
                        <div className="flex flex-col items-center flex-1 max-w-[200px]">
                            <div className="flex justify-center gap-2 relative min-h-[120px] md:min-h-[160px] w-full">
                                {playerCards.map((card, i) => (
                                    <div key={i} className={cn(
                                        "w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 bg-white rounded-lg flex flex-col items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.6)] transition-all duration-500 will-change-transform",
                                        getSuitColor(card.suit),
                                        gameState === 'dealing' || gameState === 'result' ? "translate-y-0 opacity-100 rotate-0 scale-100" : "translate-y-12 opacity-0 rotate-12 scale-90",
                                        i === 2 ? "absolute -right-6 md:-right-10 top-2 lg:top-4 rotate-90" : ""
                                    )} style={{ transitionDelay: `${i * 150}ms`, zIndex: i }}>
                                        <span className="absolute top-1 left-1.5 md:top-2 md:left-2 text-xs md:text-sm font-bold">{card.value}</span>
                                        <SuitIcon suit={card.suit} className="w-5 h-5 md:w-8 md:h-8 opacity-90" />
                                        <span className="absolute bottom-1 right-1.5 md:bottom-2 md:right-2 text-xs md:text-sm font-bold rotate-180">{card.value}</span>
                                    </div>
                                ))}
                                {playerCards.length === 0 && (
                                    <div className="w-14 h-20 md:w-20 md:h-28 border-2 border-slate-300 dark:border-white/10 rounded-lg flex items-center justify-center transition-colors">
                                        <span className="text-slate-400 dark:text-white/20 text-[10px] md:text-xs uppercase underline decoration-slate-300 dark:decoration-white/20 underline-offset-4">Card</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex flex-col items-center">
                                <span className={cn(
                                    "text-sm md:text-lg font-black uppercase tracking-widest px-4 md:px-6 py-1 md:py-1.5 rounded-full backdrop-blur-md transition-all",
                                    "bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",
                                    gameState === 'result' && playerScore !== null && bankerScore !== null && playerScore > bankerScore ? "shadow-[0_0_30px_rgba(59,130,246,0.3)] dark:shadow-[0_0_30px_rgba(59,130,246,0.6)] ring-2 ring-blue-500/50 scale-110 bg-blue-200 dark:bg-blue-600/40 text-blue-800 dark:text-blue-300" : ""
                                )}>Player</span>
                                <div className={cn("mt-2 md:mt-3 text-4xl md:text-6xl font-black transition-all font-mono", gameState === 'result' && playerScore !== null && bankerScore !== null && playerScore > bankerScore ? "text-slate-900 dark:text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] dark:drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110" : "text-slate-800/80 dark:text-white/80 drop-shadow-sm dark:drop-shadow-md")}>
                                    {(gameState === 'dealing' || gameState === 'result') && playerScore !== null ? playerScore : '?'}
                                </div>
                            </div>
                        </div>

                        {/* VS Divider */}
                        <div className="hidden lg:flex flex-col items-center justify-center px-4">
                            <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-black/10 dark:via-white/20 to-transparent"></div>
                            <span className="text-black/30 dark:text-white/30 text-xs font-black italic my-2 uppercase tracking-[0.3em]">VS</span>
                            <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-black/10 dark:via-white/20 to-transparent"></div>
                        </div>

                        {/* Banker Side */}
                        <div className="flex flex-col items-center flex-1 max-w-[200px]">
                            <div className="flex justify-center gap-2 relative min-h-[120px] md:min-h-[160px] w-full">
                                {bankerCards.map((card, i) => (
                                    <div key={i} className={cn(
                                        "w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 bg-white rounded-lg flex flex-col items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.6)] transition-all duration-500 will-change-transform",
                                        getSuitColor(card.suit),
                                        gameState === 'dealing' || gameState === 'result' ? "translate-y-0 opacity-100 rotate-0 scale-100" : "translate-y-12 opacity-0 -rotate-12 scale-90",
                                        i === 2 ? "absolute -left-6 md:-left-10 top-2 lg:top-4 -rotate-90" : ""
                                    )} style={{ transitionDelay: `${i * 150 + (playerCards.length * 150)}ms`, zIndex: i }}>
                                        <span className="absolute top-1 left-1.5 md:top-2 md:left-2 text-xs md:text-sm font-bold">{card.value}</span>
                                        <SuitIcon suit={card.suit} className="w-5 h-5 md:w-8 md:h-8 opacity-90" />
                                        <span className="absolute bottom-1 right-1.5 md:bottom-2 md:right-2 text-xs md:text-sm font-bold rotate-180">{card.value}</span>
                                    </div>
                                ))}
                                {bankerCards.length === 0 && (
                                    <div className="w-14 h-20 md:w-20 md:h-28 border-2 border-slate-300 dark:border-white/10 rounded-lg flex items-center justify-center transition-colors">
                                        <span className="text-slate-400 dark:text-white/20 text-[10px] md:text-xs uppercase underline decoration-slate-300 dark:decoration-white/20 underline-offset-4">Card</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex flex-col items-center">
                                <span className={cn(
                                    "text-sm md:text-lg font-black uppercase tracking-widest px-4 md:px-6 py-1 md:py-1.5 rounded-full backdrop-blur-md transition-all",
                                    "bg-red-100 dark:bg-red-600/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30",
                                    gameState === 'result' && playerScore !== null && bankerScore !== null && bankerScore > playerScore ? "shadow-[0_0_30px_rgba(220,38,38,0.3)] dark:shadow-[0_0_30px_rgba(220,38,38,0.6)] ring-2 ring-red-500/50 scale-110 bg-red-200 dark:bg-red-600/40 text-red-800 dark:text-red-300" : ""
                                )}>Banker</span>
                                <div className={cn("mt-2 md:mt-3 text-4xl md:text-6xl font-black transition-all font-mono", gameState === 'result' && playerScore !== null && bankerScore !== null && bankerScore > playerScore ? "text-slate-900 dark:text-white drop-shadow-[0_0_15px_rgba(220,38,38,0.4)] dark:drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] scale-110" : "text-slate-800/80 dark:text-white/80 drop-shadow-sm dark:drop-shadow-md")}>
                                    {(gameState === 'dealing' || gameState === 'result') && bankerScore !== null ? bankerScore : '?'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Roadmap / History (Evolution Style Right Panel) */}
                <div className="w-full lg:w-[380px] bg-white/60 dark:bg-black/60 border-t lg:border-t-0 lg:border-l border-black/5 dark:border-white/10 p-2 md:p-4 shrink-0 flex flex-row lg:flex-col gap-2 md:gap-4 overflow-x-auto lg:overflow-x-visible h-[120px] lg:h-auto scrollbar-hide backdrop-blur-sm transition-colors">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-white/70 px-1 shrink-0 lg:shrink">
                        <History className="w-4 h-4 md:w-5 md:h-5 text-op-gold" />
                        <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-white/70">Roadmap</span>
                    </div>

                    {/* Bead Plate */}
                    <div className="flex-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-lg p-1.5 min-w-[300px] lg:min-w-0 flex flex-col gap-1 overflow-hidden transition-colors">
                        <div className="grid grid-rows-6 grid-flow-col gap-1 h-full w-max lg:w-full overflow-x-auto scrollbar-hide">
                            {history.slice(-72).map((res, i) => {
                                const isLatest = gameState === 'result' && i === history.length - 1;
                                return (
                                    <div key={i} className="w-4 h-4 md:w-5 md:h-5 rounded-sm bg-slate-200 dark:bg-[#111] flex items-center justify-center relative transition-colors">
                                        {res && (
                                            <div className={cn(
                                                "w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-black text-white shadow-sm transition-all duration-300",
                                                res === 'P' ? "bg-blue-600" : res === 'B' ? "bg-red-600" : "bg-green-600",
                                                isLatest ? "animate-pulse ring-1 ring-white" : ""
                                            )}>
                                                {res}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="hidden lg:grid grid-cols-3 gap-2 mt-auto pb-2">
                        <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-500/20 rounded-md p-2 flex flex-col items-center transition-colors">
                            <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">P</span>
                            <span className="text-blue-900 dark:text-white font-black">{history.filter(x => x === 'P').length}</span>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-500/20 rounded-md p-2 flex flex-col items-center transition-colors">
                            <span className="text-red-600 dark:text-red-400 text-xs font-bold">B</span>
                            <span className="text-red-900 dark:text-white font-black">{history.filter(x => x === 'B').length}</span>
                        </div>
                        <div className="bg-emerald-50 dark:bg-green-900/40 border border-emerald-200 dark:border-green-500/20 rounded-md p-2 flex flex-col items-center transition-colors">
                            <span className="text-emerald-600 dark:text-green-400 text-xs font-bold">T</span>
                            <span className="text-emerald-900 dark:text-white font-black">{history.filter(x => x === 'T').length}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* BOTTOM: Betting Grid & Action Bar */}
            <div className="flex-shrink-0 flex flex-col relative z-20 bg-white/90 dark:bg-black/80 border-t border-black/5 dark:border-white/10 lg:pt-4 transition-colors">

                {/* 3. Betting Grid */}
                <div className="w-full max-w-4xl mx-auto px-2 lg:px-6 py-2 lg:pb-6 relative flex-1 min-h-[160px] md:min-h-[200px] flex flex-col justify-end">

                    {/* Shadow overlay to make grid pop */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-black/60 to-transparent pointer-events-none transition-colors" />

                    <div className="flex flex-col gap-1 md:gap-2 h-full relative z-10 w-full">
                        {/* PAIRS ROW */}
                        <div className="flex h-[35%] gap-1 md:gap-2">
                            {/* P. Pair */}
                            <button
                                onClick={() => placeBet('player_pair')}
                                disabled={gameState !== 'betting'}
                                className={cn(
                                    "flex-1 rounded-t-xl lg:rounded-tl-2xl border-2 transition-all relative flex flex-col items-center justify-center overflow-hidden group",
                                    "bg-blue-900/30 border-blue-500/20",
                                    gameState === 'betting' ? "hover:bg-blue-800/50 hover:border-blue-500/50 cursor-pointer active:scale-[0.98]" : "cursor-not-allowed opacity-80"
                                )}
                            >
                                <span className={cn("text-xs md:text-sm font-bold tracking-widest transition-colors", myBets['player_pair'] ? "text-white" : "text-blue-300 group-hover:text-blue-200")}>P. PAIR</span>
                                <span className="text-[10px] md:text-xs text-blue-400/60 font-mono mt-0.5">11:1</span>
                                {myBets['player_pair'] && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[url('/chip-blue.png')] bg-cover bg-center rounded-full border border-yellow-400/50 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center animate-bounce-short z-10 before:absolute before:inset-0 before:bg-blue-600/20 before:rounded-full">
                                        <div className="bg-black/80 px-2 py-0.5 rounded-full text-[9px] md:text-xs font-black text-white relative z-10 border border-white/20 whitespace-nowrap">
                                            {myBets['player_pair'] >= 1000 ? `${myBets['player_pair'] / 1000}K` : myBets['player_pair']}
                                        </div>
                                    </div>
                                )}
                            </button>

                            {/* Tie */}
                            <button
                                onClick={() => placeBet('tie')}
                                disabled={gameState !== 'betting'}
                                className={cn(
                                    "flex-[1.5] rounded-t-xl border-2 transition-all relative flex flex-col items-center justify-center overflow-hidden group",
                                    "bg-green-900/30 border-green-500/20",
                                    gameState === 'betting' ? "hover:bg-green-800/50 hover:border-green-500/50 cursor-pointer active:scale-[0.98]" : "cursor-not-allowed opacity-80"
                                )}
                            >
                                <span className={cn("text-sm md:text-base font-black tracking-widest transition-colors", myBets['tie'] ? "text-white" : "text-green-400 group-hover:text-green-300")}>TIE</span>
                                <span className="text-[10px] md:text-xs text-green-400/60 font-mono mt-0.5">8:1</span>
                                {myBets['tie'] && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[url('/chip-green.png')] bg-cover bg-center rounded-full border border-yellow-400/50 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center animate-bounce-short z-10 before:absolute before:inset-0 before:bg-green-600/20 before:rounded-full">
                                        <div className="bg-black/80 px-2 py-0.5 rounded-full text-[9px] md:text-xs font-black text-white relative z-10 border border-white/20 whitespace-nowrap">
                                            {myBets['tie'] >= 1000 ? `${myBets['tie'] / 1000}K` : myBets['tie']}
                                        </div>
                                    </div>
                                )}
                            </button>

                            {/* B. Pair */}
                            <button
                                onClick={() => placeBet('banker_pair')}
                                disabled={gameState !== 'betting'}
                                className={cn(
                                    "flex-1 rounded-t-xl lg:rounded-tr-2xl border-2 transition-all relative flex flex-col items-center justify-center overflow-hidden group",
                                    "bg-red-900/30 border-red-500/20",
                                    gameState === 'betting' ? "hover:bg-red-800/50 hover:border-red-500/50 cursor-pointer active:scale-[0.98]" : "cursor-not-allowed opacity-80"
                                )}
                            >
                                <span className={cn("text-xs md:text-sm font-bold tracking-widest transition-colors", myBets['banker_pair'] ? "text-white" : "text-red-300 group-hover:text-red-200")}>B. PAIR</span>
                                <span className="text-[10px] md:text-xs text-red-400/60 font-mono mt-0.5">11:1</span>
                                {myBets['banker_pair'] && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[url('/chip-red.png')] bg-cover bg-center rounded-full border border-yellow-400/50 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center animate-bounce-short z-10 before:absolute before:inset-0 before:bg-red-600/20 before:rounded-full">
                                        <div className="bg-black/80 px-2 py-0.5 rounded-full text-[9px] md:text-xs font-black text-white relative z-10 border border-white/20 whitespace-nowrap">
                                            {myBets['banker_pair'] >= 1000 ? `${myBets['banker_pair'] / 1000}K` : myBets['banker_pair']}
                                        </div>
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* MAIN ROW (Player / Banker) */}
                        <div className="flex h-[65%] gap-1 md:gap-2">
                            {/* Player */}
                            <button
                                onClick={() => placeBet('player')}
                                disabled={gameState !== 'betting'}
                                className={cn(
                                    "flex-1 rounded-bl-xl lg:rounded-bl-2xl border-2 transition-all relative flex flex-col items-center justify-center overflow-hidden group",
                                    "bg-gradient-to-b from-blue-700/60 to-blue-900/60 border-blue-500/40",
                                    gameState === 'betting' ? "hover:from-blue-600/80 hover:to-blue-800/80 hover:border-blue-400/60 cursor-pointer active:scale-[0.98] shadow-[inset_0_0_20px_rgba(37,99,235,0.2)]" : "cursor-not-allowed opacity-80",
                                )}
                            >
                                <span className="text-xl md:text-3xl font-black text-white drop-shadow-lg tracking-widest">PLAYER</span>
                                <span className="text-xs md:text-sm text-blue-200/80 font-mono mt-1">1:1</span>
                                {myBets['player'] && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full border border-yellow-400 shadow-[0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-center animate-bounce-short z-10 bg-[repeating-conic-gradient(from_0deg,#2563eb_0deg_15deg,#1e3a8a_15deg_30deg)] after:absolute after:inset-[2px] after:rounded-full after:border-[2px] after:border-white/30 after:border-dashed">
                                        <div className="bg-black/90 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-black text-white relative z-10 border-[1.5px] border-yellow-500/50 shadow-inner whitespace-nowrap">
                                            {myBets['player'].toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </button>

                            {/* Banker */}
                            <button
                                onClick={() => placeBet('banker')}
                                disabled={gameState !== 'betting'}
                                className={cn(
                                    "flex-1 rounded-br-xl lg:rounded-br-2xl border-2 transition-all relative flex flex-col items-center justify-center overflow-hidden group",
                                    "bg-gradient-to-b from-red-700/60 to-red-900/60 border-red-500/40",
                                    gameState === 'betting' ? "hover:from-red-600/80 hover:to-red-800/80 hover:border-red-400/60 cursor-pointer active:scale-[0.98] shadow-[inset_0_0_20px_rgba(220,38,38,0.2)]" : "cursor-not-allowed opacity-80",
                                    gameState === 'result' ? "animate-pulse border-op-gold bg-red-600/80 shadow-[inset_0_0_40px_rgba(202,138,4,0.4)]" : "" // Mock win state
                                )}
                            >
                                <span className="text-xl md:text-3xl font-black text-white drop-shadow-lg tracking-widest">BANKER</span>
                                <span className="text-xs md:text-sm text-red-200/80 font-mono mt-1">1:0.95</span>
                                {myBets['banker'] && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full border border-yellow-400 shadow-[0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-center animate-bounce-short z-10 bg-[repeating-conic-gradient(from_0deg,#dc2626_0deg_15deg,#7f1d1d_15deg_30deg)] after:absolute after:inset-[2px] after:rounded-full after:border-[2px] after:border-white/30 after:border-dashed">
                                        <div className="bg-black/90 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-black text-white relative z-10 border-[1.5px] border-yellow-500/50 shadow-inner whitespace-nowrap">
                                            {myBets['banker'].toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Action Bar (Chips) */}
                <div className="bg-slate-50 dark:bg-gradient-to-t dark:from-[#050505] dark:to-black p-2 md:p-4 border-t border-black/5 dark:border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-20px_40px_rgba(0,0,0,0.8)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-colors">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

                        {/* Chip Selection */}
                        <div className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide flex-1 justify-center px-2 py-1 items-end min-h-[70px]">
                            {chips.map(chip => {
                                const isSelected = selectedChip === chip;
                                return (
                                    <button
                                        key={chip}
                                        onClick={() => setSelectedChip(chip)}
                                        className={cn(
                                            "relative w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] flex items-center justify-center transition-all flex-shrink-0 group",
                                            isSelected
                                                ? "border-op-gold scale-110 shadow-[0_10px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(201,162,39,0.5)] z-10 -translate-y-3"
                                                : "border-white/30 hover:border-white/50 grayscale-[15%] hover:grayscale-0 active:scale-95 shadow-md"
                                        )}
                                        style={{ background: 'repeating-conic-gradient(from 0deg, #1f1f1f 0deg 15deg, #3a3a3a 15deg 30deg)' }}
                                    >
                                        <div className={cn(
                                            "absolute inset-1 rounded-full border-[1.5px] border-white/20 flex flex-col items-center justify-center shadow-inner",
                                            chip >= 50000 ? "bg-purple-900" : chip >= 10000 ? "bg-red-800" : chip >= 1000 ? "bg-blue-800" : "bg-green-800"
                                        )}>
                                            <span className="text-[10px] md:text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                {chip >= 1000 ? `${chip / 1000}K` : chip}
                                            </span>
                                        </div>

                                        {/* Glow effect when selected */}
                                        {isSelected && (
                                            <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur-md -z-10" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex md:flex-col gap-2 shrink-0">
                            <button
                                disabled={gameState !== 'betting'}
                                className="px-3 md:px-5 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/20 dark:active:bg-white/20 text-slate-700 dark:text-white/90 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm backdrop-blur flex-1"
                            >
                                Repeat
                            </button>
                            <button
                                onClick={clearBets}
                                disabled={gameState !== 'betting' || Object.keys(myBets).length === 0}
                                className="px-3 md:px-5 py-2.5 rounded-lg border border-red-500/20 bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/60 active:bg-red-300 dark:active:bg-red-800/60 text-red-700 dark:text-red-200 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm backdrop-blur flex-1"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
