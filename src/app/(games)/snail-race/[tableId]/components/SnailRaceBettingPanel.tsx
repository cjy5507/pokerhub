'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SNAILS = [
  { id: 0, name: '테리', color: '#ef4444' },
  { id: 1, name: '강욱', color: '#3b82f6' },
  { id: 2, name: '경원', color: '#22c55e' },
] as const;

const BET_TYPES = [
  { key: 'win',        label: '단승',   desc: '1등 맞추기',    odds: '2.7x', snailCount: 1 },
  { key: 'place',      label: '연승',   desc: '1~2등 안에',    odds: '1.3x', snailCount: 1 },
  { key: 'exacta_box', label: '복승',   desc: '2마리 순서무관', odds: '1.8x', snailCount: 2 },
  { key: 'exacta',     label: '쌍승',   desc: '1,2등 정순서',  odds: '4.5x', snailCount: 2 },
  { key: 'trifecta',   label: '삼쌍승', desc: '1,2,3등 정순서', odds: '5.0x', snailCount: 3 },
] as const;

const CHIPS = [100, 500, 1000, 5000];

type BetTypeKey = typeof BET_TYPES[number]['key'];

interface SnailRaceBettingPanelProps {
  gameState: 'betting' | 'racing' | 'result';
  balance: number;
  myBets: Record<string, number>;
  selectedChip: number;
  setSelectedChip: (chip: number) => void;
  placeBet: (betType: string, snails: number[]) => Promise<void>;
  clearBets: () => Promise<void>;
}

