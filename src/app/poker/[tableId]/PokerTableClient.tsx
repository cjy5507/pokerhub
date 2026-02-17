'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CardRenderer, parseCard } from '@/components/poker/CardRenderer';
import type { GameState, SeatState, Card, PlayerAction } from '@/lib/poker/types';
import { joinTable, leaveTable, performAction } from '../actions';
import { LogOut, MessageSquare, ChevronDown, Volume2, VolumeX, ArrowLeft, Users, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePokerSounds } from '@/lib/poker/sounds';

// ─── Types ────────────────────────────────────────────────────────

interface PokerTableClientProps {
  tableId: string;
  initialState: GameState;
  userId: string | null;
  nickname: string | null;
}

interface ActionLogEntry {
  id: number;
  text: string;
  timestamp: Date;
}

// ─── Korean Action Labels ─────────────────────────────────────────

const ACTION_LABELS_KR: Record<string, string> = {
  fold: '폴드',
  check: '체크',
  call: '콜',
  bet: '벳',
  raise: '레이즈',
  all_in: '올인',
  post_sb: 'SB',
  post_bb: 'BB',
};

// ─── Seat Positioning ─────────────────────────────────────────────

// Positions are defined as percentage-based [top, left] from center of the oval
// Seat 0 is bottom-center (hero default), going clockwise
const SEAT_POSITIONS_2: [number, number][] = [
  [85, 50],  // Seat 0 - bottom center (hero)
  [8, 50],   // Seat 1 - top center (opponent)
];

const SEAT_POSITIONS_6: [number, number][] = [
  [88, 50],  // Seat 0 - bottom center (hero)
  [68, 6],   // Seat 1 - lower left
  [18, 6],   // Seat 2 - upper left
  [2, 50],   // Seat 3 - top center
  [18, 94],  // Seat 4 - upper right
  [68, 94],  // Seat 5 - lower right
];

const SEAT_POSITIONS_9: [number, number][] = [
  [88, 50],  // Seat 0 - bottom center (hero)
  [78, 14],  // Seat 1 - bottom left
  [48, 2],   // Seat 2 - middle left
  [18, 10],  // Seat 3 - upper left
  [5, 32],   // Seat 4 - top left
  [5, 68],   // Seat 5 - top right
  [18, 90],  // Seat 6 - upper right
  [48, 98],  // Seat 7 - middle right
  [78, 86],  // Seat 8 - bottom right
];

// Bet chip positions (offset from seat toward center)
const BET_POSITIONS_2: [number, number][] = [
  [62, 50],
  [28, 50],
];

const BET_POSITIONS_6: [number, number][] = [
  [68, 50],  // from seat 0
  [55, 22],  // from seat 1
  [30, 22],  // from seat 2
  [18, 50],  // from seat 3
  [30, 78],  // from seat 4
  [55, 78],  // from seat 5
];

const BET_POSITIONS_9: [number, number][] = [
  [68, 50],
  [62, 28],
  [44, 18],
  [28, 24],
  [20, 38],
  [20, 62],
  [28, 76],
  [44, 82],
  [62, 72],
];

// ─── Helper Components ────────────────────────────────────────────

