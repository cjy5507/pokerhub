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

const chips = [100, 500, 1000, 5000, 10000, 25000];

const BETTING_GRID_CSS = `
@keyframes zonePulse {
  0% { box-shadow: 0 0 0 0 rgba(96,165,250,0.16); }
  100% { box-shadow: 0 0 0 12px rgba(96,165,250,0); }
}
@keyframes buttonReveal {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@media (max-width: 480px) {
  .chip-scroll-row {
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.2rem;
    scrollbar-width: none;
  }
  .chip-scroll-row::-webkit-scrollbar { display: none; }
}
`;

const BaccaratBettingGridComponent: React.FC<BaccaratBettingGridProps> = ({
    gameState,
    myBets,
    selectedChip,
    setSelectedChip,
    placeBet,
    clearBets
}) => {
    const isBetting = gameState === 'betting';
    const hasAnyBet = Object.values(myBets).some((amount) => amount > 0);
    const phaseCopy = isBetting ? '베팅 중' : gameState === 'dealing' ? '딜링 중' : gameState === 'result' ? '결과 집계 중' : '대기';

    return (
        <div className="flex-shrink-0 flex flex-col relative z-20 border-t border-white/15 bg-[#080b13] transition-colors">
            <style dangerouslySetInnerHTML={{ __html: BETTING_GRID_CSS }} />

            <div className="px-2 md:px-4 py-2">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/70">베팅판</span>
                            <span className="inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-[10px] tracking-widest text-white/90">
                                {phaseCopy}
                            </span>
                        </div>
                        <span className="text-[10px] text-white/40">
                            {isBetting ? '영역을 눌러 베팅하세요' : '베팅 시간 이후에는 입력이 잠깁니다'}
                        </span>
                    </div>

                    <div className="grid gap-2 pb-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <BetButton
                                zone="player"
                                label="플레이어"
                                ratio="1:1"
                                color="blue"
                                gameState={gameState}
                                betAmount={myBets['player']}
                                placeBet={placeBet}
                            />
                            <BetButton
                                zone="tie"
                                label="타이"
                                ratio="8:1"
                                color="green"
                                gameState={gameState}
                                betAmount={myBets['tie']}
                                placeBet={placeBet}
                            />
                            <BetButton
                                zone="banker"
                                label="뱅커"
                                ratio="1:0.95"
                                color="red"
                                gameState={gameState}
                                betAmount={myBets['banker']}
                                placeBet={placeBet}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <BetButton
                                zone="player_pair"
                                label="P.페어"
                                ratio="11:1"
                                color="blue"
                                gameState={gameState}
                                betAmount={myBets['player_pair']}
                                placeBet={placeBet}
                            />
                            <BetButton
                                zone="banker_pair"
                                label="B.페어"
                                ratio="11:1"
                                color="red"
                                gameState={gameState}
                                betAmount={myBets['banker_pair']}
                                placeBet={placeBet}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-2 md:mx-4 pb-3">
                <div className="max-w-6xl mx-auto">
                    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                            <div className="chip-scroll-row flex gap-2 flex-wrap sm:flex-nowrap pb-2 sm:pb-0">
                                {chips.map((chip) => {
                                    const isSelected = selectedChip === chip;
                                    return (
                                        <motion.button
                                            key={chip}
                                            onClick={() => setSelectedChip(chip)}
                                            animate={isSelected ? { y: -8, scale: 1.12 } : { y: 0, scale: 1 }}
                                            transition={{ type: "spring", stiffness: 320, damping: 24 }}
                                            className={cn(
                                                "relative w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                                isSelected
                                                    ? "border-emerald-300/80 bg-white/15"
                                                    : "border-white/25 bg-white/5 hover:bg-white/10"
                                            )}
                                            style={{
                                                boxShadow: isSelected ? '0 0 0 7px rgba(16,185,129,0.1)' : undefined,
                                                backgroundImage: isSelected
                                                    ? 'repeating-conic-gradient(from 0deg, #333 0deg 15deg, #4ade80 15deg 30deg)'
                                                    : 'repeating-conic-gradient(from 0deg, #111 0deg 15deg, #222 15deg 30deg)',
                                            }}
                                        >
                                            <div className={cn(
                                                "absolute inset-[2px] rounded-full border border-white/20 flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]",
                                                chip >= 25000 ? "bg-gradient-to-b from-purple-600 to-purple-900"
                                                    : chip >= 10000 ? "bg-gradient-to-b from-red-600 to-red-900"
                                                        : chip >= 5000 ? "bg-gradient-to-b from-blue-600 to-blue-900"
                                                            : "bg-gradient-to-b from-emerald-600 to-emerald-900"
                                            )}>
                                                <span className="text-[10px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]">
                                                    {chip >= 1000 ? `${chip / 1000}K` : chip}
                                                </span>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="px-3 py-2.5 rounded-xl border border-blue-300/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-40 disabled:cursor-not-allowed min-w-20 transition"
                                    disabled={gameState !== 'betting'}
                                >
                                    재베팅
                                </button>
                                <button
                                    onClick={clearBets}
                                    disabled={!isBetting || !hasAnyBet}
                                    className="px-3 py-2.5 rounded-xl border border-red-300/45 bg-red-500/10 hover:bg-red-500/20 text-red-200 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-35 disabled:cursor-not-allowed min-w-20 transition"
                                    style={{ animation: isBetting && hasAnyBet ? 'zonePulse 1.4s ease-out infinite' : undefined }}
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-white/40 mt-2 px-1">
                        선택한 칩: <span className="font-black text-white/80">{selectedChip >= 1000 ? `${selectedChip / 1000}K` : selectedChip}P</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export const BaccaratBettingGrid = React.memo(BaccaratBettingGridComponent);

// Mini BetButton Component
interface BetButtonProps {
    zone: BetZone;
    label: string;
    ratio: string;
    color: 'blue' | 'red' | 'green';
    gameState: 'waiting' | 'betting' | 'dealing' | 'result';
    betAmount: number;
    placeBet: (zone: BetZone) => void;
}

const BetButton = ({
    zone,
    label,
    ratio,
    color,
    gameState,
    betAmount,
    placeBet,
}: BetButtonProps) => {
    const isBetting = gameState === 'betting';
    const theme = {
        blue: "bg-gradient-to-br from-sky-950/90 to-sky-900/90 border-sky-400/35 text-sky-200",
        red: "bg-gradient-to-br from-rose-950/90 to-rose-900/90 border-rose-400/35 text-rose-200",
        green: "bg-gradient-to-br from-emerald-950/90 to-emerald-900/90 border-emerald-400/35 text-emerald-200",
    }[color];

    return (
        <motion.button
            onClick={() => placeBet(zone)}
            disabled={!isBetting}
            whileTap={isBetting ? { scale: 0.98 } : undefined}
            className={cn(
                "relative h-20 rounded-2xl border-[1px] px-3 flex items-center justify-center overflow-hidden transition-all",
                theme,
                isBetting ? "hover:brightness-110 cursor-pointer" : "cursor-not-allowed opacity-55"
            )}
            style={{ animation: isBetting ? 'zonePulse 1.2s ease-out infinite' : undefined }}
        >
            <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-sm md:text-base font-black tracking-[0.12em]">{label}</span>
                <span className="text-[11px] text-white/70 mt-0.5">{ratio}</span>
                {betAmount > 0 && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-1 inline-flex min-h-6 min-w-16 px-2 rounded-full bg-black/50 border border-white/20"
                    >
                        <span className="text-[10px] font-black text-white/95">
                            {betAmount >= 1000 ? `${betAmount / 1000}K` : betAmount}P
                        </span>
                    </motion.div>
                )}
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 bg-white/[0.06]" />
        </motion.button>
    );
};
