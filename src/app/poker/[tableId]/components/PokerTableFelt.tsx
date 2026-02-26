'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CardRenderer, parseCard } from '@/components/poker/CardRenderer';
import type { GameState } from '@/lib/poker/types';
import { MemoizedSeatDisplay } from './PokerSeatDisplay';
import { WinOverlay, ChipAmount, CardBack } from './PokerHelpers';
import { COMMUNITY_CARD_SLOTS } from '../constants';

// ─── Style constants ──────────────────────────────────────────────

const FELT_STYLE = {
  background: 'radial-gradient(ellipse at 50% 50%, #152418 0%, #0a110b 75%, #050a07 100%)',
  border: '4px solid rgba(201,162,39,0.35)',
  boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 0 80px rgba(0,0,0,0.9), 0 0 30px rgba(201,162,39,0.15)',
} as const;

const INNER_RING_STYLE = { boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' } as const;

const POT_ACTIVE_STYLE = {
  background: 'rgba(34,80,50,0.85)',
  border: '1px solid rgba(74,140,92,0.4)',
} as const;

const POT_EMPTY_STYLE = { background: 'rgba(34,80,50,0.5)' } as const;

const EMPTY_CARD_SLOT_STYLE = {
  background: 'rgba(0,0,0,0.12)',
  border: '1px solid rgba(255,255,255,0.04)',
} as const;

const SIDE_POT_STYLE = { background: 'rgba(0,0,0,0.4)' } as const;

// ─── PokerTableFelt ───────────────────────────────────────────────

interface PokerTableFeltProps {
  gameState: GameState;
  seatPositions: [number, number][];
  betPositions: [number, number][];
  maxSeats: number;
  isPlaying: boolean;
  isShowdown: boolean;
  turnTimeLeft: number;
  lastActions: Record<number, string>;
  newCardsDealt: boolean;
  winOverlay: { name: string; amount: number } | null;
  potBounce: boolean;
  newCardStartIndex: React.MutableRefObject<number>;
  heroSeatIndex: number;
  onSitDown: (seatIndex: number) => void;
}

export function PokerTableFelt({
  gameState, seatPositions, betPositions, maxSeats,
  isPlaying, isShowdown, turnTimeLeft, lastActions,
  newCardsDealt, winOverlay, potBounce, newCardStartIndex,
  heroSeatIndex, onSitDown,
}: PokerTableFeltProps) {
  const seats = gameState.seats ?? [];
  const communityCards = gameState.communityCards;

  return (
    <div className="flex-1 relative overflow-hidden min-h-0">
      {winOverlay && <WinOverlay winnerName={winOverlay.name} amount={winOverlay.amount} />}

      <div className="absolute inset-1 md:inset-2 lg:inset-3">
        <div className="absolute inset-0 rounded-[50%/42%] overflow-hidden" style={FELT_STYLE}>
          {/* Inner table ring */}
          <div className="absolute inset-[3%] rounded-[50%/42%] border border-white/5" style={INNER_RING_STYLE} />

          {/* Pot pill */}
          <div className="absolute top-[26%] md:top-[22%] left-1/2 -translate-x-1/2 z-10">
            {gameState.pot > 0 ? (
              <div className={cn('px-3 py-0.5 rounded-full', potBounce && 'animate-pot-bounce')} style={POT_ACTIVE_STYLE}>
                <span className="text-[11px] md:text-[13px] font-bold text-white tabular-nums">
                  {gameState.pot.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="px-3 py-0.5 rounded-full" style={POT_EMPTY_STYLE}>
                <span className="text-[11px] md:text-[13px] font-bold text-white/30 tabular-nums">0</span>
              </div>
            )}
          </div>

          {/* Community Cards */}
          <div className="absolute top-[40%] md:top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10 max-w-[calc(100%-16px)]">
            <div className="flex gap-1 md:gap-2">
              {Array.from({ length: COMMUNITY_CARD_SLOTS }).map((_, i) => {
                const card = communityCards[i];
                if (!card) {
                  return (
                    <div key={i} className="w-8 h-[48px] md:w-12 md:h-[66px] rounded-[3px]" style={EMPTY_CARD_SLOT_STYLE} />
                  );
                }
                const parsed = parseCard(card);
                if (!parsed) return null;
                const isNewCard = i >= newCardStartIndex.current;
                const delayWithinStreet = isNewCard ? (i - newCardStartIndex.current) * 150 : 0;
                return (
                  <div
                    key={i}
                    className={isNewCard ? 'animate-community-reveal' : undefined}
                    style={isNewCard ? { animationDelay: `${delayWithinStreet}ms` } : undefined}
                  >
                    <CardRenderer rank={parsed.rank} suit={parsed.suit} size="sm" className="md:hidden" />
                    <CardRenderer rank={parsed.rank} suit={parsed.suit} size="lg" className="hidden md:flex" />
                  </div>
                );
              })}
            </div>
            {gameState.sidePots.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-center">
                {gameState.sidePots.map((sp, i) => (
                  <div key={i} className="px-2 py-0.5 rounded-full text-[8px] text-white/50" style={SIDE_POT_STYLE}>
                    사이드 {sp.amount.toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waiting status */}
          {gameState.status === 'waiting' && (
            <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                {[0, 0.25, 0.5].map((delay, k) => (
                  <div key={k} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
              <p className="text-[11px] font-medium text-white/60">다른 플레이어를 기다리는 중...</p>
              <div className="text-[10px] text-white/30 text-center leading-relaxed">
                <p>NLH ~ {gameState.smallBlind}/{gameState.bigBlind}</p>
              </div>
            </div>
          )}

          {/* Seats */}
          {seatPositions.map((pos, i) => {
            if (i >= maxSeats) return null;
            const seat = seats[i];
            return (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 z-20" style={{ top: `${pos[0]}%`, left: `${pos[1]}%` }}>
                <MemoizedSeatDisplay
                  seat={seat}
                  seatIndex={i}
                  isHero={i === heroSeatIndex}
                  isDealer={gameState.dealerSeat === i && isPlaying}
                  isCurrent={gameState.currentSeat === i}
                  timeLeft={gameState.currentSeat === i ? turnTimeLeft : 0}
                  showCards={isShowdown}
                  onSitDown={onSitDown}
                  lastAction={lastActions[i]}
                  hasNewCards={newCardsDealt}
                  isHandActive={isPlaying}
                />
              </div>
            );
          })}

          {/* Bet chips */}
          {betPositions.map((pos, i) => {
            if (i >= maxSeats) return null;
            const seat = seats[i];
            if (!seat || seat.betInRound <= 0) return null;
            return (
              <div key={`bet-${i}`} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ top: `${pos[0]}%`, left: `${pos[1]}%` }}>
                <ChipAmount amount={seat.betInRound} animate />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
