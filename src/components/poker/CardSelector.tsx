'use client';

import { cn } from '@/lib/utils';
import { Card, Rank, Suit } from '@/types/poker';

export interface CardSelectorProps {
  selectedCards: Card[];
  disabledCards: Card[];
  maxSelect: number;
  onSelect: (cards: Card[]) => void;
  className?: string;
}

const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

const suitSymbols = {
  h: '♥',
  d: '♦',
  s: '♠',
  c: '♣',
} as const;

const suitColors = {
  h: 'text-op-error',
  d: 'text-op-error',
  s: 'text-op-text',
  c: 'text-op-text',
} as const;

export function CardSelector({
  selectedCards,
  disabledCards,
  maxSelect,
  onSelect,
  className
}: CardSelectorProps) {
  const handleCardClick = (card: Card) => {
    if (disabledCards.includes(card)) return;

    if (selectedCards.includes(card)) {
      // Deselect
      onSelect(selectedCards.filter(c => c !== card));
    } else {
      // Select if under limit
      if (selectedCards.length < maxSelect) {
        onSelect([...selectedCards, card]);
      }
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Suits rows */}
      <div className="space-y-1">
        {SUITS.map((suit) => (
          <div key={suit} className="flex gap-1">
            {/* Suit label */}
            <div className={cn(
              'w-8 h-12 flex items-center justify-center text-xl font-bold',
              suitColors[suit]
            )}>
              {suitSymbols[suit]}
            </div>

            {/* Cards in this suit */}
            <div className="flex gap-1 flex-1">
              {RANKS.map((rank) => {
                const card: Card = `${rank}${suit}`;
                const isSelected = selectedCards.includes(card);
                const isDisabled = disabledCards.includes(card);

                return (
                  <button
                    key={card}
                    onClick={() => handleCardClick(card)}
                    disabled={isDisabled}
                    className={cn(
                      'flex-1 min-w-[32px] h-12 rounded flex flex-col items-center justify-center',
                      'transition-all duration-150 touch-manipulation',
                      'border-2',
                      // Selected state
                      isSelected && 'bg-op-gold/20 border-op-gold shadow-[0_0_8px_rgba(201,162,39,0.4)]',
                      // Normal state
                      !isSelected && !isDisabled && 'bg-op-elevated border-op-border hover:bg-op-elevated hover:border-op-border-medium',
                      // Disabled state
                      isDisabled && 'bg-op-surface border-op-border-subtle opacity-30 cursor-not-allowed',
                      // Active state
                      !isDisabled && 'active:scale-95'
                    )}
                    aria-label={`${rank} of ${suit}`}
                  >
                    <span className={cn(
                      'text-sm font-bold leading-none',
                      isSelected ? 'text-op-gold' : suitColors[suit],
                      isDisabled && 'text-op-text-muted'
                    )}>
                      {rank}
                    </span>
                    <span className={cn(
                      'text-xs leading-none mt-0.5',
                      isSelected ? 'text-op-gold' : suitColors[suit],
                      isDisabled && 'text-op-text-muted'
                    )}>
                      {suitSymbols[suit]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selection indicator */}
      <div className="mt-3 text-xs text-op-text-secondary text-center">
        {selectedCards.length} / {maxSelect} 선택됨
      </div>
    </div>
  );
}