function CardBack({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = size === 'sm' ? 'w-7 h-10' : size === 'md' ? 'w-12 h-[66px]' : 'w-[60px] h-[84px]';
  return (
    <div
      className={cn(
        sizeClasses,
        'rounded relative overflow-hidden',
        'shadow-[0_2px_8px_rgba(0,0,0,0.6)]'
      )}
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #1a2f4f 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%),
                           radial-gradient(circle at 70% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1/2 h-1/2 rounded-full border-2 border-[#3a5a7f]/40 bg-gradient-to-br from-[#2a4a6f]/30 to-transparent" />
      </div>
      <div className="absolute inset-0 rounded border border-[#4a6a8f]/50" />
    </div>
  );
}

function TimerBar({ timeLeft, maxTime = 30 }: { timeLeft: number; maxTime?: number }) {
  const pct = Math.max(0, (timeLeft / maxTime) * 100);
  const color = pct > 50 ? 'bg-[#22c55e]' : pct > 25 ? 'bg-[#eab308]' : 'bg-[#ef4444]';
  const isUrgent = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className={cn(
      'w-full h-1 bg-[#333] rounded-full overflow-hidden',
      isUrgent && 'animate-timer-shake'
    )}>
      <div
        className={cn('h-full rounded-full transition-all duration-1000 ease-linear', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DealerButton() {
  return (
    <div
      className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
      style={{
        background: 'linear-gradient(135deg, #f4e5b8 0%, #d4af37 50%, #c9a227 100%)',
        boxShadow: '0 0 12px rgba(212, 175, 55, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4)',
        border: '1.5px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      <span className="text-[8px] font-bold text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">D</span>
    </div>
  );
}

function ChipAmount({ amount, animate }: { amount: number; animate?: boolean }) {
  if (amount <= 0) return null;
  return (
    <div
      className={cn(
        'backdrop-blur-sm px-2 py-0.5 rounded-full relative overflow-hidden',
        animate && 'animate-chip-to-pot'
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 12px rgba(201, 162, 39, 0.3)',
        border: '1px solid rgba(201, 162, 39, 0.5)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(201, 162, 39, 0.2) 0%, transparent 70%)',
        }}
      />
      <span className="text-[9px] md:text-[11px] font-bold text-[#c9a227] relative z-10 drop-shadow-[0_0_6px_rgba(201,162,39,0.6)]">
        {amount.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Buy-in Modal ─────────────────────────────────────────────────

function BuyInModal({
  seatNumber,
  minBuyIn,
  maxBuyIn,
  onConfirm,
  onCancel,
}: {
  seatNumber: number;
  minBuyIn: number;
  maxBuyIn: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}) {
  const [buyIn, setBuyIn] = useState(Math.floor((minBuyIn + maxBuyIn) / 2));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200]" onClick={onCancel}>
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-sm w-full"
        style={{
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,162,39,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#c9a227] mb-4">{seatNumber + 1}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-2">
              바이인: <span className="text-[#c9a227] font-semibold">{buyIn.toLocaleString()}P</span>
            </label>
            <input
              type="range"
              min={minBuyIn}
              max={maxBuyIn}
              step={Math.max(1, Math.floor(minBuyIn / 10))}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              className="w-full accent-[#c9a227]"
            />
            <div className="flex justify-between text-xs text-[#666] mt-1">
              <span>{minBuyIn.toLocaleString()}</span>
              <span>{maxBuyIn.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {[minBuyIn, Math.floor((minBuyIn + maxBuyIn) / 2), maxBuyIn].map((preset) => (
              <button
                key={preset}
                onClick={() => setBuyIn(preset)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  buyIn === preset
                    ? 'bg-[#c9a227] text-black'
                    : 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333]'
                )}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-[#e0e0e0] font-semibold py-3 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => onConfirm(buyIn)}
              className="flex-1 bg-[#c9a227] hover:bg-[#b89320] text-black font-semibold py-3 rounded-xl transition-colors"
            >
              착석
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Seat Component ───────────────────────────────────────────────

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
}: {
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
}) {
  // Empty seat
  if (!seat) {
    return (
      <button
        onClick={() => onSitDown(seatIndex)}
        className={cn(
          'w-11 h-11 md:w-14 md:h-14 rounded-full flex flex-col items-center justify-center',
          'relative overflow-hidden cursor-pointer group',
          'transition-all duration-300'
        )}
        style={{
          background: 'radial-gradient(circle at center, rgba(26, 26, 26, 0.6) 0%, rgba(10, 10, 10, 0.4) 100%)',
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#c9a227]/0 to-[#c9a227]/0 group-hover:from-[#c9a227]/20 group-hover:to-[#d4af37]/10 transition-all duration-300" />
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#333] group-hover:border-[#c9a227]/60 transition-colors duration-300" />
        <span className="text-[10px] md:text-xs text-[#555] group-hover:text-[#c9a227] font-medium relative z-10 transition-colors">+</span>
      </button>
    );
  }

  const hasCards = seat.holeCards && seat.holeCards.length > 0;

  return (
    <div className={cn('flex flex-col items-center gap-0.5 relative', seat.isFolded && 'opacity-40')}>
      {/* Dealer button */}
      {isDealer && <DealerButton />}

      {/* Last action badge */}
      {lastAction && !seat.isFolded && (
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 backdrop-blur-md px-2 py-0.5 rounded-md whitespace-nowrap z-10 animate-action-badge"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 12px rgba(201, 162, 39, 0.3)',
            border: '1px solid rgba(201, 162, 39, 0.4)',
          }}
        >
          <span className="text-[8px] md:text-[10px] font-bold text-[#c9a227] drop-shadow-[0_0_6px_rgba(201,162,39,0.5)]">{lastAction}</span>
        </div>
      )}

      {/* Avatar */}
      <div
        className={cn(
          'w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center relative overflow-hidden',
          'transition-all duration-300',
          seat.isAllIn && 'ring-2 ring-[#ef4444]/60'
        )}
        style={
          isCurrent && !seat.isFolded
            ? {
                background: 'linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 50%, #151515 100%)',
                boxShadow: '0 0 24px rgba(201, 162, 39, 0.7), 0 0 48px rgba(201, 162, 39, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.05), 0 4px 8px rgba(0, 0, 0, 0.5)',
              }
            : isHero
              ? {
                  background: 'linear-gradient(135deg, #d4af37 0%, #c9a227 50%, #a68523 100%)',
                  boxShadow: '0 0 16px rgba(212, 175, 55, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4)',
                }
              : {
                  background: 'linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 50%, #151515 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.05), 0 4px 8px rgba(0, 0, 0, 0.5)',
                }
        }
      >
        {/* Active player animated ring */}
        {isCurrent && !seat.isFolded && (
          <div
            className="absolute -inset-[3px] rounded-full animate-seat-glow"
            style={{
              border: '2.5px solid #c9a227',
            }}
          />
        )}

        {/* Border */}
        <div
          className={cn(
            'absolute inset-0 rounded-full border-2 transition-all duration-300',
            isHero ? 'border-[#f4e5b8]/60' : 'border-[#3a3a3a]',
            isCurrent && !seat.isFolded && 'border-[#c9a227]'
          )}
        />

        <span
          className={cn(
            'text-sm md:text-base font-bold relative z-10',
            isHero ? 'text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]' : 'text-[#e0e0e0]'
          )}
        >
          {seat.nickname.charAt(0).toUpperCase()}
        </span>

        {/* Fold overlay */}
        {seat.isFolded && (
          <div className="absolute inset-0 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="text-[7px] md:text-[8px] font-bold text-red-400 tracking-wider">폴드</span>
          </div>
        )}

        {/* All-in badge */}
        {seat.isAllIn && (
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap z-20 animate-all-in-pulse"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4)',
            }}
          >
            올인
          </div>
        )}
      </div>

      {/* Nickname */}
      <span className={cn(
        'text-[9px] md:text-[11px] font-semibold max-w-[60px] md:max-w-[80px] truncate text-center leading-tight',
        isHero ? 'text-[#c9a227]' : 'text-[#e0e0e0]'
      )}>
        {seat.nickname}
      </span>

      {/* Chip stack */}
      <div
        className="px-2 py-0.5 rounded-full relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 17, 17, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(51, 51, 51, 0.8)',
        }}
      >
        <span className="text-[9px] md:text-[11px] text-[#c9a227] font-bold relative z-10">
          {seat.chipStack.toLocaleString()}
        </span>
      </div>

      {/* Hole cards (shown on seat for non-hero; small) */}
      {!isHero && hasCards && showCards && (
        <div className="flex -space-x-1 mt-0.5">
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

      {/* Card backs for opponents who haven't folded and have cards */}
      {!isHero && !seat.isFolded && !showCards && !seat.isSittingOut && seat.holeCards === null && (
        <div className="flex -space-x-1.5 mt-0.5">
          <div className={cn(hasNewCards && 'animate-card-deal')} style={hasNewCards ? { animationDelay: '0ms' } : undefined}>
            <CardBack size="sm" />
          </div>
          <div className={cn(hasNewCards && 'animate-card-deal')} style={hasNewCards ? { animationDelay: '80ms' } : undefined}>
            <CardBack size="sm" />
          </div>
        </div>
      )}

      {/* Timer bar for active player */}
      {isCurrent && !seat.isFolded && (
        <div className="w-11 md:w-14 mt-0.5">
          <TimerBar timeLeft={timeLeft} />
        </div>
      )}
    </div>
  );
}

// ─── Win Overlay ──────────────────────────────────────────────────

function WinOverlay({ winnerName, amount }: { winnerName: string; amount: number }) {
  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div
        className="animate-pot-win backdrop-blur-sm px-6 py-3 rounded-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.25) 0%, rgba(212, 175, 55, 0.15) 100%)',
          boxShadow: '0 0 40px rgba(201, 162, 39, 0.4), 0 0 80px rgba(201, 162, 39, 0.2)',
          border: '1px solid rgba(201, 162, 39, 0.5)',
        }}
      >
        <p className="text-lg md:text-xl font-bold text-[#f4e5b8] drop-shadow-[0_0_12px_rgba(201,162,39,0.8)]">
          {winnerName}
        </p>
        <p className="text-sm md:text-base font-semibold text-[#c9a227]">
          +{amount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ─── Hand History Bottom Sheet ────────────────────────────────────

function HandHistorySheet({
  isOpen,
  onClose,
  actionLog,
}: {
  isOpen: boolean;
  onClose: () => void;
  actionLog: ActionLogEntry[];
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[150] transition-all duration-300',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-2xl transition-transform duration-300 max-h-[60vh] flex flex-col',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#444] rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 pb-2 border-b border-[#2a2a2a]">
          <h3 className="text-sm font-semibold text-[#e0e0e0]">핸드 히스토리</h3>
          <button
            onClick={onClose}
            className="text-[#666] hover:text-[#e0e0e0] transition-colors p-1"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
          {actionLog.length === 0 ? (
            <p className="text-xs text-[#555] text-center mt-8">아직 액션이 없습니다</p>
          ) : (
            actionLog.map((entry) => (
              <div key={entry.id} className="text-[11px] text-[#a0a0a0] py-1 border-b border-[#222]">
                {entry.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function PokerTableClient({ tableId, initialState, userId, nickname }: PokerTableClientProps) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [lastActions, setLastActions] = useState<Record<number, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [buyInModal, setBuyInModal] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const [preAction, setPreAction] = useState<'fold' | 'check_fold' | 'call' | null>(null);
  const [potBounce, setPotBounce] = useState(false);
  const [winOverlay, setWinOverlay] = useState<{ name: string; amount: number } | null>(null);
  const [newCardsDealt, setNewCardsDealt] = useState(false);
  const logIdRef = useRef(0);

  // Refs for detecting state changes (animations & sounds)
  const prevHandIdRef = useRef<string | null>(null);
  const prevCommunityCountRef = useRef(0);
  const prevTurnRef = useRef<number | null>(null);
  const prevLastActionRef = useRef<string | null>(null);
  const prevPotRef = useRef(0);
  const prevTimeLeftRef = useRef(30);

  // Sound system
  const sounds = usePokerSounds();

  // Sync mute state with sound manager
  useEffect(() => {
    sounds.setMuted(isMuted);
  }, [isMuted, sounds]);

  // Derived state - safety check for seats
  const seats = gameState?.seats ?? [];
  const heroSeatIndex = seats.findIndex((s) => s?.userId === userId);
  const heroSeat = heroSeatIndex >= 0 ? seats[heroSeatIndex] : null;
  const isSeated = heroSeatIndex >= 0;
  const isHeroTurn = gameState?.currentSeat !== null && gameState?.currentSeat === heroSeatIndex;
  const isPlaying = gameState?.status === 'playing' && gameState?.handId !== null;
  const isShowdown = gameState?.street === 'showdown';

  const maxSeats = gameState?.maxSeats ?? 6;
  const seatPositions =
    maxSeats === 2 ? SEAT_POSITIONS_2 :
    maxSeats === 9 ? SEAT_POSITIONS_9 : SEAT_POSITIONS_6;
  const betPositions =
    maxSeats === 2 ? BET_POSITIONS_2 :
    maxSeats === 9 ? BET_POSITIONS_9 : BET_POSITIONS_6;

  const minBuyIn = (gameState?.bigBlind ?? 2) * 20;
  const maxBuyIn = (gameState?.bigBlind ?? 2) * 100;

  // Compute action availability
  const callAmount = Math.max(0, gameState.currentBet - (heroSeat?.betInRound ?? 0));
  const canCheck = callAmount === 0;
  const minRaiseTotal = gameState.currentBet > 0
    ? gameState.currentBet + gameState.minRaise
    : gameState.minRaise;
  const maxRaiseTotal = heroSeat?.chipStack ?? 0;

  // Set initial raise amount
  useEffect(() => {
    if (isHeroTurn) {
      setRaiseAmount(Math.min(minRaiseTotal, maxRaiseTotal));
    }
  }, [isHeroTurn, minRaiseTotal, maxRaiseTotal]);

  // Close raise slider when it's not hero's turn
  useEffect(() => {
    if (!isHeroTurn) {
      setShowRaiseSlider(false);
    }
  }, [isHeroTurn]);

  // Clear pre-action when hero folds or hand ends
  useEffect(() => {
    if (!isPlaying || heroSeat?.isFolded) {
      setPreAction(null);
    }
  }, [isPlaying, heroSeat?.isFolded]);

  // Pre-action auto-execute is below handleAction declaration

  // ─── Timer sound effects ────────────────────────────────────────
  useEffect(() => {
    if (!isHeroTurn) return;
    const tl = gameState.turnTimeLeft;
    if (tl <= 3 && tl > 0 && tl !== prevTimeLeftRef.current) {
      sounds.timerUrgent();
    } else if (tl <= 5 && tl > 3 && tl !== prevTimeLeftRef.current) {
      sounds.timerWarning();
    }
    prevTimeLeftRef.current = tl;
  }, [gameState.turnTimeLeft, isHeroTurn, sounds]);

  // ─── SSE Connection ───────────────────────────────────────────

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      eventSource = new EventSource(`/api/poker/${tableId}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'game_state') {
            const t = data.table;
            const sseSeats = data.seats ?? [];
            const hand = data.hand;

            const reconstructed: GameState = {
              tableId: t.id,
              tableName: t.name,
              smallBlind: t.smallBlind,
              bigBlind: t.bigBlind,
              maxSeats: sseSeats.length,
              handId: hand?.id ?? null,
              handNumber: hand?.handNumber ?? 0,
              street: hand?.status ?? null,
              communityCards: hand?.communityCards ?? [],
              pot: hand?.pot ?? 0,
              sidePots: [],
              currentSeat: hand?.currentSeat ?? null,
              currentBet: hand?.currentBet ?? 0,
              minRaise: hand?.minRaise ?? t.bigBlind,
              dealerSeat: hand?.dealerSeat ?? 0,
              seats: sseSeats.map((s: any) =>
                s
                  ? {
                      seatNumber: s.seatNumber,
                      userId: s.userId,
                      nickname: s.nickname ?? 'Player',
                      chipStack: s.chipStack,
                      holeCards: s.holeCards ?? null,
                      betInRound: s.betInRound ?? 0,
                      totalBetInHand: s.totalBetInHand ?? 0,
                      isFolded: s.isFolded ?? false,
                      isAllIn: s.isAllIn ?? false,
                      isSittingOut: s.isSittingOut ?? false,
                      isActive: s.isActive ?? true,
                    }
                  : null
              ),
              lastAction: hand?.lastAction ?? null,
              actionClosedBySeat: null,
              turnTimeLeft: hand?.turnTimeLeft ?? 30,
              status: t.status === 'closed' ? 'paused' : t.status,
            };

            // ── Sound & Animation Triggers ──

            // Detect new hand
            if (hand?.id && hand.id !== prevHandIdRef.current) {
              sounds.newHand();
              // Brief flag for card deal animation
              setNewCardsDealt(true);
              setTimeout(() => setNewCardsDealt(false), 1500);
              prevCommunityCountRef.current = 0;
              prevHandIdRef.current = hand.id;
            }

            // Detect new community cards
            const newCCCount = (hand?.communityCards ?? []).length;
            if (newCCCount > prevCommunityCountRef.current) {
              const newCards = newCCCount - prevCommunityCountRef.current;
              for (let c = 0; c < newCards; c++) {
                setTimeout(() => { sounds.communityCard(); }, c * 150);
              }
              prevCommunityCountRef.current = newCCCount;
            }

            // Detect turn change
            if (reconstructed.currentSeat !== null && reconstructed.currentSeat !== prevTurnRef.current) {
              const heroIdx = sseSeats.findIndex((s: any) => s?.userId === userId);
              if (reconstructed.currentSeat === heroIdx) {
                sounds.yourTurn();
              }
              prevTurnRef.current = reconstructed.currentSeat;
            }

            // Detect pot increase (betting round complete)
            if (reconstructed.pot > prevPotRef.current && prevPotRef.current > 0) {
              setPotBounce(true);
              setTimeout(() => setPotBounce(false), 400);
            }
            prevPotRef.current = reconstructed.pot;

            // Detect hand completion + winner
            if (
              prevHandIdRef.current &&
              hand?.id !== prevHandIdRef.current &&
              !hand?.id
            ) {
              // Hand ended - check if hero won
              // This is handled by the showdown/pot_awarded events
            }

            setGameState(reconstructed);

            // ── Last Action Sound + Display ──
            if (hand?.lastAction) {
              const la = hand.lastAction;
              const actionKey = la.action as string;

              // Play action sound
              const soundActionId = `${la.seatNumber}-${la.action}-${Date.now()}`;
              if (soundActionId !== prevLastActionRef.current) {
                prevLastActionRef.current = soundActionId;
                switch (la.action) {
                  case 'fold': sounds.fold(); break;
                  case 'check': sounds.check(); break;
                  case 'call': sounds.call(); break;
                  case 'bet':
                  case 'raise': sounds.raise(); break;
                  case 'all_in': sounds.allIn(); break;
                  case 'post_sb':
                  case 'post_bb': sounds.chipBet(); break;
                }
              }

              const text = ACTION_LABELS_KR[actionKey] ?? la.action;
              const display = la.amount > 0 ? `${text} ${la.amount.toLocaleString()}` : text;
              setLastActions(prev => ({ ...prev, [la.seatNumber]: display }));
              setTimeout(() => {
                setLastActions(prev => {
                  const next = { ...prev };
                  delete next[la.seatNumber];
                  return next;
                });
              }, 3000);
            }
          } else if (data.type === 'heartbeat' && data.turnTimeLeft !== undefined) {
            setGameState(prev => ({
              ...prev,
              turnTimeLeft: data.turnTimeLeft,
            }));
          } else if (data.type === 'table_closed') {
            // Table was closed due to inactivity, redirect to lobby
            window.location.href = '/poker';
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [tableId, userId, sounds]);

  // ─── Detect showdown / win for hero ──────────────────────────
  useEffect(() => {
    if (isShowdown && heroSeat && !heroSeat.isFolded) {
      // Hero made it to showdown - check for win indication
      // We detect a win by seeing chipStack increase after showdown
      // For now trigger the sound on showdown; the overlay is shown
      // if the SSE sends specific winner info or on hand completion
    }
  }, [isShowdown, heroSeat]);

  // ─── Log Helper ───────────────────────────────────────────────

  const addLogEntry = useCallback((text: string) => {
    const id = ++logIdRef.current;
    setActionLog((prev) => [...prev.slice(-49), { id, text, timestamp: new Date() }]);
  }, []);

  // ─── Action Handlers ─────────────────────────────────────────

  const handleSitDown = useCallback((seatIndex: number) => {
    if (!userId) return;
    setBuyInModal(seatIndex);
  }, [userId]);

  const handleBuyInConfirm = useCallback(async (amount: number) => {
    if (buyInModal === null) return;
    try {
      await joinTable(tableId, buyInModal, amount);
      setBuyInModal(null);
      const updatedState = { ...gameState };
      updatedState.seats = [...updatedState.seats];
      updatedState.seats[buyInModal] = {
        seatNumber: buyInModal,
        userId: userId!,
        nickname: nickname ?? 'Player',
        chipStack: amount,
        holeCards: null,
        betInRound: 0,
        totalBetInHand: 0,
        isFolded: false,
        isAllIn: false,
        isSittingOut: false,
        isActive: true,
      };
      setGameState(updatedState);
      addLogEntry(`${nickname ?? 'Player'} 좌석 ${buyInModal + 1}에 착석 (${amount.toLocaleString()}P)`);
    } catch (err: any) {
      alert(err.message || '착석할 수 없습니다');
    }
  }, [buyInModal, tableId, gameState, userId, nickname, addLogEntry]);

  const handleLeave = useCallback(async () => {
    if (!isSeated || isLeaving) return;
    if (isPlaying && !heroSeat?.isFolded) {
      const confirmed = window.confirm('핸드 진행 중 일어나면 칩을 잃을 수 있습니다. 계속하시겠습니까?');
      if (!confirmed) return;
    }
    setIsLeaving(true);
    try {
      const result = await leaveTable(tableId);
      addLogEntry(`${nickname ?? 'Player'} 퇴장 (${result.chipsReturned.toLocaleString()}P 반환)`);
      const updatedState = { ...gameState };
      updatedState.seats = [...updatedState.seats];
      updatedState.seats[heroSeatIndex] = null;
      setGameState(updatedState);
    } catch (err: any) {
      alert(err.message || '퇴장할 수 없습니다');
    } finally {
      setIsLeaving(false);
    }
  }, [isSeated, isLeaving, isPlaying, heroSeat, tableId, nickname, gameState, heroSeatIndex, addLogEntry]);

  const handleAction = useCallback(async (action: PlayerAction, amount?: number) => {
    if (actionPending || !isHeroTurn) return;
    setActionPending(true);
    try {
      await performAction(tableId, action, amount);
      const actionText =
        action === 'fold' ? '폴드' :
        action === 'check' ? '체크' :
        action === 'call' ? `콜 ${(amount ?? callAmount).toLocaleString()}` :
        action === 'bet' ? `벳 ${(amount ?? 0).toLocaleString()}` :
        action === 'raise' ? `레이즈 ${(amount ?? 0).toLocaleString()}` :
        `올인 ${(amount ?? 0).toLocaleString()}`;
      addLogEntry(`${nickname ?? 'Player'}: ${actionText}`);
      setShowRaiseSlider(false);
    } catch (err: any) {
      alert(err.message || '액션을 수행할 수 없습니다');
    } finally {
      setActionPending(false);
    }
  }, [actionPending, isHeroTurn, tableId, callAmount, nickname, addLogEntry]);

  // Auto-execute pre-action when it becomes hero's turn
  useEffect(() => {
    if (isHeroTurn && preAction && !actionPending) {
      if (preAction === 'fold') {
        handleAction('fold');
      } else if (preAction === 'check_fold') {
        if (canCheck) handleAction('check');
        else handleAction('fold');
      } else if (preAction === 'call') {
        if (canCheck) handleAction('check');
        else handleAction('call', callAmount);
      }
      setPreAction(null);
    }
  }, [isHeroTurn, preAction, actionPending, canCheck, callAmount, handleAction]);

  // ─── Bet Sizing Presets ───────────────────────────────────────

  const pot = gameState.pot;
  const betPresets = [
    { label: '최소', value: minRaiseTotal },
    { label: '1/2', value: Math.max(minRaiseTotal, Math.floor(pot / 2)) },
    { label: '3/4', value: Math.max(minRaiseTotal, Math.floor((pot * 3) / 4)) },
    { label: '팟', value: Math.max(minRaiseTotal, pot) },
    { label: '올인', value: maxRaiseTotal },
  ].map((p) => ({
    ...p,
    value: Math.min(p.value, maxRaiseTotal),
  }));

  // ─── Community Cards ────────────────────────────────────────

  const communityCardSlots = 5;
  const communityCards = gameState.communityCards;

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="h-[100dvh] w-[100dvw] bg-[#0a0a0a] flex flex-col overflow-hidden select-none">

      {/* ═══════════════════════════════════════════════════════════
          TOP BAR - Minimal, 40px height
          ═══════════════════════════════════════════════════════════ */}
      <header className="flex-shrink-0 h-10 md:h-12 flex items-center justify-between px-3 md:px-5 bg-[#0f0f0f]/90 backdrop-blur-sm border-b border-[#1a1a1a] z-30">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link
            href="/poker"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#1e1e1e] text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xs md:text-sm font-semibold text-[#e0e0e0] truncate max-w-[120px] md:max-w-none">
            {gameState.tableName}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] md:text-xs text-[#c9a227] font-medium bg-[#c9a227]/10 px-2 py-0.5 rounded-full">
              {gameState.smallBlind}/{gameState.bigBlind}
            </span>
            <span className="hidden md:inline text-[10px] text-[#666] bg-[#1e1e1e] px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3 inline mr-1" />
              {seats.filter((s) => s !== null).length}/{maxSeats}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e1e1e] text-[#666] hover:text-[#a0a0a0] transition-colors"
            title="핸드 히스토리"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e1e1e] text-[#666] hover:text-[#a0a0a0] transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {isSeated && (
            <button
              onClick={handleLeave}
              disabled={isLeaving}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors',
                'text-[#ef4444]/60 hover:text-[#ef4444] hover:bg-[#ef4444]/10',
                isLeaving && 'opacity-50 cursor-not-allowed'
              )}
              title="일어나기"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium">일어나기</span>
            </button>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          TABLE AREA - Fills remaining space between header and hero
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
        {/* Win overlay */}
        {winOverlay && (
          <WinOverlay winnerName={winOverlay.name} amount={winOverlay.amount} />
        )}

        {/* Table container -- fills as much space as possible */}
        <div className="relative w-[96%] md:w-[88%] lg:w-[75%] max-w-[800px] aspect-[5/3]">
          {/* Wooden outer rim */}
          <div
            className="absolute inset-0 rounded-[50%/42%]"
            style={{
              background: 'linear-gradient(180deg, #2a1810 0%, #1a0f08 40%, #2a1810 100%)',
              boxShadow: '0 12px 60px rgba(0, 0, 0, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.03)',
            }}
          >
            {/* Inner wooden detail */}
            <div
              className="absolute inset-[6px] md:inset-2 rounded-[50%/42%]"
              style={{
                background: 'linear-gradient(90deg, #1a0f08 0%, #2a1810 50%, #1a0f08 100%)',
                boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.6)',
              }}
            />

            {/* Gold inner rail */}
            <div
              className="absolute inset-3 md:inset-4 lg:inset-5 rounded-[50%/42%]"
              style={{
                background: 'linear-gradient(135deg, #c9a227 0%, #d4af37 50%, #c9a227 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 0 8px rgba(201, 162, 39, 0.2)',
                padding: '2px',
              }}
            >
              {/* Felt surface */}
              <div
                className="w-full h-full rounded-[50%/42%] relative overflow-hidden"
                style={{
                  background: 'radial-gradient(ellipse at 50% 40%, #0d6b3f 0%, #0a5535 40%, #083d2a 100%)',
                  boxShadow:
                    'inset 0 0 80px rgba(0, 0, 0, 0.5), inset 0 -20px 60px rgba(0, 0, 0, 0.3), inset 0 20px 40px rgba(255, 255, 255, 0.03)',
                }}
              >
                {/* Spotlight effect */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
                  }}
                />

                {/* Subtle felt texture */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px),
                      repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)
                    `,
                  }}
                />

                {/* Noise texture */}
                <div
                  className="absolute inset-0 opacity-[0.015]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* Decorative inner border */}
                <div
                  className="absolute inset-[8%] md:inset-[6%] rounded-[50%/42%] pointer-events-none"
                  style={{
                    border: '1px solid rgba(201, 162, 39, 0.12)',
                    boxShadow: 'inset 0 0 20px rgba(201, 162, 39, 0.06)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Community Cards ── */}
          <div className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 md:gap-2 z-10">
            <div className="flex gap-0.5 md:gap-1">
              {Array.from({ length: communityCardSlots }).map((_, i) => {
                const card = communityCards[i];
                if (!card) {
                  return (
                    <div
                      key={i}
                      className="w-8 h-11 md:w-12 md:h-[66px] rounded relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(10, 61, 42, 0.3) 0%, rgba(8, 45, 32, 0.4) 100%)',
                        boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(26, 85, 64, 0.2)',
                      }}
                    >
                      <div
                        className="absolute inset-[2px] rounded-sm"
                        style={{ border: '1px dashed rgba(201, 162, 39, 0.1)' }}
                      />
                    </div>
                  );
                }
                const parsed = parseCard(card);
                if (!parsed) return null;

                // Determine animation: flop (0-2) gets staggered reveal, turn (3) & river (4) get flip
                const isFlop = i < 3;
                const isRiver = i === 4;

                return (
                  <div
                    key={i}
                    className="animate-community-reveal"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className={cn(isRiver && 'drop-shadow-[0_0_8px_rgba(201,162,39,0.3)]')}>
                      <CardRenderer
                        rank={parsed.rank}
                        suit={parsed.suit}
                        size="sm"
                        className="md:hidden"
                      />
                      <CardRenderer
                        rank={parsed.rank}
                        suit={parsed.suit}
                        size="md"
                        className="hidden md:flex"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pot display */}
            {gameState.pot > 0 && (
              <div
                className={cn(
                  'backdrop-blur-md px-3 py-1 md:px-4 md:py-1.5 rounded-full relative overflow-hidden',
                  potBounce && 'animate-pot-bounce'
                )}
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(15, 15, 15, 0.9) 100%)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 16px rgba(201, 162, 39, 0.15)',
                  border: '1px solid rgba(201, 162, 39, 0.35)',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(201, 162, 39, 0.12) 0%, transparent 70%)',
                  }}
                />
                <span className="text-[10px] md:text-xs font-bold text-[#c9a227] relative z-10 drop-shadow-[0_0_8px_rgba(201,162,39,0.5)]">
                  팟 {gameState.pot.toLocaleString()}
                </span>
              </div>
            )}

            {/* Side pots */}
            {gameState.sidePots.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-center">
                {gameState.sidePots.map((sp, i) => (
                  <div
                    key={i}
                    className="bg-[#1a1a1a]/70 px-2 py-0.5 rounded-full border border-[#444]/30 text-[8px] md:text-[9px] text-[#888]"
                  >
                    사이드: {sp.amount.toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Status overlay (waiting) ── */}
          {gameState.status === 'waiting' && (
            <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div
                className="backdrop-blur-md px-5 py-3 md:px-8 md:py-4 rounded-xl text-center relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(201, 162, 39, 0.2)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(201, 162, 39, 0.1) 0%, transparent 70%)',
                  }}
                />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <div className="w-1.5 h-1.5 bg-[#c9a227] rounded-full animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-[#c9a227] rounded-full animate-pulse [animation-delay:0.3s]" />
                    <div className="w-1.5 h-1.5 bg-[#c9a227] rounded-full animate-pulse [animation-delay:0.6s]" />
                  </div>
                  <p className="text-xs md:text-sm text-[#e0e0e0] font-medium">플레이어 대기 중...</p>
                  <p className="text-[9px] md:text-[10px] text-[#666] mt-0.5">최소 2명 필요</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Seats ── */}
          {seatPositions.map((pos, i) => {
            if (i >= maxSeats) return null;
            const seat = seats[i];
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: `${pos[0]}%`, left: `${pos[1]}%` }}
              >
                <SeatDisplay
                  seat={seat}
                  seatIndex={i}
                  isHero={i === heroSeatIndex}
                  isDealer={gameState.dealerSeat === i && isPlaying}
                  isCurrent={gameState.currentSeat === i}
                  timeLeft={gameState.currentSeat === i ? gameState.turnTimeLeft : 0}
                  showCards={isShowdown}
                  onSitDown={handleSitDown}
                  lastAction={lastActions[i]}
                  hasNewCards={newCardsDealt}
                />
              </div>
            );
          })}

          {/* ── Bet chips in front of seats ── */}
          {betPositions.map((pos, i) => {
            if (i >= maxSeats) return null;
            const seat = seats[i];
            if (!seat || seat.betInRound <= 0) return null;
            return (
              <div
                key={`bet-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ top: `${pos[0]}%`, left: `${pos[1]}%` }}
              >
                <ChipAmount amount={seat.betInRound} animate />
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          HERO ZONE - Cards + Status + Actions (PokerStars Style)
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="flex-shrink-0 bg-gradient-to-t from-[#080808] via-[#0c0c0c] to-transparent"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {isSeated && heroSeat ? (
          <div>
            {/* Hero cards row */}
            <div className="px-3 md:px-6 pt-1 pb-1 flex items-end gap-3 md:gap-5">
              {/* Hero hole cards -- LARGE with hover lift */}
              <div className="flex gap-1 md:gap-1.5 flex-shrink-0">
                {heroSeat.holeCards && heroSeat.holeCards.length > 0 ? (
                  heroSeat.holeCards.map((card, i) => {
                    const parsed = parseCard(card);
                    if (!parsed) return null;
                    return (
                      <div
                        key={i}
                        className="animate-card-deal hero-card-hover"
                        style={{ animationDelay: `${i * 120}ms` }}
                      >
                        <CardRenderer
                          rank={parsed.rank}
                          suit={parsed.suit}
                          size="lg"
                          className={cn(
                            'md:hidden shadow-[0_4px_20px_rgba(0,0,0,0.6)]',
                            heroSeat.isFolded && 'opacity-40'
                          )}
                        />
                        <CardRenderer
                          rank={parsed.rank}
                          suit={parsed.suit}
                          size="xl"
                          className={cn(
                            'hidden md:flex shadow-[0_6px_24px_rgba(0,0,0,0.6)]',
                            heroSeat.isFolded && 'opacity-40'
                          )}
                        />
                      </div>
                    );
                  })
                ) : isPlaying && !heroSeat.isFolded ? (
                  <div className="flex gap-1">
                    <CardBack size="md" />
                    <CardBack size="md" />
                  </div>
                ) : null}
              </div>

              {/* Center status area */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-[48px] gap-1.5">
                {/* Status text when not hero's turn and no pre-actions showing */}
                {!isHeroTurn && (
                  <>
                    {isPlaying && !heroSeat.isFolded && (
                      <p className="text-[11px] md:text-xs text-[#555] font-medium">
                        {gameState?.currentSeat !== null
                          ? `${seats[gameState?.currentSeat ?? 0]?.nickname ?? 'Player'}님 차례...`
                          : '대기 중...'}
                      </p>
                    )}
                    {heroSeat.isFolded && (
                      <p className="text-[11px] md:text-xs text-[#555] font-medium">폴드됨</p>
                    )}
                    {!isPlaying && (
                      <p className="text-[11px] md:text-xs text-[#555] font-medium">
                        {gameState.status === 'waiting' ? '플레이어 대기 중...' : '다음 핸드 시작 중...'}
                      </p>
                    )}
                  </>
                )}

                {/* Timer badge when it's hero's turn */}
                {isHeroTurn && !heroSeat.isFolded && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                        gameState.turnTimeLeft > 10
                          ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30'
                          : gameState.turnTimeLeft > 5
                            ? 'bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/30'
                            : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 animate-pulse'
                      )}
                    >
                      {gameState.turnTimeLeft}초
                    </div>
                  </div>
                )}

                {/* Leave seat button - shown when folded or not in active hand */}
                {(heroSeat.isFolded || !isPlaying) && (
                  <button
                    onClick={handleLeave}
                    disabled={isLeaving}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                      'bg-[#1a1a1a] border border-[#333] text-[#ef4444]/70 hover:text-[#ef4444] hover:border-[#ef4444]/40',
                      isLeaving && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <LogOut className="w-3 h-3" />
                      {isLeaving ? '나가는 중...' : '일어나기'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Action Bar: PokerStars Style ── */}
            {isHeroTurn && !heroSeat.isFolded && (
              <div className="px-2 pb-2 pt-1">
                {/* Raise panel (expanded) */}
                {showRaiseSlider && (
                  <div
                    className="mb-2 rounded-xl p-3"
                    style={{
                      background: 'linear-gradient(180deg, rgba(17,17,17,0.97) 0%, rgba(11,11,11,0.97) 100%)',
                      border: '1px solid rgba(42,42,42,0.8)',
                      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Preset pills */}
                    <div className="flex gap-1.5 mb-2.5 justify-center">
                      {betPresets.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => setRaiseAmount(p.value)}
                          className={cn(
                            'px-3 py-1 rounded-full text-[10px] font-bold transition-all',
                            raiseAmount === p.value
                              ? 'bg-[#c9a227] text-black shadow-[0_0_10px_rgba(201,162,39,0.4)]'
                              : 'bg-[#1e1e1e] text-[#777] hover:text-[#aaa] border border-[#333] hover:border-[#555]'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Slider with -/+ controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRaiseAmount(Math.max(minRaiseTotal, raiseAmount - gameState.bigBlind))}
                        className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555] flex items-center justify-center transition-all active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="range"
                        min={minRaiseTotal}
                        max={maxRaiseTotal}
                        step={Math.max(1, gameState.bigBlind)}
                        value={raiseAmount}
                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                        className="flex-1 poker-slider"
                      />
                      <button
                        onClick={() => setRaiseAmount(Math.min(maxRaiseTotal, raiseAmount + gameState.bigBlind))}
                        className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555] flex items-center justify-center transition-all active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Amount display + pot odds */}
                    <div className="text-center mt-2 flex items-center justify-center gap-3">
                      <span className="text-lg font-bold text-[#c9a227] tabular-nums drop-shadow-[0_0_8px_rgba(201,162,39,0.5)]">
                        {raiseAmount.toLocaleString()}
                      </span>
                      {pot > 0 && (
                        <span className="text-[10px] text-[#666] font-medium">
                          ({Math.round((raiseAmount / (pot + raiseAmount)) * 100)}% 팟)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Main action buttons row */}
                <div className="flex gap-2 items-stretch">
                  {/* Only show fold when there's a bet to face (PokerStars style) */}
                  {!canCheck && (
                    <button
                      onClick={() => handleAction('fold')}
                      disabled={actionPending}
                      className={cn(
                        'w-16 md:w-20 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.95]',
                        'bg-[#1a1a1a] border border-[#333] text-red-400/80',
                        'hover:bg-[#222] hover:text-red-400 hover:border-red-500/30',
                        actionPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      폴드
                    </button>
                  )}

                  {/* Check/Call - large, prominent */}
                  <button
                    onClick={() =>
                      canCheck
                        ? handleAction('check')
                        : handleAction('call', callAmount)
                    }
                    disabled={actionPending}
                    className={cn(
                      'flex-[2] py-3 md:py-3.5 rounded-xl font-bold text-base md:text-lg transition-all active:scale-[0.97]',
                      'bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white',
                      'shadow-[0_4px_16px_rgba(34,197,94,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]',
                      'hover:from-[#2dd36f] hover:to-[#1cb850]',
                      actionPending && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {canCheck ? '체크' : (
                      <span className="flex flex-col items-center leading-tight">
                        <span>콜 {callAmount.toLocaleString()}</span>
                        {gameState.pot > 0 && (
                          <span className="text-[9px] opacity-70">
                            ({Math.round(callAmount / (gameState.pot + callAmount) * 100)}%)
                          </span>
                        )}
                      </span>
                    )}
                  </button>

                  {/* Raise/Bet - toggles slider or confirms */}
                  {maxRaiseTotal > 0 && (
                    <button
                      onClick={() => {
                        if (showRaiseSlider) {
                          const action: PlayerAction = gameState.currentBet > 0 ? 'raise' : 'bet';
                          if (raiseAmount >= maxRaiseTotal) {
                            handleAction('all_in', maxRaiseTotal);
                          } else {
                            handleAction(action, raiseAmount);
                          }
                        } else {
                          setShowRaiseSlider(true);
                        }
                      }}
                      disabled={actionPending}
                      className={cn(
                        'flex-[1.5] py-3 md:py-3.5 rounded-xl font-bold text-sm md:text-base transition-all active:scale-[0.97]',
                        showRaiseSlider
                          ? raiseAmount >= maxRaiseTotal
                            ? 'bg-gradient-to-b from-[#ef4444] to-[#dc2626] text-white shadow-[0_4px_16px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]'
                            : 'bg-gradient-to-b from-[#d4af37] to-[#b89320] text-black shadow-[0_4px_16px_rgba(201,162,39,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : 'bg-gradient-to-b from-[#d4af37] to-[#c9a227] text-black shadow-[0_4px_16px_rgba(201,162,39,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]',
                        'hover:brightness-110',
                        actionPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {showRaiseSlider
                        ? raiseAmount >= maxRaiseTotal
                          ? '올인'
                          : `${gameState.currentBet > 0 ? '레이즈' : '벳'} ${raiseAmount.toLocaleString()}`
                        : gameState.currentBet > 0
                          ? `레이즈 ${minRaiseTotal.toLocaleString()}`
                          : `벳 ${gameState.bigBlind.toLocaleString()}`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Pre-Action Buttons (when NOT hero's turn but in hand) ── */}
            {!isHeroTurn && isPlaying && !heroSeat.isFolded && (
              <div className="px-3 py-2">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setPreAction(preAction === 'fold' ? null : 'fold')}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-medium border transition-all',
                      preAction === 'fold'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                        : 'bg-[#1a1a1a] border-[#333] text-[#666] hover:text-[#888] hover:border-[#444]'
                    )}
                  >
                    폴드
                  </button>
                  <button
                    onClick={() => setPreAction(preAction === 'check_fold' ? null : 'check_fold')}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-medium border transition-all',
                      preAction === 'check_fold'
                        ? 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                        : 'bg-[#1a1a1a] border-[#333] text-[#666] hover:text-[#888] hover:border-[#444]'
                    )}
                  >
                    체크/폴드
                  </button>
                  <button
                    onClick={() => setPreAction(preAction === 'call' ? null : 'call')}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-medium border transition-all',
                      preAction === 'call'
                        ? 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                        : 'bg-[#1a1a1a] border-[#333] text-[#666] hover:text-[#888] hover:border-[#444]'
                    )}
                  >
                    콜
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Spectator mode */
          <div className="px-4 py-4 text-center">
            <p className="text-xs md:text-sm text-[#555]">
              {userId
                ? '빈 좌석을 터치하여 참가'
                : '관전 중 -- 로그인하여 플레이'}
            </p>
          </div>
        )}
      </div>

      {/* ── Buy-in Modal ── */}
      {buyInModal !== null && (
        <BuyInModal
          seatNumber={buyInModal}
          minBuyIn={minBuyIn}
          maxBuyIn={maxBuyIn}
          onConfirm={handleBuyInConfirm}
          onCancel={() => setBuyInModal(null)}
        />
      )}

      {/* ── Hand History Bottom Sheet ── */}
      <HandHistorySheet
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        actionLog={actionLog}
      />
    </div>
  );
}
