import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentDealer, getDealerPhrase } from '@/lib/games/dealers';

export const SuitIcon = ({ suit, className = "w-6 h-6" }: { suit: string; className?: string }) => {
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

export const getSuitColor = (suit: string) => suit === 'H' || suit === 'D' ? 'text-rose-600' : 'text-slate-900';

interface BaccaratDealerProps {
    gameState: 'waiting' | 'betting' | 'dealing' | 'result';
    timeRemaining: number;
    playerCards: any[];
    bankerCards: any[];
    playerScore: number | null;
    bankerScore: number | null;
    revealedCards: number;
}

const BaccaratDealerComponent: React.FC<BaccaratDealerProps> = ({
    gameState,
    timeRemaining,
    playerCards,
    bankerCards,
    playerScore,
    bankerScore,
    revealedCards
}) => {
    const isDealing = gameState === 'dealing' || gameState === 'result';
    const isAnimating = gameState === 'dealing' && revealedCards < (playerCards.length + bankerCards.length);

    const dealer = useMemo(() => getCurrentDealer(), []);
    const [phrase, setPhrase] = useState('');

    useEffect(() => {
        const state = gameState === 'result'
            ? (playerScore !== null && bankerScore !== null
                ? (playerScore > bankerScore ? 'playerWin'
                    : bankerScore > playerScore ? 'bankerWin' : 'tie')
                : 'betting')
            : gameState === 'dealing' ? 'dealing' : 'betting';
        setPhrase(getDealerPhrase(dealer, state));
    }, [gameState, dealer, playerScore, bankerScore]);

    return (
        <div className="flex-1 relative flex flex-col justify-center items-center py-6 min-h-[250px] lg:min-h-0">
            {/* Dealer Character */}
            <div className="flex flex-col items-center gap-1 mb-2">
                <div className="relative">
                    {/* Speech bubble */}
                    {phrase && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-lg z-10">
                            {phrase}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-700 rotate-45" />
                        </div>
                    )}
                    {/* Character */}
                    <div
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg border-2"
                        style={{
                            backgroundColor: `${dealer.color}20`,
                            borderColor: dealer.color,
                            boxShadow: `0 4px 20px ${dealer.color}30`,
                        }}
                    >
                        {dealer.emoji}
                    </div>
                    {/* Hat */}
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg md:text-xl">
                        {dealer.hat}
                    </span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: dealer.color }}>
                    {dealer.name}
                </span>
            </div>

            {/* HEADER: PLAYER vs Timer vs BANKER */}
            <div className="flex items-center justify-center w-full max-w-3xl mx-auto mt-20 md:mt-16 mb-2 md:mb-4 z-20">
                <div className="flex-1 text-right pr-6 md:pr-10 relative">
                    <span className="text-2xl md:text-4xl font-black text-blue-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">PLAYER</span>
                    {/* Player WIN Badge */}
                    <AnimatePresence>
                        {gameState === 'result' && playerScore !== null && bankerScore !== null && playerScore > bankerScore && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="absolute -top-4 right-8 bg-blue-600 text-white px-3 py-0.5 rounded-full font-black text-[10px] md:text-xs tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.8)] border border-blue-400 z-30"
                            >
                                WIN
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Central Circle (Score or Timer) */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white dark:bg-[#111418] border-4 border-slate-200 dark:border-[#2a3038] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-30 shrink-0">
                    {gameState === 'betting' ? (
                        <div className="flex flex-col items-center relative z-10">
                            <span className="text-xl md:text-2xl font-black text-yellow-600 dark:text-yellow-500 leading-none">{timeRemaining}</span>
                        </div>
                    ) : (
                        <span className="text-sm font-black text-slate-400 dark:text-white/50 italic leading-none">VS</span>
                    )}

                    {/* Circular Progress Ring for Betting */}
                    {gameState === 'betting' && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="50%" cy="50%" r="46%" fill="none" stroke="currentColor" className="text-yellow-500/20 dark:text-yellow-500/15" strokeWidth="8%" />
                            <circle cx="50%" cy="50%" r="46%" fill="none" stroke="currentColor" className="text-yellow-500 transition-all duration-1000 ease-linear" strokeWidth="8%" strokeDasharray="290%" strokeDashoffset={`${290 - (290 * (timeRemaining / 15))}%`} />
                        </svg>
                    )}
                </div>

                <div className="flex-1 text-left pl-6 md:pl-10 relative">
                    <span className="text-2xl md:text-4xl font-black text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">BANKER</span>
                    {/* Banker WIN Badge */}
                    <AnimatePresence>
                        {gameState === 'result' && playerScore !== null && bankerScore !== null && bankerScore > playerScore && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0, x: -20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="absolute -top-4 left-8 bg-red-600 text-white px-3 py-0.5 rounded-full font-black text-[10px] md:text-xs tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.8)] border border-red-400 z-30"
                            >
                                WIN
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Cards Display / Action Area */}
            <div className="flex justify-center items-start gap-1 md:gap-4 relative z-10 w-full px-2 max-w-4xl mx-auto mb-4 md:mb-8">

                {/* Player Cards */}
                <div className="flex justify-end gap-1 md:gap-2 relative min-h-[85px] sm:min-h-[120px] w-[130px] sm:w-[160px] md:w-[240px] shrink-0">
                    <AnimatePresence>
                        {playerCards.map((card, i) => {
                            const dealIndex = i === 0 ? 0 : i === 1 ? 2 : 4;
                            const isFlipped = revealedCards > dealIndex;
                            return (
                                <motion.div
                                    key={`p-${i}`}
                                    initial={{ opacity: 0, x: 100, y: -250, scale: 0.1, rotateY: 180, rotateZ: 45 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        y: i === 2 ? 10 : 0,
                                        scale: isFlipped ? [1, 1.15, 1] : 1,
                                        rotateY: isFlipped ? 0 : 180,
                                        rotateZ: i === 2 ? 90 : 0
                                    }}
                                    transition={{
                                        opacity: { duration: 0.3, delay: dealIndex * 0.15 },
                                        x: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                        y: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                        rotateZ: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                        rotateY: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.1], delay: dealIndex * 0.4 },
                                        scale: { duration: 0.6, ease: "easeInOut", delay: dealIndex * 0.4 }
                                    }}
                                    className={cn(
                                        "relative w-12 h-[4.5rem] sm:w-14 sm:h-20 md:w-20 md:h-28 shadow-[0_4px_10px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.5)]",
                                        "[transform-style:preserve-3d]",
                                        isAnimating && "will-change-transform",
                                        i === 2 ? "absolute -right-6 sm:-right-8 md:-right-12 top-1 sm:top-2 lg:top-4 z-10" : "z-0"
                                    )}
                                >
                                    <CardFront card={card} />
                                    <CardBack />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    {playerCards.length === 0 && (
                        <div className="flex gap-1 md:gap-2">
                            <EmptyCardSlot />
                            <EmptyCardSlot />
                        </div>
                    )}
                </div>

                {/* Scores VS Block */}
                <div className="flex items-center justify-center px-1 md:px-4 shrink-0 mt-2 md:mt-4">
                    <div className="flex items-center gap-2 md:gap-4 bg-white dark:bg-[#111418] px-3 md:px-5 py-2 md:py-3 rounded-2xl border border-slate-200 dark:border-white/5 shadow-md dark:shadow-[0_4px_15px_rgba(0,0,0,0.6)]">
                        <div className={cn(
                            "text-2xl md:text-4xl font-black w-10 h-10 md:w-14 md:h-14 flex justify-center items-center rounded-xl shadow-inner border border-blue-500/20 transition-colors",
                            playerScore !== null ? "bg-blue-600 text-white shadow-[0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-slate-100 dark:bg-[#1e2329] text-slate-400 dark:text-white/20 border-slate-200 dark:border-blue-500/20"
                        )}>
                            {(isDealing) && playerScore !== null ? playerScore : (playerCards.length > 0 ? (playerScore !== null ? playerScore : "?") : "-")}
                        </div>
                        <span className="text-slate-400 dark:text-white/20 text-[10px] md:text-xs font-black italic mt-1 uppercase tracking-widest hidden sm:block">Score</span>
                        <div className={cn(
                            "text-2xl md:text-4xl font-black w-10 h-10 md:w-14 md:h-14 flex justify-center items-center rounded-xl shadow-inner border border-red-500/20 transition-colors",
                            bankerScore !== null ? "bg-red-600 text-white shadow-[0_4px_10px_rgba(220,38,38,0.3)] dark:shadow-[0_0_15px_rgba(220,38,38,0.4)]" : "bg-slate-100 dark:bg-[#1e2329] text-slate-400 dark:text-white/20 border-slate-200 dark:border-red-500/20"
                        )}>
                            {(isDealing) && bankerScore !== null ? bankerScore : (bankerCards.length > 0 ? (bankerScore !== null ? bankerScore : "?") : "-")}
                        </div>
                    </div>
                </div>

                {/* Banker Cards */}
                <div className="flex justify-start gap-1 md:gap-2 relative min-h-[85px] sm:min-h-[120px] w-[130px] sm:w-[160px] md:w-[240px] shrink-0">
                    <AnimatePresence>
                        {bankerCards.map((card, i) => {
                            const dealIndex = i === 0 ? 1 : i === 1 ? 3 : 5;
                            const isFlipped = revealedCards > dealIndex;
                            return (
                                <motion.div
                                    key={`b-${i}`}
                                    initial={{ opacity: 0, x: -100, y: -250, scale: 0.1, rotateY: 180, rotateZ: -45 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        y: i === 2 ? 10 : 0,
                                        scale: isFlipped ? [1, 1.15, 1] : 1,
                                        rotateY: isFlipped ? 0 : 180,
                                        rotateZ: i === 2 ? -90 : 0
                                    }}
                                    transition={{
                                        opacity: { duration: 0.3, delay: dealIndex * 0.15 },
                                        x: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                        y: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                        rotateZ: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                        rotateY: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.1], delay: dealIndex * 0.4 },
                                        scale: { duration: 0.6, ease: "easeInOut", delay: dealIndex * 0.4 }
                                    }}
                                    className={cn(
                                        "relative w-12 h-[4.5rem] sm:w-14 sm:h-20 md:w-20 md:h-28 shadow-[0_4px_10px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.5)]",
                                        "[transform-style:preserve-3d]",
                                        isAnimating && "will-change-transform",
                                        i === 2 ? "absolute -left-6 sm:-left-8 md:-left-12 top-1 sm:top-2 lg:top-4 z-10" : "z-0"
                                    )}
                                >
                                    <CardFront card={card} />
                                    <CardBack />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    {bankerCards.length === 0 && (
                        <div className="flex gap-1 md:gap-2">
                            <EmptyCardSlot />
                            <EmptyCardSlot />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const BaccaratDealer = React.memo(BaccaratDealerComponent);

// Extracted mini-components for readability

const CardFront = ({ card }: { card: { suit: string; value: string } }) => (
    <div className={cn(
        "absolute inset-0 rounded-lg [backface-visibility:hidden] bg-white flex flex-col items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-slate-200",
        getSuitColor(card.suit)
    )}>
        <span className="absolute top-1 left-1.5 text-xs md:text-sm font-black tracking-tighter">{card.value}</span>
        <SuitIcon suit={card.suit} className="w-8 h-8 md:w-12 md:h-12 opacity-100" />
        <span className="absolute bottom-1 right-1.5 text-xs md:text-sm font-black tracking-tighter rotate-180">{card.value}</span>
    </div>
);

const CardBack = () => (
    <div className="absolute inset-0 rounded-lg [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-blue-900 to-black border-[3px] border-white/20 flex items-center justify-center shadow-md dark:shadow-2xl">
        <div className="w-[85%] h-[85%] border-2 border-dashed border-blue-400/30 rounded-md flex items-center justify-center bg-blue-900/40">
            <span className="text-white/50 text-xs font-black tracking-widest opacity-80">VIP</span>
        </div>
    </div>
);

const EmptyCardSlot = () => (
    <div className="w-12 h-[4.5rem] sm:w-14 sm:h-20 md:w-20 md:h-28 border-[1.5px] border-dashed border-slate-300 dark:border-white/20 rounded-lg flex items-center justify-center bg-slate-100/50 dark:bg-black/40 shadow-inner">
        <span className="text-slate-400 dark:text-white/20 text-[9px] sm:text-[10px] md:text-xs uppercase font-bold tracking-widest">Card</span>
    </div>
);
