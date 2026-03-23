'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const SNAILS = [
  { id: 0, name: '지나', color: '#ef4444', shellLight: '#fca5a5', bodyColor: '#fde68a' },
  { id: 1, name: '해연', color: '#3b82f6', shellLight: '#93c5fd', bodyColor: '#bfdbfe' },
  { id: 2, name: '영', color: '#22c55e', shellLight: '#86efac', bodyColor: '#bbf7d0' },
  { id: 3, name: '뻥카', color: '#f59e0b', shellLight: '#fcd34d', bodyColor: '#fef3c7' },
  { id: 4, name: '우성', color: '#a855f7', shellLight: '#c4b5fd', bodyColor: '#ede9fe' },
  { id: 5, name: '테리', color: '#ec4899', shellLight: '#f9a8d4', bodyColor: '#fce7f3' },
  { id: 6, name: '경원', color: '#06b6d4', shellLight: '#67e8f9', bodyColor: '#cffafe' },
] as const;

const CHIPS = [100, 500, 1000, 5000];

interface SnailRaceBettingPanelProps {
  gameState: 'betting' | 'racing' | 'result';
  myBets: Record<string, number>;
  selectedChip: number;
  setSelectedChip: (chip: number) => void;
  placeBet: (snailId: number) => Promise<void>;
  clearBets: () => Promise<void>;
  participants: number[];
  odds: Record<number, number>;
}

const PANEL_CSS = `
@keyframes chipPulse {
  from { box-shadow: 0 0 0 0 rgba(250,204,21,0.22); }
  to { box-shadow: 0 0 0 10px rgba(250,204,21,0); }
}
`;

