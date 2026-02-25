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
            {/* Dealer Character: 3D Animated Terry */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                <motion.div animate={dealerMotion} className="relative flex flex-col items-center drop-shadow-2xl">

                    {/* Hair / Head top */}
                    <div className="relative z-10 w-14 h-7 md:w-16 md:h-8 rounded-t-[3rem] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.6)] -mb-3 overflow-hidden flex justify-center bg-[#1e293b] border-2 border-b-0 border-[#0f172a]">
                        {/* Hair Highlight */}
                        <div className="absolute -top-4 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top,#475569_0%,transparent_60%)] opacity-70" />
                        <div className="absolute top-1 right-3 w-4 h-2 bg-white/10 rounded-full blur-[1px] rotate-[-15deg]" />
                    </div>

                    {/* Face (3D Shaded) */}
                    <div className="w-14 h-16 md:w-16 md:h-20 rounded-[2.5rem] rounded-b-[3rem] bg-gradient-to-b from-[#fcd34d] via-[#fbbf24] to-[#d97706] dark:from-[#fde68a] dark:via-[#f59e0b] dark:to-[#b45309] mx-auto relative border border-[#b45309]/50 shadow-[inset_0_-8px_15px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.4)] z-0 overflow-hidden">

                        {/* Base Face Highlight */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-[2.5rem]" />

                        {/* Eyes */}
                        <div className="absolute top-[35%] left-[20%] w-3 h-2.5 md:w-3.5 md:h-3 bg-[#0f172a] rounded-full flex justify-center items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/20">
                            <div className="w-1.5 h-1.5 bg-white rounded-full translate-x-[1px] -translate-y-[0.5px] shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
                        </div>
                        <div className="absolute top-[35%] right-[20%] w-3 h-2.5 md:w-3.5 md:h-3 bg-[#0f172a] rounded-full flex justify-center items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/20">
                            <div className="w-1.5 h-1.5 bg-white rounded-full -translate-x-[1px] -translate-y-[0.5px] shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
                        </div>

                        {/* Cheeks */}
                        <div className="absolute top-[50%] left-[10%] w-3 h-2 bg-rose-500/30 rounded-full blur-[2px]" />
                        <div className="absolute top-[50%] right-[10%] w-3 h-2 bg-rose-500/30 rounded-full blur-[2px]" />

                        {/* THE BIG HUGE 3D NOSE */}
                        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 w-5 h-7 md:w-6 md:h-9 bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#b45309] rounded-full shadow-[0_6px_8px_rgba(0,0,0,0.3),inset_-2px_-4px_6px_rgba(0,0,0,0.2)] border-x border-b border-[#92400e]/50 z-10 flex flex-col items-center justify-end pb-1 md:pb-1.5 relative">
                            {/* Nose Highlight */}
                            <div className="absolute top-1 w-2 md:w-2.5 h-4 md:h-5 bg-white/40 rounded-full blur-[1px]" />
                            {/* Nostrils */}
                            <div className="flex gap-2 relative z-20">
                                <div className="w-1.5 h-1 md:w-2 md:h-1.5 bg-[#78350f]/80 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                                <div className="w-1.5 h-1 md:w-2 md:h-1.5 bg-[#78350f]/80 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                            </div>
                        </div>

                        {/* Mouth */}
                        <div className="absolute top-[82%] md:top-[85%] left-1/2 -translate-x-1/2 w-5 h-1.5 md:w-6 md:h-2 bg-gradient-to-b from-[#881337] to-[#4c0519] rounded-full opacity-90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border-b border-[#fcd34d]/50" />

                        {/* Chin Shadow */}
                        <div className="absolute bottom-0 w-full h-3 bg-gradient-to-t from-[#78350f]/50 to-transparent" />
                    </div>

                    {/* Neck & Bowtie */}
                    <div className="w-5 h-4 md:w-6 md:h-5 bg-gradient-to-b from-[#92400e] to-[#78350f] relative -mt-2 z-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                        {/* 3D Bowtie */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-4 md:w-10 md:h-5 bg-gradient-to-br from-[#dc2626] to-[#7f1d1d] rounded-sm flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-[#991b1b]">
                            {/* Bowtie Knot */}
                            <div className="w-2.5 h-3 md:w-3 md:h-4 bg-gradient-to-b from-[#ef4444] to-[#991b1b] rounded-md shadow-[0_0_2px_rgba(0,0,0,0.5)] z-10 border border-[#b91c1c]" />
                            {/* Bowtie Creases */}
                            <div className="absolute left-1 border-t-2 border-b-2 border-transparent border-r-4 border-r-[#7f1d1d]/50 h-2 w-0" />
                            <div className="absolute right-1 border-t-2 border-b-2 border-transparent border-l-4 border-l-[#7f1d1d]/50 h-2 w-0" />
                        </div>
                    </div>

                    {/* Body (Vest & Shirt) */}
                    <div className="w-20 h-14 md:w-24 md:h-16 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] rounded-[2rem] rounded-b-[3rem] relative overflow-hidden border-2 border-[#334155]/30 -mt-1 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.8),0_15px_25px_rgba(0,0,0,0.6)] z-0">
                        {/* Vest Texture/Highlight */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#334155_0%,transparent_60%)] opacity-30" />

                        {/* White Shirt Triangle */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-12 md:w-10 md:h-14 bg-gradient-to-b from-[#f8fafc] to-[#cbd5e1] flex justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}>
                            {/* Inner shirt shadow from vest */}
                            <div className="absolute top-0 left-0 w-full h-full shadow-[inset_0_0_5px_rgba(0,0,0,0.8)]" />

                            {/* Buttons */}
                            <div className="mt-4 flex flex-col gap-2 relative z-10">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#0f172a] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#0f172a] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                            </div>
                        </div>
                    </div>

                    {/* Dealer Arms (Hidden in idle, move when dealing) */}
                    <motion.div
                        animate={gameState === 'dealing' ? { y: [0, 15, 0], x: [-5, -15, -5], scaleY: [1, 1.2, 1], rotate: [0, 25, 0] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[4.5rem] md:top-[5.5rem] -left-2 w-4.5 h-12 md:w-5 md:h-14 bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-full border border-[#334155]/50 shadow-[0_5px_10px_rgba(0,0,0,0.5)] origin-top -z-10"
                    />
                    <motion.div
                        animate={gameState === 'dealing' ? { y: [0, 15, 0], x: [5, 15, 5], scaleY: [1, 1.2, 1], rotate: [0, -25, 0] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3, ease: "easeInOut" }}
                        className="absolute top-[4.5rem] md:top-[5.5rem] -right-2 w-4.5 h-12 md:w-5 md:h-14 bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-full border border-[#334155]/50 shadow-[0_5px_10px_rgba(0,0,0,0.5)] origin-top -z-10"
                    />
                </motion.div>

                {/* Name Tag Plate */}
                <div className="flex flex-col items-center mt-3 z-30">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-md blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                        <div className="px-3 py-1 bg-gradient-to-b from-slate-800 to-black rounded-md border border-yellow-500/50 relative shadow-lg flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]" />
                            <span className="text-xs md:text-sm font-black bg-gradient-to-r from-yellow-200 to-yellow-500 text-transparent bg-clip-text tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">TERRY</span>
                        </div>
                    </div>
                </div>
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
