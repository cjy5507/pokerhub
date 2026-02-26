'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SNAILS = [
  { id: 0, name: '지나', color: '#ef4444', shellLight: '#fca5a5', bodyColor: '#fde68a' },
  { id: 1, name: '해연', color: '#3b82f6', shellLight: '#93c5fd', bodyColor: '#bbf7d0' },
  { id: 2, name: '영', color: '#22c55e', shellLight: '#86efac', bodyColor: '#fde68a' },
  { id: 3, name: '뻥카', color: '#f59e0b', shellLight: '#fcd34d', bodyColor: '#fef3c7' },
  { id: 4, name: '우성', color: '#a855f7', shellLight: '#c4b5fd', bodyColor: '#ede9fe' },
  { id: 5, name: '테리', color: '#ec4899', shellLight: '#f9a8d4', bodyColor: '#fce7f3' },
  { id: 6, name: '경원', color: '#06b6d4', shellLight: '#67e8f9', bodyColor: '#cffafe' },
] as const;

const PODIUM_RANK_LABELS = ['1위 🥇', '2위 🥈', '3위 🥉'];

type RaceResult = { seed: string; finishOrder: number[] } | null;

interface SnailRaceResultsProps {
  gameState: 'betting' | 'racing' | 'result';
  raceResult: RaceResult;
  myBets: Record<string, number>;
  balance: number;
  odds: Record<number, number>;
}

function calcPayout(snailId: number, amount: number, finishOrder: number[], odds: Record<number, number>): number {
  const won = snailId === finishOrder[0];
  if (!won) return 0;
  const multiplier = odds[snailId] ?? 2.0;
  return Math.floor(amount * multiplier);
}

export const SnailRaceResults = React.memo(function SnailRaceResults({
  gameState,
  raceResult,
  myBets,
  odds,
}: SnailRaceResultsProps) {
  const visible = gameState === 'result' && raceResult !== null;

  // Extract the single bet if any (format: "win:snailId")
  const betOutcomes = React.useMemo(() => {
    if (!raceResult) return [];
    return Object.entries(myBets)
      .filter(([, amt]) => amt > 0)
      .map(([key, amount]) => {
        const parts = key.split(':');
        const snailId = Number(parts[1]);
        if (isNaN(snailId)) return null;
        const payout = calcPayout(snailId, amount, raceResult.finishOrder, odds);
        return { key, snailId, amount, payout, won: payout > 0 };
      })
      .filter(Boolean) as Array<{ key: string; snailId: number; amount: number; payout: number; won: boolean }>;
  }, [myBets, raceResult, odds]);

  const totalPayout = betOutcomes.reduce((s, b) => s + b.payout, 0);
  const totalBet = betOutcomes.reduce((s, b) => s + b.amount, 0);
  const netGain = totalPayout - totalBet;

  return (
    <AnimatePresence>
      {visible && raceResult && (
        <motion.div
          key="results-overlay"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="absolute inset-x-0 bottom-0 z-40 flex flex-col items-center pointer-events-none"
          style={{ top: 'auto' }}
        >
          <div className="w-full max-w-lg mx-auto px-3 pb-3">
            <div className="bg-gray-900/95 dark:bg-black/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto backdrop-blur-md">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border-b border-white/10">
                <p className="text-center text-xs font-black text-yellow-400 uppercase tracking-widest">🏁 레이스 결과</p>
              </div>

              {/* Podium */}
              <div className="px-4 py-3 flex justify-center gap-4">
                {raceResult.finishOrder.map((snailId, rank) => {
                  const snail = SNAILS.find(s => s.id === snailId);
                  if (!snail) return null;
                  return (
                    <motion.div
                      key={rank}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: rank * 0.1, duration: 0.25 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span className="text-[10px] text-white/40 font-bold">{PODIUM_RANK_LABELS[rank]}</span>
                      <div
                        className={cn(
                          'rounded-full flex items-center justify-center shadow-lg text-lg',
                          rank === 0 ? 'w-12 h-12 ring-2 ring-yellow-400' : 'w-9 h-9 opacity-80'
                        )}
                        style={{ backgroundColor: snail.color }}
                      >
                        🐌
                      </div>
                      <span className={cn(
                        'font-black text-white',
                        rank === 0 ? 'text-xs' : 'text-[10px] opacity-70'
                      )}>
                        {snail.name}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bet outcomes */}
              {betOutcomes.length > 0 && (
                <div className="px-4 pb-3 border-t border-white/5 pt-3 flex flex-col gap-1.5">
                  {betOutcomes.map((outcome) => {
                    const snail = SNAILS.find(s => s.id === outcome.snailId);
                    const winnerSnailId = raceResult.finishOrder[0];
                    const winnerOdds = odds[winnerSnailId] ?? 2.0;
                    return (
                      <div
                        key={outcome.key}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-1.5',
                          outcome.won
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-white/5 border border-white/5'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {snail && (
                            <span
                              className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                              style={{ backgroundColor: snail.color }}
                            />
                          )}
                          <span className="text-[10px] font-bold text-white/60">
                            {snail?.name ?? `#${outcome.snailId}`} 단승
                          </span>
                          <span className="text-[10px] text-white/40">
                            {outcome.amount >= 1000 ? `${outcome.amount / 1000}K` : outcome.amount}P
                          </span>
                          {outcome.won && (
                            <span className="text-[10px] text-yellow-400 font-mono">
                              {winnerOdds.toFixed(1)}x
                            </span>
                          )}
                        </div>
                        <span className={cn(
                          'text-xs font-black',
                          outcome.won ? 'text-green-400' : 'text-red-400/70'
                        )}>
                          {outcome.won
                            ? `+${outcome.payout >= 1000 ? `${(outcome.payout / 1000).toFixed(1)}K` : outcome.payout}P`
                            : '낙첨'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Net summary */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 mt-0.5">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">최종 결과</span>
                    <span className={cn(
                      'text-sm font-black',
                      netGain > 0 ? 'text-green-400' : netGain < 0 ? 'text-red-400' : 'text-white/50'
                    )}>
                      {netGain > 0 ? '+' : ''}{netGain >= 1000 || netGain <= -1000
                        ? `${(netGain / 1000).toFixed(1)}K`
                        : netGain}P
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
