import React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

export const BaccaratDealer: React.FC<BaccaratDealerProps> = ({
    gameState,
    timeRemaining,
    playerCards,
    bankerCards,
    playerScore,
    bankerScore,
    revealedCards
}) => {
    const isDealing = gameState === 'dealing' || gameState === 'result';

    // The dealer head motion
    const dealerMotion: any = gameState === 'dealing'
        ? { y: [0, -5, 0], rotate: [0, -2, 2, 0], transition: { duration: 0.8, ease: "easeInOut" } }
        : { y: [0, -2, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } };

    return (
        <div className="flex-1 relative flex flex-col justify-center items-center py-6 min-h-[250px] lg:min-h-0">
            {/* Dealer Character */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                <motion.div animate={dealerMotion} className="relative flex flex-col items-center">
                    {/* Hat */}
                    <div className="relative z-10 w-14 h-5 md:w-16 md:h-6 bg-gradient-to-b from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 rounded-full shadow-md border border-slate-600/50 flex items-center justify-center -mb-1">
                        <div className="w-10 md:w-12 h-[2px] bg-yellow-400/80 rounded-full" />
                    </div>
                    {/* Head */}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-300 dark:to-amber-400 mx-auto relative border-2 border-amber-400/50 shadow-md z-0 shadow-amber-900/50">
                        {/* Eyes */}
                        <div className="absolute top-[42%] left-[26%] w-1.5 h-2 md:w-2 md:h-2.5 bg-slate-800 rounded-full" />
                        <div className="absolute top-[42%] right-[26%] w-1.5 h-2 md:w-2 md:h-2.5 bg-slate-800 rounded-full" />
                        {/* Checkes */}
                        <div className="absolute top-[55%] left-[15%] w-2 h-1.5 bg-rose-400/60 rounded-full blur-[1px]" />
                        <div className="absolute top-[55%] right-[15%] w-2 h-1.5 bg-rose-400/60 rounded-full blur-[1px]" />
                    </div>
                    {/* Body */}
                    <div className="w-16 h-10 md:w-20 md:h-12 bg-gradient-to-b from-red-900 to-red-950 rounded-b-2xl relative overflow-hidden border-x-2 border-b-2 border-red-800/50 -mt-1 shadow-inner shadow-black/50">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-3 md:w-5 md:h-3">
                            <div className="absolute inset-0 flex"><div className="w-1/2 h-full bg-black rounded-l-full" /><div className="w-1/2 h-full bg-black rounded-r-full" /></div>
                        </div>
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[1px] h-full bg-white/20" />
                    </div>
                    {/* Dealer Arms (Hidden in idle, move when dealing) */}
                    <motion.div
                        animate={gameState === 'dealing' ? { y: [0, 15, 0], x: [-5, -15, -5], scaleY: [1, 1.2, 1], rotate: [0, 15, 0] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        className="absolute top-14 -left-1 w-3 h-8 bg-red-950 rounded-full border border-red-900/50 shadow-md origin-top -z-10"
                    />
                    <motion.div
                        animate={gameState === 'dealing' ? { y: [0, 15, 0], x: [5, 15, 5], scaleY: [1, 1.2, 1], rotate: [0, -15, 0] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                        className="absolute top-14 -right-1 w-3 h-8 bg-red-950 rounded-full border border-red-900/50 shadow-md origin-top -z-10"
                    />
                </motion.div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 mt-2 uppercase tracking-widest drop-shadow-md">딜러</span>
            </div>

            {/* Status Indicator */}
            <div className="absolute top-20 lg:top-24 w-full flex justify-center z-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={gameState}
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 1.1 }}
                        className={cn(
                            "px-6 py-2 md:py-3 rounded-full border backdrop-blur-xl shadow-2xl",
                            gameState === 'betting' ? "bg-amber-500/10 border-amber-500/50" :
                                gameState === 'dealing' ? "bg-black/80 border-white/20" :
                                    "bg-green-500/10 border-green-500/50"
                        )}
                    >
                        <div className={cn(
                            "flex items-center justify-center gap-2 text-sm md:text-lg font-black uppercase tracking-widest",
                            gameState === 'betting' ? "text-amber-500 animate-pulse" :
                                gameState === 'dealing' ? "text-white" : "text-green-500"
                        )}>
                            {gameState === 'betting' ? (
                                <>
                                    <span>베팅해 주세요</span>
                                    <span className="text-xs md:text-sm opacity-80 mt-0.5">({timeRemaining}초)</span>
                                </>
                            ) : gameState === 'dealing' ? "베팅 마감" : "결과"}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Cards Display */}
            <div className="flex justify-center gap-8 md:gap-24 relative z-10 w-full px-4 mt-20 md:mt-12">

                {/* Player Side */}
                <div className="flex flex-col items-center flex-1 max-w-[200px]">
                    <div className="flex justify-center gap-2 relative min-h-[140px] md:min-h-[160px] w-full">
                        <AnimatePresence>
                            {playerCards.map((card, i) => {
                                const dealIndex = i === 0 ? 0 : i === 1 ? 2 : 4;
                                const isFlipped = revealedCards > dealIndex;
                                return (
                                    <motion.div
                                        key={`p-${i}`}
                                        initial={{ opacity: 0, x: 100, y: -250, scale: 0.1, rotateY: 180, rotateZ: 180 }}
                                        animate={{
                                            opacity: 1,
                                            x: i === 2 ? 10 : 0,
                                            y: i === 2 ? 10 : 0,
                                            scale: isFlipped ? [1, 1.15, 1] : 1, // Squeeze effect
                                            rotateY: isFlipped ? 0 : 180,
                                            rotateZ: i === 2 ? 90 : 0
                                        }}
                                        transition={{
                                            opacity: { duration: 0.3, delay: dealIndex * 0.15 },
                                            x: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                            y: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                            rotateZ: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                            rotateY: { duration: 0.8, ease: [0.175, 0.885, 0.32, 1.1], delay: dealIndex * 0.4 }, // Dramatic flip
                                            scale: { duration: 0.8, ease: "easeInOut", delay: dealIndex * 0.4 }
                                        }}
                                        className={cn(
                                            "relative w-16 h-24 md:w-20 md:h-28 will-change-transform",
                                            "[transform-style:preserve-3d]",
                                            i === 2 ? "absolute -right-6 md:-right-10 top-2 lg:top-4 z-10" : "z-0"
                                        )}
                                    >
                                        <CardFront card={card} />
                                        <CardBack />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {playerCards.length === 0 && <EmptyCardSlot />}
                    </div>

                    <div className="mt-8 flex flex-col items-center">
                        <span className={cn(
                            "text-sm md:text-md font-black uppercase tracking-widest px-6 py-1 rounded-full",
                            "bg-blue-600/20 text-blue-400 border border-blue-500/30",
                            gameState === 'result' && playerScore !== null && bankerScore !== null && playerScore > bankerScore
                                ? "shadow-[0_0_30px_rgba(59,130,246,0.6)] ring-2 ring-blue-500 scale-110 bg-blue-600/40 text-blue-300" : ""
                        )}>플레이어</span>
                        <motion.div
                            key={playerScore}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-3 text-5xl md:text-6xl font-black font-mono text-white drop-shadow-md"
                        >
                            {(isDealing) && playerScore !== null ? playerScore : '?'}
                        </motion.div>
                    </div>
                </div>

                {/* VS */}
                <div className="hidden lg:flex flex-col items-center justify-center px-4">
                    <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                    <span className="text-white/30 text-xs font-black italic my-2 uppercase tracking-[0.3em]">VS</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                </div>

                {/* Banker Side */}
                <div className="flex flex-col items-center flex-1 max-w-[200px]">
                    <div className="flex justify-center gap-2 relative min-h-[140px] md:min-h-[160px] w-full">
                        <AnimatePresence>
                            {bankerCards.map((card, i) => {
                                const dealIndex = i === 0 ? 1 : i === 1 ? 3 : 5;
                                const isFlipped = revealedCards > dealIndex;
                                return (
                                    <motion.div
                                        key={`b-${i}`}
                                        initial={{ opacity: 0, x: -100, y: -250, scale: 0.1, rotateY: 180, rotateZ: -180 }}
                                        animate={{
                                            opacity: 1,
                                            x: i === 2 ? -10 : 0,
                                            y: i === 2 ? 10 : 0,
                                            scale: isFlipped ? [1, 1.15, 1] : 1, // Squeeze effect
                                            rotateY: isFlipped ? 0 : 180,
                                            rotateZ: i === 2 ? -90 : 0
                                        }}
                                        transition={{
                                            opacity: { duration: 0.3, delay: dealIndex * 0.15 },
                                            x: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                            y: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                            rotateZ: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                                            rotateY: { duration: 0.8, ease: [0.175, 0.885, 0.32, 1.1], delay: dealIndex * 0.4 }, // Dramatic flip
                                            scale: { duration: 0.8, ease: "easeInOut", delay: dealIndex * 0.4 }
                                        }}
                                        className={cn(
                                            "relative w-16 h-24 md:w-20 md:h-28 will-change-transform",
                                            "[transform-style:preserve-3d]",
                                            i === 2 ? "absolute -left-6 md:-left-10 top-2 lg:top-4 z-10" : "z-0"
                                        )}
                                    >
                                        <CardFront card={card} />
                                        <CardBack />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {bankerCards.length === 0 && <EmptyCardSlot />}
                    </div>

                    <div className="mt-8 flex flex-col items-center">
                        <span className={cn(
                            "text-sm md:text-md font-black uppercase tracking-widest px-6 py-1 rounded-full",
                            "bg-red-600/20 text-red-400 border border-red-500/30",
                            gameState === 'result' && playerScore !== null && bankerScore !== null && bankerScore > playerScore
                                ? "shadow-[0_0_30px_rgba(220,38,38,0.6)] ring-2 ring-red-500 scale-110 bg-red-600/40 text-red-300" : ""
                        )}>뱅커</span>
                        <motion.div
                            key={bankerScore}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mt-3 text-5xl md:text-6xl font-black font-mono text-white drop-shadow-md"
                        >
                            {(isDealing) && bankerScore !== null ? bankerScore : '?'}
                        </motion.div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// Extracted mini-components for readability

const CardFront = ({ card }: { card: any }) => (
    <div className={cn(
        "absolute inset-0 rounded-lg [backface-visibility:hidden] bg-white flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-slate-200",
        getSuitColor(card.suit)
    )}>
        <span className="absolute top-1 left-1.5 text-xs md:text-sm font-black tracking-tighter">{card.value}</span>
        <SuitIcon suit={card.suit} className="w-8 h-8 md:w-12 md:h-12 opacity-100" />
        <span className="absolute bottom-1 right-1.5 text-xs md:text-sm font-black tracking-tighter rotate-180">{card.value}</span>
    </div>
);

const CardBack = () => (
    <div className="absolute inset-0 rounded-lg [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-blue-900 to-black border-[3px] border-white/20 flex items-center justify-center shadow-2xl">
        <div className="w-[85%] h-[85%] border-2 border-dashed border-blue-400/30 rounded-md flex items-center justify-center bg-blue-900/40">
            <span className="text-white/50 text-xs font-black tracking-widest opacity-80">VIP</span>
        </div>
    </div>
);

const EmptyCardSlot = () => (
    <div className="w-16 h-24 md:w-20 md:h-28 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center bg-black/20">
        <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest">Card</span>
    </div>
);
