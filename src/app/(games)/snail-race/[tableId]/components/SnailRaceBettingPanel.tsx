'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const SNAILS = [
  { id: 0, name: '지나', color: '#ef4444', shellLight: '#fca5a5', bodyColor: '#fde68a' },
  { id: 1, name: '해연', color: '#3b82f6', shellLight: '#93c5fd', bodyColor: '#bbf7d0' },
  { id: 2, name: '영', color: '#22c55e', shellLight: '#86efac', bodyColor: '#fde68a' },
  { id: 3, name: '뻥카', color: '#f59e0b', shellLight: '#fcd34d', bodyColor: '#fef3c7' },
  { id: 4, name: '우성', color: '#a855f7', shellLight: '#c4b5fd', bodyColor: '#ede9fe' },
  { id: 5, name: '테리', color: '#ec4899', shellLight: '#f9a8d4', bodyColor: '#fce7f3' },
  { id: 6, name: '경원', color: '#06b6d4', shellLight: '#67e8f9', bodyColor: '#cffafe' },
] as const;

const CHIPS = [100, 500, 1000, 5000];

interface SnailRaceBettingPanelProps {
  gameState: 'betting' | 'racing' | 'result';
  balance: number;
  myBets: Record<string, number>;
  selectedChip: number;
  setSelectedChip: (chip: number) => void;
  placeBet: (snailId: number) => Promise<void>;
  clearBets: () => Promise<void>;
  participants: number[];
  odds: Record<number, number>;
}