const SnailRaceBettingPanelComponent: React.FC<SnailRaceBettingPanelProps> = ({
  gameState,
  myBets,
  selectedChip,
  setSelectedChip,
  placeBet,
  clearBets,
}) => {
  const [selectedBetType, setSelectedBetType] = useState<BetTypeKey | null>(null);
  const [selectedSnails, setSelectedSnails] = useState<number[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);

  const isBetting = gameState === 'betting';
  const activeBetType = BET_TYPES.find(b => b.key === selectedBetType) ?? null;

  const handleBetTypeSelect = useCallback((key: BetTypeKey) => {
    if (!isBetting) return;
    setSelectedBetType(prev => (prev === key ? null : key));
    setSelectedSnails([]);
  }, [isBetting]);

  const handleSnailSelect = useCallback(async (snailId: number) => {
    if (!activeBetType || !isBetting || isPlacing) return;

    const alreadyIdx = selectedSnails.indexOf(snailId);
    if (alreadyIdx !== -1) {
      setSelectedSnails(prev => prev.filter((_, i) => i !== alreadyIdx));
      return;
    }

    const nextSnails = [...selectedSnails, snailId];

    if (nextSnails.length === activeBetType.snailCount) {
      setIsPlacing(true);
      try {
        await placeBet(activeBetType.key, nextSnails);
      } finally {
        setIsPlacing(false);
        setSelectedSnails([]);
        setSelectedBetType(null);
      }
    } else {
      setSelectedSnails(nextSnails);
    }
  }, [activeBetType, isBetting, isPlacing, selectedSnails, placeBet]);

  const handleClearBets = useCallback(async () => {
    if (!isBetting) return;
    await clearBets();
    setSelectedBetType(null);
    setSelectedSnails([]);
  }, [isBetting, clearBets]);

  const betsEntries = Object.entries(myBets).filter(([, amt]) => amt > 0);
  const totalBetAmount = betsEntries.reduce((sum, [, amt]) => sum + amt, 0);

  const isOrdered = activeBetType?.key === 'exacta' || activeBetType?.key === 'trifecta';

  return (
    <div className={cn(
      'flex-shrink-0 flex flex-col bg-slate-100/90 dark:bg-black/90 border-t border-slate-200 dark:border-white/10 transition-colors',
      !isBetting && 'pointer-events-none opacity-50'
    )}>
      {/* Bet Type Grid */}
      <div className="px-3 pt-3 pb-2">
        <div className="grid grid-cols-5 gap-1.5 md:gap-2 max-w-2xl mx-auto">
          {BET_TYPES.map((bet) => {
            const isSelected = selectedBetType === bet.key;
            const hasBet = Object.keys(myBets).some(k => k.startsWith(bet.key + ':'));
            return (
              <motion.button
                key={bet.key}
                onClick={() => handleBetTypeSelect(bet.key)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl p-2 md:p-3 border transition-all duration-200 text-center min-h-[60px]',
                  isSelected
                    ? 'bg-yellow-400/10 border-yellow-400 ring-2 ring-yellow-400 dark:text-yellow-300 text-yellow-700'
                    : hasBet
                      ? 'bg-green-500/5 border-green-500/40 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                      : 'bg-slate-200/60 dark:bg-gray-800/60 border-slate-300/50 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-300/60 dark:hover:bg-gray-700/60'
                )}
              >
                <span className="font-black text-sm md:text-base leading-tight">{bet.label}</span>
                <span className="font-mono text-[10px] md:text-xs text-yellow-600 dark:text-yellow-400 font-bold">{bet.odds}</span>
                <span className="text-[9px] md:text-[10px] text-slate-500 dark:text-white/50 leading-tight mt-0.5 hidden sm:block">{bet.desc}</span>
                {hasBet && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Snail Selection */}
      <AnimatePresence>
        {selectedBetType && activeBetType && (
          <motion.div
            key="snail-select"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2">
              <div className="max-w-2xl mx-auto bg-black/10 dark:bg-black/40 rounded-xl p-3 border border-black/10 dark:border-white/10">

                {/* Order slots for multi-pick */}
                {activeBetType.snailCount > 1 && (
                  <div className="flex justify-center gap-4 mb-3">
                    {Array.from({ length: activeBetType.snailCount }).map((_, i) => {
                      const pickedSnail = SNAILS.find(s => s.id === selectedSnails[i]);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider">
                            {isOrdered ? `${i + 1}위` : `${i + 1}번`}
                          </span>
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-200',
                              pickedSnail
                                ? 'border-white/60 shadow-lg'
                                : 'border-slate-300 dark:border-white/20'
                            )}
                            style={pickedSnail ? { backgroundColor: pickedSnail.color } : {}}
                          >
                            {pickedSnail ? '🐌' : <span className="text-slate-400 dark:text-white/20 text-xs">?</span>}
                          </div>
                          <span className="text-[9px] text-slate-500 dark:text-white/40 truncate max-w-[48px] text-center">
                            {pickedSnail?.name ?? '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Snail Buttons */}
                <div className="flex justify-center gap-4">
                  {SNAILS.map((snail) => {
                    const pickIdx = selectedSnails.indexOf(snail.id);
                    const isPicked = pickIdx !== -1;
                    return (
                      <motion.button
                        key={snail.id}
                        onClick={() => handleSnailSelect(snail.id)}
                        disabled={isPlacing}
                        whileTap={{ scale: 0.9 }}
                        animate={isPicked ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all duration-150"
                      >
                        <div
                          className={cn(
                            'w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all duration-200',
                            isPicked
                              ? 'ring-2 ring-white shadow-xl'
                              : 'opacity-80 hover:opacity-100 hover:ring-1 hover:ring-white/50'
                          )}
                          style={{ backgroundColor: snail.color }}
                        >
                          🐌
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-white/90">{snail.name}</span>
                        {isPicked && activeBetType.snailCount > 1 && (
                          <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-full leading-none">
                            {pickIdx + 1}위
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-center text-[9px] text-slate-400 dark:text-white/30 mt-2">
                  {activeBetType.snailCount === 1 && '달팽이를 선택하면 자동으로 베팅됩니다'}
                  {activeBetType.key === 'exacta_box' && '2마리를 선택하세요 (순서 무관)'}
                  {activeBetType.key === 'exacta' && '1위, 2위 순서대로 선택하세요'}
                  {activeBetType.key === 'trifecta' && '1위, 2위, 3위 순서대로 선택하세요'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-20px_40px_rgba(0,0,0,0.9)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-30">
        <div className="max-w-2xl mx-auto px-3 py-2 flex flex-col gap-2">
          {/* Chips + Clear */}
          <div className="flex items-center gap-2">
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

            <button
              onClick={handleClearBets}
              disabled={!isBetting || betsEntries.length === 0}
              className="px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/80 active:bg-red-200 dark:active:bg-red-800 text-red-600 dark:text-red-200 text-[10px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm whitespace-nowrap flex-shrink-0"
            >
              베팅 취소
            </button>
          </div>

          {/* Bets Summary */}
          {betsEntries.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {betsEntries.map(([key, amount]) => {
                const [betTypeKey, ...snailParts] = key.split(':');
                const snailIds = (snailParts.join(':') || '').split(',').map(Number).filter(n => !isNaN(n));
                const betType = BET_TYPES.find(b => b.key === betTypeKey);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-1 border border-slate-200 dark:border-white/10 flex-shrink-0"
                  >
                    <div className="flex gap-0.5">
                      {snailIds.map(sid => {
                        const snail = SNAILS.find(s => s.id === sid);
                        return snail ? (
                          <span
                            key={sid}
                            className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: snail.color }}
                          />
                        ) : null;
                      })}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-white/60">
                      {betType?.label ?? betTypeKey}
                    </span>
                    <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400">
                      {amount >= 1000 ? `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K` : amount}
                    </span>
                  </div>
                );
              })}
              {totalBetAmount > 0 && (
                <span className="ml-auto flex-shrink-0 text-[10px] text-slate-400 dark:text-white/30 font-bold whitespace-nowrap">
                  합계 {totalBetAmount >= 1000
                    ? `${(totalBetAmount / 1000).toFixed(totalBetAmount % 1000 === 0 ? 0 : 1)}K`
                    : totalBetAmount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SnailRaceBettingPanel = React.memo(SnailRaceBettingPanelComponent);
