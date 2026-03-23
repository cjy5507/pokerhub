'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CardRenderer, parseCard } from '@/components/poker/CardRenderer';
import type { SeatState } from '@/lib/poker/types';
import { CardBack, DealerButton } from './PokerHelpers';

// ─── Inline style constants ───────────────────────────────────────

const EMPTY_SEAT_STYLE = {
  border: '2px dashed var(--op-border)',
  background: 'var(--op-surface)',
} as const;

const EMPTY_SEAT_HOVER_STYLE = {
  background: 'var(--op-elevated)',
} as const;

const ACTION_BADGE_STYLE = {
  background: 'var(--op-elevated)',
  border: '1px solid var(--op-border)',
} as const;

const HERO_SEAT_STYLE = {
  background: 'var(--op-elevated)',
} as const;

const OPPONENT_SEAT_STYLE = {
  background: 'var(--op-elevated)',
} as const;

// ─── SeatDisplay ─────────────────────────────────────────────────

interface SeatDisplayProps {
  seat: SeatState | null;
  seatIndex: number;
  isHero: boolean;
  isDealer: boolean;
  isCurrent: boolean;
  timeLeft: number;
  showCards: boolean;
  onSitDown: (seatIndex: number) => void;
  lastAction?: string | null;
  hasNewCards?: boolean;
  isHandActive?: boolean;
}

