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
                    {/* PAIRS ROW */}
                    <div className="flex h-[35%] gap-1 md:gap-2">
                        {/* P. Pair */}
                        <BetButton
                            zone="player_pair" label="P. PAIR" ratio="11:1"
                            color="blue" gameState={gameState}
                            betAmount={myBets['player_pair']} placeBet={placeBet}
                        />
                        {/* Tie */}
                        <BetButton
                            zone="tie" label="TIE" ratio="8:1"
                            color="green" gameState={gameState}
                            betAmount={myBets['tie']} placeBet={placeBet}
                            flex={1.5}
                        />
                        {/* B. Pair */}
                        <BetButton
                            zone="banker_pair" label="B. PAIR" ratio="11:1"
                            color="red" gameState={gameState}
                            betAmount={myBets['banker_pair']} placeBet={placeBet}
                        />
                    </div>

                    {/* MAIN ROW */}
                    <div className="flex h-[65%] gap-1 md:gap-2">
                        {/* Player */}
                        <BetButton
                            zone="player" label="PLAYER" ratio="1:1"
                            color="blue" gameState={gameState}
                            betAmount={myBets['player']} placeBet={placeBet}
                            isMain
                        />
                        {/* Banker */}
                        <BetButton
                            zone="banker" label="BANKER" ratio="1:0.95"
                            color="red" gameState={gameState}
                            betAmount={myBets['banker']} placeBet={placeBet}
                            isMain
                        />
                    </div>
                </div>
            </div>

            {/* Action Bar (Chips) */}
            <div className="bg-gradient-to-t from-[#050505] to-black p-2 md:p-4 border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.8)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-colors">
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
                                            : "border-white/30 hover:border-white/50 grayscale-[20%] hover:grayscale-0 active:scale-95 shadow-md"
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
                                    {isSelected && <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur-md -z-10" />}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex md:flex-col gap-2 shrink-0">
                        <button
                            disabled={gameState !== 'betting'}
                            className="px-3 md:px-5 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/90 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm flex-1"
                        >
                            Repeat
                        </button>
                        <button
                            onClick={clearBets}
                            disabled={gameState !== 'betting' || Object.keys(myBets).length === 0}
                            className="px-3 md:px-5 py-2.5 rounded-lg border border-red-500/20 bg-red-950/40 hover:bg-red-900/60 active:bg-red-800/60 text-red-200 text-[10px] md:text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm flex-1"
                        >
                            Clear
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
    const isWinner = gameState === 'result' && false; // We'd pass winner state if needed, omitting for brevity here to keep it simple, or we can handle glowing via CSS

    const colors = {
        blue: "from-blue-900/40 to-blue-950/60 border-blue-500/30 hover:border-blue-400 text-blue-300 chip-blue",
        red: "from-red-900/40 to-red-950/60 border-red-500/30 hover:border-red-400 text-red-300 chip-red",
        green: "from-green-900/40 to-green-950/60 border-green-500/30 hover:border-green-400 text-green-300 chip-green"
    };

    const c = colors[color as keyof typeof colors];

    return (
        <button
            onClick={() => placeBet(zone)}
            disabled={!isBetting}
            style={{ flex }}
            className={cn(
                "rounded-xl border-2 transition-all relative flex flex-col items-center justify-center overflow-hidden group",
                "bg-gradient-to-b", c.split('chip')[0],
                isBetting ? "cursor-pointer active:scale-[0.98] hover:bg-opacity-80" : "cursor-not-allowed opacity-80"
            )}
        >
            <span className={cn(
                isMain ? "text-xl md:text-3xl font-black text-white drop-shadow-lg" : "text-xs md:text-sm font-bold",
                "tracking-widest transition-colors z-10",
            )}>{label}</span>
            <span className="text-[10px] md:text-xs opacity-60 font-mono mt-0.5 z-10">{ratio}</span>

            {/* Placed Bet Chip */}
            {betAmount > 0 && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                >
                    <div className={cn(
                        "w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-yellow-400 shadow-[0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-center",
                        color === 'blue' ? "bg-blue-600" : color === 'red' ? "bg-red-600" : "bg-green-600"
                    )}>
                        <div className="bg-black/90 px-2 md:px-3 py-0.5 rounded-full text-[10px] md:text-xs font-black text-white border border-yellow-500/50">
                            {betAmount >= 1000 ? `${betAmount / 1000}K` : betAmount}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Glowing active state */}
            {isBetting && <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors z-0" />}
        </button>
    );
};
