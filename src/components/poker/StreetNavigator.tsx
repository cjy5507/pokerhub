'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PokerAction {
  position: string;
  type: ActionType;
  amount?: number;
}

export interface StreetData {
  street: Street;
  actions: PokerAction[];
}

export interface StreetNavigatorProps {
  streets: StreetData[];
  className?: string;
  sticky?: boolean;
}

const streetLabels: Record<Street, string> = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
};

const actionColors: Record<ActionType, string> = {
  fold: 'text-ph-text-muted line-through',
  check: 'text-ph-success',
  call: 'text-ph-info',
  bet: 'text-ph-warning',
  raise: 'text-ph-warning font-semibold',
  'all-in': 'text-ph-error font-bold',
};

const positionColors: Record<string, string> = {
  BTN: 'bg-amber-500',
  SB: 'bg-blue-500',
  BB: 'bg-green-500',
  UTG: 'bg-purple-500',
  MP: 'bg-pink-500',
  CO: 'bg-cyan-500',
  'UTG+1': 'bg-indigo-500',
  'UTG+2': 'bg-violet-500',
  HJ: 'bg-teal-500',
};

export function StreetNavigator({ streets, className, sticky = true }: StreetNavigatorProps) {
  const [activeStreet, setActiveStreet] = useState<Street>('preflop');

  const currentStreetData = streets.find(s => s.street === activeStreet);

  return (
    <div className={cn('w-full bg-ph-surface', className)}>
      {/* Tab bar */}
      <div className={cn(
        'flex border-b border-ph-border',
        sticky && 'sticky top-14 lg:top-16 z-40 bg-ph-surface'
      )}>
        {(['preflop', 'flop', 'turn', 'river'] as Street[]).map((street) => {
          const streetExists = streets.some(s => s.street === street);
          const isActive = activeStreet === street;

          return (
            <button
              key={street}
              onClick={() => streetExists && setActiveStreet(street)}
              disabled={!streetExists}
              className={cn(
                'flex-1 py-3 px-4 text-sm lg:text-base font-medium transition-all duration-200',
                'border-b-3 min-h-[44px] touch-manipulation',
                isActive && 'border-ph-gold text-ph-gold',
                !isActive && streetExists && 'border-transparent text-ph-text-secondary hover:text-ph-text',
                !streetExists && 'opacity-30 cursor-not-allowed text-ph-text-muted'
              )}
              aria-label={`${streetLabels[street]} 탭`}
              aria-current={isActive ? 'page' : undefined}
            >
              {streetLabels[street]}
            </button>
          );
        })}
      </div>

      {/* Action list */}
      <div className="p-4 space-y-2 min-h-[200px]">
        {currentStreetData?.actions.map((action, index) => (
          <div
            key={`${action.position}-${index}`}
            className="flex items-center gap-3 py-2 px-3 rounded bg-ph-elevated hover:bg-ph-elevated transition-colors"
          >
            {/* Position chip */}
            <div className={cn(
              'w-10 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0',
              positionColors[action.position] || 'bg-gray-500'
            )}>
              {action.position}
            </div>

            {/* Action text */}
            <div className={cn(
              'flex items-center gap-2 text-sm lg:text-base',
              actionColors[action.type]
            )}>
              <span className="capitalize">{action.type}</span>
              {action.amount !== undefined && (
                <span className="font-semibold">
                  ${action.amount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}

        {(!currentStreetData || currentStreetData.actions.length === 0) && (
          <div className="flex items-center justify-center py-12 text-ph-text-muted text-sm">
            이 스트릿에는 액션이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
