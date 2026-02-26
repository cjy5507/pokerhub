'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SNAILS = [
  { id: 0, name: '테리', color: '#ef4444' },
  { id: 1, name: '강욱', color: '#3b82f6' },
  { id: 2, name: '경원', color: '#22c55e' },
] as const;

const BET_ODDS: Record<string, number> = {
  win: 2.7,
  place: 1.3,
  exacta_box: 1.8,
  exacta: 4.5,
  trifecta: 5.0,
};

const BET_LABELS: Record<string, string> = {
  win: '단승',
  place: '연승',
  exacta_box: '복승',
  exacta: '쌍승',
  trifecta: '삼쌍승',
};

const PODIUM_RANK_LABELS = ['1위 🥇', '2위 🥈', '3위 🥉'];

type RaceResult = { seed: string; finishOrder: number[] } | null;

interface SnailRaceResultsProps {
  gameState: 'betting' | 'racing' | 'result';
  raceResult: RaceResult;
  myBets: Record<string, number>;
  balance: number;
}

function calcPayout(betType: string, snails: number[], amount: number, finishOrder: number[]): number {
  let won = false;
  if (betType === 'win') {
    won = snails[0] === finishOrder[0];
  } else if (betType === 'place') {
    won = finishOrder.slice(0, 2).includes(snails[0]);
  } else if (betType === 'exacta_box') {
    const betSet = new Set(snails);
    const topSet = new Set(finishOrder.slice(0, 2));
    won = betSet.size === topSet.size && [...betSet].every(s => topSet.has(s));
  } else if (betType === 'exacta') {
    won = snails[0] === finishOrder[0] && snails[1] === finishOrder[1];
  } else if (betType === 'trifecta') {
    won = snails[0] === finishOrder[0] && snails[1] === finishOrder[1] && snails[2] === finishOrder[2];
  }
  if (!won) return 0;
  return Math.floor(amount * (BET_ODDS[betType] ?? 0));
}

export const SnailRaceResults = React.memo(function SnailRaceResults({
  gameState,
  raceResult,
  myBets,
}: SnailRaceResultsProps) {
  const visible = gameState === 'result' && raceResult !== null;

  // Compute user's bet outcomes
  const betOutcomes = React.useMemo(() => {
    if (!raceResult) return [];
    return Object.entries(myBets)
      .filter(([, amt]) => amt > 0)
      .map(([key, amount]) => {
        const [betTypeKey, ...snailParts] = key.split(':');
        const snailIds = (snailParts.join(':') || '').split(',').map(Number).filter(n => !isNaN(n));
        const payout = calcPayout(betTypeKey, snailIds, amount, raceResult.finishOrder);
        return { key, betTypeKey, snailIds, amount, payout, won: payout > 0 };
      });
  }, [myBets, raceResult]);

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
                    const snailDots = outcome.snailIds.map(sid => SNAILS.find(s => s.id === sid));
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
                          <div className="flex gap-0.5">
                            {snailDots.map((snail, i) => snail ? (
                              <span
                                key={i}
                                className="w-3 h-3 rounded-full inline-block"
                                style={{ backgroundColor: snail.color }}
                              />
                            ) : null)}
                          </div>
                          <span className="text-[10px] font-bold text-white/60">
                            {BET_LABELS[outcome.betTypeKey] ?? outcome.betTypeKey}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {outcome.amount >= 1000 ? `${outcome.amount / 1000}K` : outcome.amount}P
                          </span>
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