const BetBadge: React.FC<{ label: string; value: string; tone: 'default' | 'ok'; }> = ({ label, value, tone }) => (
  <div className={cn(
    'rounded-xl border px-2.5 py-1 text-[10px] font-black tracking-wider',
    tone === 'ok'
      ? 'text-[#86efac] border-[#22c55e]/40 bg-[#22c55e]/10'
      : 'text-white/60 border-white/15 bg-white/5',
  )}>
    <p className="uppercase text-[8px]">{label}</p>
    <p>{value}</p>
  </div>
);

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
  const hasAnyBet = Object.values(myBets).some((amount) => amount > 0);

  const bettedSnailId = React.useMemo(() => {
    const entry = Object.entries(myBets).find(([, amt]) => amt > 0);
    if (!entry) return null;
    const id = Number(entry[0].split(':')[1]);
    return Number.isNaN(id) ? null : id;
  }, [myBets]);

  const participantSnails = SNAILS.filter((s) => participants.includes(s.id));
  const waitingSnails = SNAILS.filter((s) => !participants.includes(s.id));

  const handleCardClick = async (snailId: number) => {
    if (!isBetting) return;
    await placeBet(snailId);
  };

  return (
    <div
      className={cn(
        'flex-shrink-0 bg-black/65 border-t border-white/15 transition-colors',
        !isBetting && 'pointer-events-none opacity-55',
      )}
      style={{ boxShadow: '0 -20px 40px rgba(0,0,0,0.2)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: PANEL_CSS }} />
      <div className="max-w-6xl mx-auto px-3 pt-3 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <BetBadge label="진행상태" value={isBetting ? '베팅' : gameState === 'racing' ? '레이싱' : '정산'} tone="ok" />
              <BetBadge label="참여달팽이" value={`${participants.length || 0} / 7`} tone="default" />
            </div>
            <BetBadge
              label="선택 칩"
              value={`${selectedChip >= 1000 ? `${selectedChip / 1000}K` : selectedChip}P`}
              tone="ok"
            />
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {participants.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-white/10 px-4 py-3 bg-white/5 text-xs text-white/50 text-center font-black uppercase tracking-[0.12em]">
                다음 라운드 준비 중입니다
              </div>
            ) : (
              participantSnails.map((snail) => {
                const snailOdds = odds[snail.id];
                const isBetted = bettedSnailId === snail.id;
                const betAmount = myBets[`win:${snail.id}`] ?? 0;

                return (
                  <motion.button
                    key={snail.id}
                    onClick={() => handleCardClick(snail.id)}
                    whileTap={{ scale: 0.96 }}
                    disabled={!isBetting}
                    className={cn(
                      'relative overflow-hidden rounded-2xl border-2 py-3 pl-3 pr-2 text-left transition',
                      isBetted
                        ? 'border-emerald-300/80 bg-emerald-400/15'
                        : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8',
                    )}
                    style={{ boxShadow: isBetted ? `0 0 0 1px ${snail.color}55` : undefined }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-11 w-11 rounded-full border-2 border-white/35 flex items-center justify-center text-xl shrink-0 shadow-lg"
                        style={{ backgroundColor: snail.color }}
                      >
                        🐌
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white/90">{snail.name}</p>
                        <p className="text-[10px] text-white/50">
                          배당 <span className="font-black text-white/75">{snailOdds ? `${snailOdds.toFixed(1)}x` : '—'}</span>
                        </p>
                      </div>
                      <div className="ml-auto self-stretch flex flex-col items-end justify-end gap-1">
                        {isBetted ? (
                          <span className="inline-flex h-6 min-w-12 px-2 rounded-full bg-emerald-500 text-white text-[10px] font-black items-center justify-center">
                            {betAmount >= 1000 ? `${(betAmount / 1000).toFixed(1)}K` : betAmount}P
                          </span>
                        ) : (
                          <span className="text-[9px] text-white/40">선택</span>
                        )}
                        {isBetted && (
                          <span className="text-[9px] text-white/55">진행중</span>
                        )}
                      </div>
                    </div>
                    {isBetted && <motion.span
                      className="absolute left-3 right-3 bottom-2 h-0.5 bg-emerald-300/70 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 0.2 }}
                    />}
                  </motion.button>
                );
              })
            )}
            {participants.length > 0 && waitingSnails.length > 0 && (
              <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-[10px] text-white/50">
                <span className="font-black uppercase tracking-[0.16em] text-white/70">대기</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {waitingSnails.map((snail) => (
                    <span key={snail.id} className="px-2 py-1 rounded-full border border-white/10 text-[9px] bg-white/5 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: snail.color }} />
                      {snail.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 justify-between border-t border-white/10 pt-2">
            <div className="w-full sm:flex-1 flex justify-center sm:justify-start gap-2 overflow-x-auto py-0.5 pl-1 sm:pl-0 scrollbar-hide">
              {CHIPS.map((chip) => {
                const isSelected = selectedChip === chip;
                return (
                  <motion.button
                    key={chip}
                    onClick={() => setSelectedChip(chip)}
                    animate={isSelected ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    className={cn(
                      'relative h-11 min-w-11 rounded-full border-2 flex items-center justify-center',
                      isSelected
                        ? 'border-yellow-300/80 bg-white/15'
                        : 'border-white/20 bg-black/30 hover:bg-white/10',
                    )}
                    style={{
                      boxShadow: isSelected ? '0 0 0 8px rgba(250,204,21,0.1)' : undefined,
                      backgroundImage: isSelected
                        ? 'repeating-conic-gradient(from 0deg, #333 0deg 15deg, #4f46e5 15deg 30deg)'
                        : 'repeating-conic-gradient(from 0deg, #111 0deg 15deg, #222 15deg 30deg)',
                    }}
                  >
                    <div className="absolute inset-[2px] rounded-full border border-white/20 flex items-center justify-center">
                      <span className="text-[10px] font-black text-white">{chip >= 1000 ? `${chip / 1000}K` : chip}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <button
              onClick={clearBets}
              disabled={!isBetting || !hasAnyBet}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-300/50 bg-red-500/5 hover:bg-red-500/20 text-red-300 text-[11px] font-black uppercase tracking-wider disabled:opacity-35 disabled:cursor-not-allowed transition"
              style={{ animation: isBetting && hasAnyBet ? 'chipPulse 1.6s ease-out infinite' : undefined }}
            >
              베팅 초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SnailRaceBettingPanel = React.memo(SnailRaceBettingPanelComponent);
