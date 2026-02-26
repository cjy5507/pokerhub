'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const SNAIL_COLORS: Record<number, string> = {
  0: '#ef4444',
  1: '#3b82f6',
  2: '#22c55e',
  3: '#f59e0b',
  4: '#a855f7',
  5: '#ec4899',
  6: '#06b6d4',
};

const SNAIL_NAMES: Record<number, string> = {
  0: '지나',
  1: '해연',
  2: '영',
  3: '뻥카',
  4: '우성',
  5: '테리',
  6: '경원',
};

type HistoryEntry = { first: number; second: number; third: number };

interface SnailRaceHistoryProps {
  history: HistoryEntry[];
}

export const SnailRaceHistory = React.memo(function SnailRaceHistory({ history }: SnailRaceHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 px-4 text-[10px] text-slate-400 dark:text-white/30 font-medium tracking-wider">
        결과 없음
      </div>
    );
  }

  const displayHistory = history.slice(-36);

  return (
    <div className="w-full bg-white/50 dark:bg-black/40 border-t border-slate-200/50 dark:border-white/5">
      <div className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto scrollbar-hide">
        <span className="text-[9px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest flex-shrink-0">
          히스토리
        </span>
        <div className="flex gap-1 flex-shrink-0">
          {displayHistory.map((entry, i) => {
            const winnerColor = SNAIL_COLORS[entry.first] ?? '#888';
            return (
              <div key={i} className="relative group flex-shrink-0">
                <div
                  className="w-5 h-5 rounded-full border border-white/20 shadow-sm cursor-default"
                  style={{ backgroundColor: winnerColor }}
                />
                {/* Tooltip on hover */}
                <div className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50',
                  'opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150',
                  'bg-gray-900 dark:bg-black border border-white/10 rounded-lg px-2 py-1.5 shadow-xl',
                  'min-w-[80px] text-center'
                )}>
                  <div className="flex flex-col gap-0.5">
                    {[entry.first, entry.second, entry.third].map((snailId, rank) => (
                      <div key={rank} className="flex items-center gap-1.5">
                        <span className="text-[9px] text-white/40 w-4 text-right font-mono">{rank + 1}위</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SNAIL_COLORS[snailId] ?? '#888' }}
                        />
                        <span className="text-[9px] text-white/80 font-bold whitespace-nowrap">
                          {SNAIL_NAMES[snailId] ?? `#${snailId}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-black" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