const SnailRaceBettingPanelComponent: React.FC<SnailRaceBettingPanelProps> = ({
  gameState,
  myBets,
  selectedChip,
  setSelectedChip,
  placeBet,
  clearBets,
  participants,
  odds,
}) => {
  const isBetting = gameState === 'betting';

  // Find which snailId (if any) the user has bet on
  const bettedSnailId = React.useMemo(() => {
    const entry = Object.entries(myBets).find(([, amt]) => amt > 0);
    if (!entry) return null;
    const [key] = entry;
    // key format: "win:snailId"
    const parts = key.split(':');
    const id = Number(parts[1]);
    return isNaN(id) ? null : id;
  }, [myBets]);

  const betsEntries = Object.entries(myBets).filter(([, amt]) => amt > 0);

  // Snails not in participants
  const waitingSnails = SNAILS.filter(s => !participants.includes(s.id));
  const participantSnails = SNAILS.filter(s => participants.includes(s.id));

  const handleCardClick = async (snailId: number) => {
    if (!isBetting) return;
    await placeBet(snailId);
  };

  return (
    <div className={cn(
      'flex-shrink-0 flex flex-col bg-slate-100/90 dark:bg-black/90 border-t border-slate-200 dark:border-white/10 transition-colors',
      !isBetting && 'pointer-events-none opacity-50'
    )}>

      {/* Participant snail cards */}
      <div className="px-3 pt-3 pb-2">
        {participants.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-xs text-slate-400 dark:text-white/30 font-medium">
            다음 라운드 준비 중...
          </div>
        ) : (
          <>
            <p className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2 text-center">
              출전 달팽이 — 1등 맞추기
            </p>
            <div className="flex justify-center gap-2 md:gap-3 max-w-lg mx-auto">
              {participantSnails.map((snail) => {
                const snailOdds = odds[snail.id];
                const isBetted = bettedSnailId === snail.id;
                const otherBetted = bettedSnailId !== null && bettedSnailId !== snail.id;
                const betAmount = myBets[`win:${snail.id}`] ?? 0;

                return (
                  <motion.button
                    key={snail.id}
                    onClick={() => handleCardClick(snail.id)}
                    disabled={!isBetting}
                    whileTap={{ scale: 0.94 }}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1.5 rounded-xl p-2.5 border-2 transition-all duration-200 min-w-0',
                      isBetted
                        ? 'border-green-400 bg-green-500/10 shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                        : otherBetted
                        ? 'border-slate-300/40 dark:border-white/10 bg-slate-200/40 dark:bg-white/5 opacity-60'
                        : 'border-slate-300/60 dark:border-white/15 bg-white/60 dark:bg-white/5 hover:border-slate-400 dark:hover:border-white/30 hover:bg-white/80 dark:hover:bg-white/10'
                    )}
                  >
                    {/* Color circle */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg flex-shrink-0"
                      style={{
                        backgroundColor: snail.color,
                        boxShadow: isBetted ? `0 0 14px ${snail.color}88` : `0 3px 8px rgba(0,0,0,0.3)`,
                      }}
                    >
                      🐌
                    </div>

                    {/* Name */}
                    <span className={cn(
                      'text-xs font-black leading-tight',
                      isBetted ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-white/90'
                    )}>
                      {snail.name}
                    </span>

                    {/* Odds */}
                    {snailOdds !== undefined ? (
                      <span className="text-[11px] font-black text-yellow-600 dark:text-yellow-400 font-mono">
                        {snailOdds.toFixed(1)}x
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-white/30">—</span>
                    )}

                    {/* Bet amount badge */}
                    {isBetted && betAmount > 0 && (
                      <span className="text-[9px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                        {betAmount >= 1000 ? `${(betAmount / 1000).toFixed(betAmount % 1000 === 0 ? 0 : 1)}K` : betAmount}P
                      </span>
                    )}

                    {/* "선택" label when not bet */}
                    {!isBetted && (
                      <span className="text-[9px] text-slate-400 dark:text-white/30 leading-none">
                        선택
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Waiting snails */}
            {waitingSnails.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[9px] text-slate-400 dark:text-white/30 font-bold">대기:</span>
                {waitingSnails.map((snail) => (
                  <span
                    key={snail.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/60 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-300/40 dark:border-white/10"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: snail.color }}
                    />
                    {snail.name}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-20px_40px_rgba(0,0,0,0.9)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-30">
        <div className="max-w-2xl mx-auto px-3 py-2 flex items-center gap-2">
          {/* Chips */}
          <div className="flex gap-2 flex-1 justify-center items-center min-h-[56px]">
            {CHIPS.map((chip) => {
              const isSelected = selectedChip === chip;
              return (
                <motion.button
                  key={chip}
                  onClick={() => setSelectedChip(chip)}
                  animate={isSelected ? { y: -8, scale: 1.12 } : { y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'relative w-12 h-12 rounded-full border-[3px] flex items-center justify-center flex-shrink-0',
                    isSelected
                      ? 'border-yellow-400 shadow-[0_8px_16px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_16px_rgba(0,0,0,0.8),0_0_12px_rgba(250,204,21,0.5)] z-10'
                      : 'border-slate-300 dark:border-[#333] hover:border-slate-400 dark:hover:border-[#666] active:scale-95 shadow-md'
                  )}
                  style={{
                    background: isSelected
                      ? 'repeating-conic-gradient(from 0deg, #333 0deg 15deg, #555 15deg 30deg)'
                      : 'repeating-conic-gradient(from 0deg, #111 0deg 15deg, #222 15deg 30deg)',
                  }}
                >
                  <div className={cn(
                    'absolute inset-[3px] rounded-full border-[2px] border-white/20 flex items-center justify-center shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]',
                    chip >= 5000 ? 'bg-gradient-to-b from-purple-500 to-purple-900'
                      : chip >= 1000 ? 'bg-gradient-to-b from-blue-500 to-blue-900'
                        : chip >= 500 ? 'bg-gradient-to-b from-red-500 to-red-900'
                          : 'bg-gradient-to-b from-green-500 to-green-900'
                  )}>
                    <div className="absolute inset-1 rounded-full border border-white/10" />
                    <span className="text-[10px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10 tracking-tighter">
                      {chip >= 1000 ? `${chip / 1000}K` : chip}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur-md -z-10" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Clear button */}
          <button
            onClick={clearBets}
            disabled={!isBetting || betsEntries.length === 0}
            className="px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/80 active:bg-red-200 dark:active:bg-red-800 text-red-600 dark:text-red-200 text-[10px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm whitespace-nowrap flex-shrink-0"
          >
            베팅취소
          </button>
        </div>
      </div>
    </div>
  );
};

export const SnailRaceBettingPanel = React.memo(SnailRaceBettingPanelComponent);
