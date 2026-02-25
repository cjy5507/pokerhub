'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, History, Volume2, VolumeX, Info } from 'lucide-react';
import Link from 'next/link';
import { createOptionalClient } from '@/lib/supabase/client';
import { syncBaccaratState, placeBaccaratBet, clearBaccaratBets } from '../actions';

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
        <div className="w-full flex-1 min-h-[600px] h-[calc(100vh-120px)] bg-[#050505] rounded-xl flex flex-col overflow-hidden select-none relative font-sans text-white border border-white/10 shadow-2xl">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-[50%] bg-[radial-gradient(ellipse_at_top,#1e3a8a_0%,transparent_70%)] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-[#0a110b]/90 pointer-events-none" />

            {/* TOP BAR */}
            <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Link href="/poker" className="text-white/50 hover:text-white transition-colors p-2 rounded-md bg-white/5 hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-sm md:text-base font-bold flex items-center gap-2">
                            Baccarat <span className="text-op-gold">Pro</span>
                        </h1>
                        <p className="text-[10px] md:text-xs text-white/50">Table {tableId.slice(0, 4)} • Min 100 / Max 1M</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Balance</span>
                        <span className="text-sm md:text-base font-black text-op-gold tabular-nums">${balance.toLocaleString()}</span>
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

            {/* MAIN GAME AREA (Dealer + History) */}
            <div className="flex-1 flex flex-col lg:flex-row relative min-h-0 z-10 w-full">

                {/* 1. Dealer / Board View (Evolution Style) */}
                <div className="flex-1 relative flex flex-col justify-center items-center py-6 min-h-[250px] lg:min-h-0">

                    {/* Status Text (Floating) */}
                    <div className="absolute top-4 lg:top-8 w-full flex justify-center z-20">
                        <div className={cn(
                            "px-8 py-2 md:py-3 rounded-full border backdrop-blur-md transition-all duration-300 shadow-2xl",
                            gameState === 'betting' ? "bg-black/60 border-op-warning/50" :
                                gameState === 'dealing' ? "bg-black/80 border-white/20" : "bg-black/80 border-op-success/50"
                        )}>
                            <span className={cn(
                                "text-sm md:text-lg font-black uppercase tracking-widest text-shadow-sm",
                                gameState === 'betting' ? "text-op-warning animate-pulse" :
                                    gameState === 'dealing' ? "text-white" : "text-op-success"
                            )}>
                                {gameState === 'betting' ? `PLACE YOUR BETS (${timeRemaining}s)` :
                                    gameState === 'dealing' ? "NO MORE BETS" : "BANKER WINS 8 TO 5"}
                            </span>
                        </div>
                    </div>

                    {/* Cards Display */}
                    <div className="flex items-end gap-12 lg:gap-24 relative z-10 scale-90 sm:scale-100">
                        {/* Player Side */}
                        <div className="flex flex-col items-center">
                            <div className="flex gap-2 relative">
                                {/* Card 1 */}
                                <div className={cn(
                                    "w-16 h-24 sm:w-20 sm:h-28 bg-white rounded-lg flex flex-col items-center justify-center text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-transform duration-500",
                                    gameState === 'dealing' ? "translate-y-0 opacity-100" : gameState === 'waiting' || gameState === 'betting' ? "translate-y-full opacity-0 scale-95" : ""
                                )}>
                                    <span className="absolute top-1 left-2 text-lg font-bold">8</span>
                                    <span className="text-4xl">♠</span>
                                    <span className="absolute bottom-1 right-2 text-lg font-bold rotate-180">8</span>
                                </div>
                                {/* Card 2 */}
                                <div className={cn(
                                    "w-16 h-24 sm:w-20 sm:h-28 bg-white rounded-lg flex flex-col items-center justify-center text-red-600 shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-transform duration-500 delay-150",
                                    gameState === 'dealing' ? "translate-y-0 opacity-100" : gameState === 'waiting' || gameState === 'betting' ? "translate-y-full opacity-0 scale-95" : ""
                                )}>
                                    <span className="absolute top-1 left-2 text-lg font-bold">Q</span>
                                    <span className="text-4xl">♥</span>
                                    <span className="absolute bottom-1 right-2 text-lg font-bold rotate-180">Q</span>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center">
                                <span className={cn(
                                    "text-lg font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full",
                                    "bg-blue-600/20 text-blue-400 border border-blue-500/30",
                                    gameState === 'result' ? "opacity-50" : ""
                                )}>Player</span>
                                <div className="mt-2 text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                    {(gameState === 'dealing' || gameState === 'result') ? '8' : '?'}
                                </div>
                            </div>
                        </div>

                        {/* Banker Side */}
                        <div className="flex flex-col items-center">
                            <div className="flex gap-2 relative">
                                {/* Card 1 */}
                                <div className={cn(
                                    "w-16 h-24 sm:w-20 sm:h-28 bg-white rounded-lg flex flex-col items-center justify-center text-red-600 shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-transform duration-500 delay-75",
                                    gameState === 'dealing' ? "translate-y-0 opacity-100" : gameState === 'waiting' || gameState === 'betting' ? "translate-y-full opacity-0 scale-95" : ""
                                )}>
                                    <span className="absolute top-1 left-2 text-lg font-bold">5</span>
                                    <span className="text-4xl">♦</span>
                                    <span className="absolute bottom-1 right-2 text-lg font-bold rotate-180">5</span>
                                </div>
                                {/* Card 2 */}
                                <div className={cn(
                                    "w-16 h-24 sm:w-20 sm:h-28 bg-white rounded-lg flex flex-col items-center justify-center text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-transform duration-500 delay-[225ms]",
                                    gameState === 'dealing' ? "translate-y-0 opacity-100" : gameState === 'waiting' || gameState === 'betting' ? "translate-y-full opacity-0 scale-95" : ""
                                )}>
                                    <span className="absolute top-1 left-2 text-lg font-bold">K</span>
                                    <span className="text-4xl">♣</span>
                                    <span className="absolute bottom-1 right-2 text-lg font-bold rotate-180">K</span>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center">
                                <span className={cn(
                                    "text-lg font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full",
                                    "bg-red-600/20 text-red-400 border border-red-500/30",
                                    gameState === 'result' ? "animate-pulse ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.5)]" : ""
                                )}>Banker</span>
                                <div className="mt-2 text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                                    {(gameState === 'dealing' || gameState === 'result') ? '5' : '?'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Roadmap / History (Evolution Style Right Panel) */}
                <div className="w-full lg:w-[380px] bg-black/60 border-t lg:border-t-0 lg:border-l border-white/10 p-2 md:p-4 shrink-0 flex flex-row lg:flex-col gap-2 md:gap-4 overflow-x-auto lg:overflow-x-visible h-[120px] lg:h-auto scrollbar-hide">
                    <div className="flex items-center gap-2 text-white/70 px-1 shrink-0 lg:shrink">
                        <History className="w-4 h-4 md:w-5 md:h-5 text-op-gold" />
                        <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest">Roadmap</span>
                    </div>

                    {/* Bead Plate */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-1.5 min-w-[300px] lg:min-w-0 flex flex-col gap-1 overflow-hidden">
                        <div className="grid grid-rows-6 grid-flow-col gap-1 h-full w-max lg:w-full overflow-x-auto scrollbar-hide">
                            {history.slice(-72).map((res, i) => {
                                const isLatest = gameState === 'result' && i === history.length - 1;
                                return (
                                    <div key={i} className="w-4 h-4 md:w-5 md:h-5 rounded-sm bg-[#111] flex items-center justify-center relative">
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
                        <div className="bg-blue-900/40 border border-blue-500/20 rounded-md p-2 flex flex-col items-center">
                            <span className="text-blue-400 text-xs font-bold">P</span>
                            <span className="text-white font-black">{history.filter(x => x === 'P').length}</span>
                        </div>
                        <div className="bg-red-900/40 border border-red-500/20 rounded-md p-2 flex flex-col items-center">
                            <span className="text-red-400 text-xs font-bold">B</span>
                            <span className="text-white font-black">{history.filter(x => x === 'B').length}</span>
                        </div>
                        <div className="bg-green-900/40 border border-green-500/20 rounded-md p-2 flex flex-col items-center">
                            <span className="text-green-400 text-xs font-bold">T</span>
                            <span className="text-white font-black">{history.filter(x => x === 'T').length}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* BOTTOM: Betting Grid & Action Bar */}
            <div className="flex-shrink-0 flex flex-col relative z-20 bg-black/80 border-t border-white/10 lg:pt-4">

                {/* 3. Betting Grid */}
                <div className="w-full max-w-4xl mx-auto px-2 lg:px-6 py-2 lg:pb-6 relative flex-1 min-h-[160px] md:min-h-[200px] flex flex-col justify-end">

                    {/* Shadow overlay to make grid pop */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

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
                <div className="bg-gradient-to-t from-[#050505] to-black p-2 md:p-4 border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.8)] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
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
                                className="px-3 md:px-5 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/90 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm backdrop-blur flex-1"
                            >
                                Repeat
                            </button>
                            <button
                                onClick={clearBets}
                                disabled={gameState !== 'betting' || Object.keys(myBets).length === 0}
                                className="px-3 md:px-5 py-2.5 rounded-lg border border-red-500/20 bg-red-950/40 hover:bg-red-900/60 active:bg-red-800/60 text-red-200 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm backdrop-blur flex-1"
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
