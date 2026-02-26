import { cn } from '@/lib/utils';

export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type Suit = 'h' | 'd' | 's' | 'c';
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  rank: Rank;
  suit: Suit;
  size?: CardSize;
  faceDown?: boolean;
  className?: string;
}

const suitSymbols = {
  h: '♥',
  d: '♦',
  s: '♠',
  c: '♣',
} as const;

const suitColors = {
  h: 'text-op-card-red',
  d: 'text-op-card-red',
  s: 'text-op-text',
  c: 'text-op-text',
} as const;

const sizeClasses = {
  sm: 'w-8 h-11 text-xs',
  md: 'w-12 h-[66px] text-sm',
  lg: 'w-16 h-[88px] text-base',
  xl: 'w-[80px] h-[112px] text-lg',
} as const;

const faceCardStyles = 'font-bold';

export function CardRenderer({
  rank,
  suit,
  size = 'md',
  faceDown = false,
  className
}: CardProps) {
  const isFaceCard = ['J', 'Q', 'K'].includes(rank);

  if (faceDown) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'relative rounded flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#0f2744]',
          'shadow-[0_2px_4px_rgba(0,0,0,0.3)]',
          'transition-transform duration-300',
          className
        )}
        aria-label="Face down card"
      >
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <pattern id="diamond-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M10 0 L20 10 L10 20 L0 10 Z" fill="currentColor" className="text-blue-300" />
            </pattern>
            <rect width="100" height="100" fill="url(#diamond-pattern)" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'relative rounded bg-white flex flex-col',
        size === 'xl' ? 'p-1.5 rounded-lg' : size === 'lg' ? 'p-1 rounded-md' : 'p-0.5',
        size === 'xl' || size === 'lg'
          ? 'shadow-[0_4px_16px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.3)]'
          : 'shadow-[0_2px_4px_rgba(0,0,0,0.3)]',
        'transition-transform duration-300 hover:scale-105',
        className
      )}
      aria-label={`${rank} of ${suit === 'h' ? 'hearts' : suit === 'd' ? 'diamonds' : suit === 's' ? 'spades' : 'clubs'}`}
    >
      {/* Top-left corner */}
      <div className={cn(
        'flex flex-col items-center leading-none',
        suitColors[suit],
        isFaceCard && faceCardStyles
      )}>
        <span>{rank}</span>
        <span className="text-[0.6em]">{suitSymbols[suit]}</span>
      </div>

      {/* Center suit symbol */}
      <div className={cn(
        'flex-1 flex items-center justify-center',
        suitColors[suit],
        size === 'sm' ? 'text-base' : size === 'md' ? 'text-2xl' : size === 'lg' ? 'text-4xl' : 'text-5xl'
      )}>
        {suitSymbols[suit]}
        {isFaceCard && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs opacity-30">
            {rank}
          </span>
        )}
      </div>
    </div>
  );
}

// Parse card notation like "Ah", "Kd", "Ts"
export function parseCard(notation: string): { rank: Rank; suit: Suit } | null {
  if (notation.length !== 2) return null;
  const rank = notation[0].toUpperCase() as Rank;
  const suit = notation[1].toLowerCase() as Suit;

  const validRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const validSuits = ['h', 'd', 's', 'c'];

  if (!validRanks.includes(rank) || !validSuits.includes(suit)) {
    return null;
  }

  return { rank, suit };
}

// Render inline cards from notation like "[Ah Kd]"
interface InlineCardsProps {
  notation: string;
  size?: CardSize;
  className?: string;
}

export function InlineCards({ notation, size = 'md', className }: InlineCardsProps) {
  // Remove brackets and split by spaces
  const cardStrings = notation.replace(/[\[\]]/g, '').trim().split(/\s+/);

  const cards = cardStrings
    .map(parseCard)
    .filter((card): card is { rank: Rank; suit: Suit } => card !== null);

  if (cards.length === 0) return null;

  return (
    <div className={cn('flex -space-x-1', className)}>
      {cards.map((card, index) => (
        <CardRenderer
          key={`${card.rank}${card.suit}-${index}`}
          rank={card.rank}
          suit={card.suit}
          size={size}
        />
      ))}
    </div>
  );
}
