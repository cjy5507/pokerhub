'use client';

import { cn } from '@/lib/utils';
import { InlineCards } from './CardRenderer';

export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'MP' | 'CO' | 'UTG+1' | 'UTG+2' | 'HJ';

export interface PlayerSeat {
  position: Position;
  stack: number;
  isFolded?: boolean;
  isHero?: boolean;
  isActive?: boolean;
}

export interface TableVisualizerProps {
  seats: PlayerSeat[];
  communityCards?: string; // e.g., "Ah Kd Qs 7c 2h"
  pot?: number;
  maxSeats?: 6 | 9;
  className?: string;
}

const seatPositions6Max = {
  BTN: 'bottom-4 right-4',
  SB: 'bottom-4 left-4',
  BB: 'left-4 top-1/2 -translate-y-1/2',
  UTG: 'top-4 left-8',
  MP: 'top-4 right-8',
  CO: 'right-4 top-1/2 -translate-y-1/2',
} as const;

const seatPositions9Max = {
  BTN: 'bottom-4 right-8',
  SB: 'bottom-4 left-8',
  BB: 'left-4 bottom-1/3',
  UTG: 'left-4 top-1/3',
  'UTG+1': 'top-4 left-12',
  'UTG+2': 'top-4 left-1/3',
  MP: 'top-4 right-1/3',
  HJ: 'top-4 right-12',
  CO: 'right-4 top-1/3',
} as const;

export function TableVisualizer({
  seats,
  communityCards,
  pot,
  maxSeats = 6,
  className
}: TableVisualizerProps) {
  const positions = maxSeats === 6 ? seatPositions6Max : seatPositions9Max;

  return (
    <div className={cn('relative w-full max-w-[500px] mx-auto', className)}>
      {/* Poker table */}
      <div
        className="relative w-full aspect-[3/2] rounded-[50%/40%] bg-gradient-to-br from-op-felt to-op-felt-dark border-4 border-op-felt-dark shadow-lg"
        style={{
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)'
        }}
      >
        {/* Table felt texture */}
        <div className="absolute inset-4 rounded-[50%/40%] opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
          }} />
        </div>

        {/* Player seats */}
        {seats.map((seat) => (
          <div
            key={seat.position}
            className={cn(
              'absolute',
              positions[seat.position as keyof typeof positions]
            )}
          >
            <div className={cn(
              'flex flex-col items-center gap-1',
              seat.isFolded && 'opacity-40'
            )}>
              {/* Seat circle */}
              <div className={cn(
                'w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center',
                'bg-op-surface border-2 transition-all duration-300',
                seat.isHero && 'bg-gradient-to-br from-op-gold to-op-gold-hover shadow-[0_0_12px_rgba(201,162,39,0.4)]',
                seat.isActive && 'border-op-gold ring-2 ring-op-gold/50',
                !seat.isActive && 'border-op-text-dim'
              )}>
                <span className={cn(
                  'text-xs lg:text-sm font-semibold',
                  seat.isHero ? 'text-black' : 'text-op-text'
                )}>
                  {seat.position}
                </span>
              </div>

              {/* Stack size */}
              <div className="text-[10px] lg:text-xs text-op-text font-medium whitespace-nowrap">
                ${seat.stack.toLocaleString()}
              </div>

              {/* Dealer button */}
              {seat.position === 'BTN' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-op-gold border border-op-gold-hover flex items-center justify-center shadow-md">
                  <span className="text-[10px] font-bold text-black">D</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Center area - community cards and pot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 lg:gap-3">
          {/* Community cards */}
          {communityCards && (
            <InlineCards
              notation={communityCards}
              size="sm"
              className="lg:hidden"
            />
          )}
          {communityCards && (
            <InlineCards
              notation={communityCards}
              size="md"
              className="hidden lg:flex"
            />
          )}

          {/* Pot amount */}
          {pot !== undefined && (
            <div className="bg-op-surface/90 backdrop-blur-sm px-3 py-1 lg:px-4 lg:py-1.5 rounded-full border border-op-gold/30">
              <span className="text-xs lg:text-sm font-bold text-op-gold">
                ${pot.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