function SeatDisplay({
  seat,
  seatIndex,
  isHero,
  isDealer,
  isCurrent,
  timeLeft,
  showCards,
  onSitDown,
  lastAction,
  hasNewCards,
  isHandActive,
}: SeatDisplayProps) {
  if (!seat) {
    return (
      <button onClick={() => onSitDown(seatIndex)} className="group relative flex flex-col items-center cursor-pointer">
        <div
          className="w-[72px] h-[52px] md:w-[84px] md:h-[60px] rounded-xl flex items-center justify-center relative transition-all duration-300 active:scale-[0.95] backdrop-blur-sm"
          style={EMPTY_SEAT_STYLE}
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={EMPTY_SEAT_HOVER_STYLE} />
          <span className="text-lg text-op-text-muted group-hover:text-op-gold transition-colors duration-300 relative z-10 font-bold tracking-widest">
            {seatIndex + 1}
          </span>
        </div>
      </button>
    );
  }

  const hasCards = seat.holeCards && seat.holeCards.length > 0;

  if (isHero) {
    return (
      <div className={cn('flex flex-col items-center relative', seat.isFolded && 'opacity-40')}>
        {isDealer && <div className="absolute -top-1 -right-1 z-30"><DealerButton /></div>}
        {lastAction && !seat.isFolded && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded whitespace-nowrap z-20 animate-action-badge" style={ACTION_BADGE_STYLE}>
            <span className="text-[9px] md:text-[10px] font-bold text-op-text-secondary">{lastAction}</span>
          </div>
        )}
        {hasCards && (
          <div className="flex -space-x-1.5 mb-0.5">
            {seat.holeCards!.map((card, i) => {
              const parsed = parseCard(card);
              return parsed ? (
                <div key={i} className={cn('animate-card-deal', seat.isFolded && 'opacity-35')} style={{ animationDelay: `${i * 100}ms` }}>
                  <CardRenderer rank={parsed.rank} suit={parsed.suit} size="md" />
                </div>
              ) : null;
            })}
          </div>
        )}
        {!hasCards && isHandActive && !seat.isFolded && (
          <div className="flex -space-x-1.5 mb-0.5">
            <CardBack size="sm" />
            <CardBack size="sm" />
          </div>
        )}
        <div
          className={cn(
            'rounded-xl px-2 py-1 text-center min-w-[72px] md:min-w-[84px] relative transition-all duration-300 shadow-xl backdrop-blur-md',
            isCurrent && !seat.isFolded ? 'border-2 border-op-gold shadow-md' : 'border border-op-border hover:border-op-gold'
          )}
          style={HERO_SEAT_STYLE}
        >
          {isCurrent && !seat.isFolded && (
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg overflow-hidden bg-white/10">
              <div
                className="h-full transition-all duration-1000 linear"
                style={{
                  width: `${Math.max(0, Math.min(100, (timeLeft / 30) * 100))}%`,
                  background: timeLeft > 10 ? 'var(--op-success)' : timeLeft > 5 ? 'var(--op-warning)' : 'var(--op-error)',
                }}
              />
            </div>
          )}
          <div className="text-[10px] text-op-text-secondary font-medium truncate max-w-[72px]" title={seat.nickname}>{seat.nickname}</div>
          <div className="text-[12px] text-op-text font-bold tabular-nums">{seat.chipStack.toLocaleString()}</div>
        </div>
        {seat.isFolded && (
          <div className="absolute inset-0 flex items-center justify-center bg-op-background/60 rounded-xl">
            <span className="text-[9px] font-bold text-op-text-muted uppercase">FOLD</span>
          </div>
        )}
      </div>
    );
  }

  // Opponent seat
  return (
    <div className={cn('flex flex-col items-center relative', seat.isFolded && 'opacity-40')}>
      {isDealer && <div className="absolute -top-1 -right-1 z-30"><DealerButton /></div>}
      {lastAction && !seat.isFolded && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded whitespace-nowrap z-20 animate-action-badge" style={ACTION_BADGE_STYLE}>
          <span className="text-[9px] md:text-[10px] font-bold text-op-text-secondary">{lastAction}</span>
        </div>
      )}
      <div
        className={cn(
          'rounded-xl px-2 py-1.5 md:px-2.5 md:py-2 text-center min-w-[72px] md:min-w-[84px] relative transition-all duration-300 shadow-xl backdrop-blur-md',
          isCurrent && !seat.isFolded ? 'border-2 border-op-gold shadow-md' : 'border border-op-border hover:border-op-gold',
          seat.isAllIn && !seat.isFolded && 'border-2 border-op-error shadow-sm',
        )}
        style={OPPONENT_SEAT_STYLE}
      >
        {isCurrent && !seat.isFolded && (
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg overflow-hidden bg-white/10">
            <div
              className="h-full transition-all duration-1000 linear"
              style={{
                width: `${Math.max(0, Math.min(100, (timeLeft / 30) * 100))}%`,
                background: timeLeft > 10 ? 'var(--op-success)' : timeLeft > 5 ? 'var(--op-warning)' : 'var(--op-error)',
              }}
            />
          </div>
        )}
        <div className="text-[10px] md:text-[11px] text-op-text-secondary font-medium truncate max-w-[72px] md:max-w-[76px] leading-tight" title={seat.nickname}>
          {seat.nickname}
        </div>
        <div className="text-[12px] md:text-[13px] font-bold text-op-text tabular-nums leading-tight">
          {seat.chipStack.toLocaleString()}
        </div>
        {seat.isAllIn && !seat.isFolded && (
          <div className="text-[8px] font-bold text-op-error uppercase tracking-wider">ALL IN</div>
        )}
        {seat.isFolded && (
          <div className="absolute inset-0 rounded-lg bg-op-background/60 flex items-center justify-center">
            <span className="text-[9px] font-bold text-op-text-muted uppercase tracking-wide">FOLD</span>
          </div>
        )}
      </div>
      {hasCards && showCards && (
        <div className="flex -space-x-0.5 mt-0.5">
          {seat.holeCards!.map((card, i) => {
            const parsed = parseCard(card);
            return parsed ? (
              <div key={i} className="animate-card-deal" style={{ animationDelay: `${i * 100}ms` }}>
                <CardRenderer rank={parsed.rank} suit={parsed.suit} size="sm" />
              </div>
            ) : null;
          })}
        </div>
      )}
      {!seat.isFolded && !showCards && !seat.isSittingOut && isHandActive && seat.holeCards === null && (
        <div className="flex -space-x-1.5 mt-0.5">
          <div className={cn(hasNewCards && 'animate-card-deal')} style={hasNewCards ? { animationDelay: '0ms' } : undefined}>
            <CardBack size="sm" />
          </div>
          <div className={cn(hasNewCards && 'animate-card-deal')} style={hasNewCards ? { animationDelay: '80ms' } : undefined}>
            <CardBack size="sm" />
          </div>
        </div>
      )}
    </div>
  );
}

export const MemoizedSeatDisplay = React.memo(SeatDisplay);
