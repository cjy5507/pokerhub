import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type BetZone = 'player' | 'banker' | 'tie' | 'player_pair' | 'banker_pair';

interface BaccaratBettingGridProps {
    gameState: 'waiting' | 'betting' | 'dealing' | 'result';
    myBets: Record<string, number>;
    selectedChip: number;
    setSelectedChip: (chip: number) => void;
    placeBet: (zone: BetZone) => void;
    clearBets: () => void;
}

const chips = [100, 500, 1000, 5000, 10000, 50000];

export const BaccaratBettingGrid: React.FC<BaccaratBettingGridProps> = ({
    gameState,
    myBets,
    selectedChip,
    setSelectedChip,
    placeBet,
    clearBets
}) => {
    return (
        <div className="flex-shrink-0 flex flex-col relative z-20 bg-black/90 border-t border-white/10 lg:pt-4 transition-colors">

            {/* Betting Grid */}
            <div className="w-full max-w-4xl mx-auto px-2 lg:px-6 py-2 lg:pb-6 relative flex-1 min-h-[180px] md:min-h-[220px] flex flex-col justify-end">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none transition-colors" />

                <div className="flex flex-col gap-1 md:gap-2 h-full relative z-10 w-full">
                    {/* MAIN ROW (TOP) */}
                    <div className="flex h-[55%] gap-2 md:gap-3">
                        {/* Player */}
                        <BetButton
                            zone="player" label="플레이어" ratio="1:1"
                            color="blue" gameState={gameState}
                            betAmount={myBets['player']} placeBet={placeBet}
                            isMain flex={1}
                        />
                        {/* Tie */}
                        <BetButton
                            zone="tie" label="타이" ratio="8:1"
                            color="green" gameState={gameState}
                            betAmount={myBets['tie']} placeBet={placeBet}
                            flex={0.8}
                        />
                        {/* Banker */}
                        <BetButton
                            zone="banker" label="뱅커" ratio="1:0.95"
                            color="red" gameState={gameState}
                            betAmount={myBets['banker']} placeBet={placeBet}
                            isMain flex={1}
                        />
                    </div>

                    {/* PAIRS ROW (BOTTOM) */}
                    <div className="flex h-[45%] gap-2 md:gap-3">
                        {/* P. Pair */}
                        <BetButton
                            zone="player_pair" label="P. 페어" ratio="11:1"
                            color="blue" gameState={gameState}
                            betAmount={myBets['player_pair']} placeBet={placeBet}
                        />
                        {/* B. Pair */}
                        <BetButton
                            zone="banker_pair" label="B. 페어" ratio="11:1"
                            color="red" gameState={gameState}
                            betAmount={myBets['banker_pair']} placeBet={placeBet}
                        />
                    </div>
                </div>
            </div>

            {/* Action Bar (Chips) */}
            <div className="bg-[#0a0a0a] p-2 md:p-4 border-t border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.9)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-colors z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    {/* Chip Selection */}
                    <div className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide flex-1 justify-center px-2 py-1 items-end min-h-[70px]">
                        {chips.map(chip => {
                            const isSelected = selectedChip === chip;
                            return (
                                <motion.button
                                    key={chip}
                                    onClick={() => setSelectedChip(chip)}
                                    animate={isSelected ? { y: -12, scale: 1.15 } : { y: 0, scale: 1 }}
                                    className={cn(
                                        "relative w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] flex items-center justify-center transition-all flex-shrink-0 group",
                                        isSelected
                                            ? "border-yellow-400 shadow-[0_10px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(250,204,21,0.5)] z-10"
                                            : "border-[#333] hover:border-[#666] grayscale-[30%] hover:grayscale-0 active:scale-95 shadow-lg"
                                    )}
                                    style={{
                                        background: isSelected
                                            ? 'repeating-conic-gradient(from 0deg, #333 0deg 15deg, #555 15deg 30deg)'
                                            : 'repeating-conic-gradient(from 0deg, #111 0deg 15deg, #222 15deg 30deg)'
                                    }}
                                >
                                    <div className={cn(
                                        "absolute inset-[3px] rounded-full border-[2px] border-white/20 flex flex-col items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]",
                                        chip >= 50000 ? "bg-gradient-to-b from-purple-500 to-purple-900"
                                            : chip >= 10000 ? "bg-gradient-to-b from-red-500 to-red-900"
                                                : chip >= 1000 ? "bg-gradient-to-b from-blue-500 to-blue-900"
                                                    : "bg-gradient-to-b from-green-500 to-green-900"
                                    )}>
                                        <div className="absolute inset-1 rounded-full border border-white/10" />
                                        <span className="text-[11px] md:text-sm font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10 tracking-tighter">
                                            {chip >= 1000 ? `${chip / 1000}K` : chip}
                                        </span>
                                    </div>
                                    {isSelected && <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur-md -z-10" />}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex md:flex-col gap-2 shrink-0">
                        <button
                            disabled={gameState !== 'betting'}
                            className="px-4 md:px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/90 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm flex-1"
                        >
                            재베팅
                        </button>
                        <button
                            onClick={clearBets}
                            disabled={gameState !== 'betting' || Object.keys(myBets).length === 0}
                            className="px-4 md:px-6 py-3 rounded-xl border border-red-500/30 bg-red-950/60 hover:bg-red-900/80 active:bg-red-800/80 text-red-200 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm flex-1"
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Mini BetButton Component
const BetButton = ({ zone, label, ratio, color, gameState, betAmount, placeBet, flex = 1, isMain = false }: any) => {
    const isBetting = gameState === 'betting';
    const isWinner = gameState === 'result' && false; // Future enhancement: highlight winning zone

    const colors = {
        blue: "bg-gradient-to-br from-[#1e3a8a]/80 to-[#172554]/90 border-[#3b82f6]/40 hover:border-[#3b82f6]/80 text-[#bfdbfe] shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]",
        red: "bg-gradient-to-br from-[#7f1d1d]/80 to-[#450a0a]/90 border-[#ef4444]/40 hover:border-[#ef4444]/80 text-[#fecaca] shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]",
        green: "bg-gradient-to-br from-[#14532d]/80 to-[#052e16]/90 border-[#22c55e]/40 hover:border-[#22c55e]/80 text-[#bbf7d0] shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]"
    };

    const c = colors[color as keyof typeof colors];

    return (
        <button
            onClick={() => placeBet(zone)}
            disabled={!isBetting}
            style={{ flex }}
            className={cn(
                "rounded-xl border-[1.5px] transition-all duration-300 relative flex flex-col items-center justify-center overflow-hidden group backdrop-blur-sm",
                c,
                isBetting ? "cursor-pointer active:scale-[0.98] hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "cursor-not-allowed opacity-60 grayscale-[30%]"
            )}
        >
            <span className={cn(
                isMain ? "text-xl md:text-3xl font-black text-white drop-shadow-md" : "text-sm md:text-base font-bold",
                "tracking-widest transition-colors z-10",
            )}>{label}</span>
            <span className="text-[10px] md:text-xs opacity-70 font-mono mt-0.5 z-10 text-white/70">{ratio}</span>

            {/* Placed Bet Chip */}
            {betAmount > 0 && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                    <div className={cn(
                        "w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-yellow-400 shadow-[0_8px_16px_rgba(0,0,0,0.8)] flex items-center justify-center",
                        color === 'blue' ? "bg-gradient-to-b from-blue-500 to-blue-700" : color === 'red' ? "bg-gradient-to-b from-red-500 to-red-700" : "bg-gradient-to-b from-green-500 to-green-700"
                    )}>
                        <div className="bg-black/80 px-2 md:px-3 py-0.5 rounded-full text-[10px] md:text-xs font-black text-white border border-yellow-500/50 shadow-inner">
                            {betAmount >= 1000 ? `${betAmount / 1000}K` : betAmount}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Glowing active state */}
            {isBetting && <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors z-0" />}
        </button>
    );
};
