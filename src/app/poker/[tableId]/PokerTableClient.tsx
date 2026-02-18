'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CardRenderer, parseCard } from '@/components/poker/CardRenderer';
import type { GameState, SeatState, Card, PlayerAction } from '@/lib/poker/types';
import { joinTable, leaveTable, performAction } from '../actions';
import { LogOut, MessageSquare, ChevronDown, Volume2, VolumeX, ArrowLeft, Users, Minus, Plus, Check } from 'lucide-react';
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

// Positions: [top%, left%] — PokerNow style, seats on table edge
// Seat 0 is bottom-center (hero default), going clockwise
const SEAT_POSITIONS_2: [number, number][] = [
  [88, 50],  // Seat 0 - bottom center (hero)
  [8, 50],   // Seat 1 - top center (opponent)
];

const SEAT_POSITIONS_6: [number, number][] = [
  [92, 50],  // Seat 0 - bottom center (hero)
  [60, 10],  // Seat 1 - lower left
  [16, 14],  // Seat 2 - upper left
  [4, 50],   // Seat 3 - top center
  [16, 86],  // Seat 4 - upper right
  [60, 90],  // Seat 5 - lower right
];

// Mathematically balanced: 9 seats evenly spaced (40° apart) around an ellipse
// center=(50,50), radiusY=42, radiusX=38
const SEAT_POSITIONS_9: [number, number][] = [
  [92, 50],  // Seat 0 - bottom center (hero)
  [82, 26],  // Seat 1 - bottom left
  [57, 13],  // Seat 2 - left
  [29, 17],  // Seat 3 - upper left
  [11, 37],  // Seat 4 - top left
  [11, 63],  // Seat 5 - top right
  [29, 83],  // Seat 6 - upper right
  [57, 87],  // Seat 7 - right
  [82, 74],  // Seat 8 - bottom right
];

// Bet chip positions (offset from seat toward center of table)
const BET_POSITIONS_2: [number, number][] = [
  [65, 50],
  [30, 50],
];

const BET_POSITIONS_6: [number, number][] = [
  [75, 50],  // from seat 0
  [55, 22],  // from seat 1
  [28, 24],  // from seat 2
  [18, 50],  // from seat 3
  [28, 76],  // from seat 4
  [55, 78],  // from seat 5
];

// Bet chips: ~60% of the way from seat to center (50,50)
const BET_POSITIONS_9: [number, number][] = [
  [75, 50],  // Seat 0
  [69, 34],  // Seat 1
  [54, 27],  // Seat 2
  [37, 29],  // Seat 3
  [26, 41],  // Seat 4
  [26, 59],  // Seat 5
  [37, 71],  // Seat 6
  [54, 73],  // Seat 7
  [69, 66],  // Seat 8
];

// ─── Helper Components ────────────────────────────────────────────

function CardBack({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' | 'xs' }) {
  const sizeClasses =
    size === 'xs' ? 'w-4 h-5' :
    size === 'sm' ? 'w-7 h-10' :
    size === 'md' ? 'w-12 h-[66px]' :
    'w-[60px] h-[84px]';
  return (
    <div
      className={cn(sizeClasses, 'rounded-[2px]')}
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #1a2f4f 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    />
  );
}

function DealerButton() {
  return (
    <div
      className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center z-10 bg-white"
    >
      <span className="text-[8px] font-bold text-black">D</span>
    </div>
  );
}

function ChipAmount({ amount, animate }: { amount: number; animate?: boolean }) {
  if (amount <= 0) return null;
  return (
    <div
      className={cn(
        'px-2 py-0.5 rounded-full',
        animate && 'animate-chip-to-pot'
      )}
      style={{
        background: 'rgba(0,0,0,0.7)',
      }}
    >
      <span className="text-[9px] md:text-[11px] font-bold text-white tabular-nums">
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200]" onClick={onCancel}>
      <div
        className="bg-ph-elevated border border-white/10 rounded-xl p-5 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-4">좌석 {seatNumber + 1} 착석</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">
              바이인: <span className="text-white font-bold">{buyIn.toLocaleString()}P</span>
            </label>
            <input
              type="range"
              min={minBuyIn}
              max={maxBuyIn}
              step={Math.max(1, Math.floor(minBuyIn / 10))}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              className="w-full accent-[#4a8c5c]"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
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
                    ? 'bg-ph-enter text-white'
                    : 'bg-white/8 text-white/50 hover:bg-white/12'
                )}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-ph-elevated hover:bg-ph-border text-white font-semibold py-3 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => onConfirm(buyIn)}
              className="flex-1 bg-ph-enter hover:bg-ph-enter-hover text-white font-semibold py-3 rounded-lg transition-colors"
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
  isHandActive,
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
  isHandActive?: boolean;
}) {
  // Empty seat -- PokerNow: dashed rectangle, transparent bg, seat number only
  if (!seat) {
    return (
      <button
        onClick={() => onSitDown(seatIndex)}
        className="group relative flex flex-col items-center cursor-pointer"
      >
        <div
          className="w-[72px] h-[52px] md:w-[84px] md:h-[60px] rounded-lg flex items-center justify-center relative transition-all duration-200 active:scale-[0.95]"
          style={{
            border: '2px dashed rgba(255,255,255,0.15)',
          }}
        >
          <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(74,140,92,0.2)' }} />
          <span className="text-lg text-white/20 group-hover:text-white/40 transition-colors duration-200 relative z-10 font-light">
            {seatIndex + 1}
          </span>
        </div>
      </button>
    );
  }

  const hasCards = seat.holeCards && seat.holeCards.length > 0;

  // Hero seat on table -- show cards + name + chips (like opponents but highlighted)
  if (isHero) {
    return (
      <div className={cn('flex flex-col items-center relative', seat.isFolded && 'opacity-40')}>
        {isDealer && (
          <div className="absolute -top-1 -right-1 z-30">
            <DealerButton />
          </div>
        )}
        {lastAction && !seat.isFolded && (
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded whitespace-nowrap z-20 animate-action-badge"
            style={{
              background: 'rgba(0,0,0,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <span className="text-[9px] md:text-[10px] font-bold text-white">{lastAction}</span>
          </div>
        )}
        {/* Hero cards on table — bigger than opponents */}
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
        {/* Name + chips */}
        <div
          className={cn(
            'rounded-lg px-2 py-1 text-center min-w-[72px] md:min-w-[84px] relative transition-all duration-200',
            isCurrent && !seat.isFolded && 'ring-2 ring-ph-success/60',
          )}
          style={{
            background: 'rgba(74,140,92,0.25)',
            border: '1px solid rgba(74,140,92,0.45)',
          }}
        >
          {isCurrent && !seat.isFolded && (
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg overflow-hidden bg-white/10">
              <div
                className="h-full transition-all duration-1000 linear"
                style={{
                  width: `${Math.max(0, Math.min(100, (timeLeft / 30) * 100))}%`,
                  background: timeLeft > 10 ? 'var(--ph-success)' : timeLeft > 5 ? 'var(--ph-warning)' : 'var(--ph-error)',
                }}
              />
            </div>
          )}
          <div className="text-[10px] text-white/80 font-medium truncate max-w-[72px]" title={seat.nickname}>{seat.nickname}</div>
          <div className="text-[12px] text-white font-bold tabular-nums">{seat.chipStack.toLocaleString()}</div>
        </div>
        {seat.isFolded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white/40 uppercase">FOLD</span>
          </div>
        )}
      </div>
    );
  }

  // Opponent seat -- PokerNow: compact dark rectangle with name + chips
  return (
    <div className={cn('flex flex-col items-center relative', seat.isFolded && 'opacity-40')}>
      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-1 -right-1 z-30">
          <DealerButton />
        </div>
      )}

      {/* Last action badge */}
      {lastAction && !seat.isFolded && (
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded whitespace-nowrap z-20 animate-action-badge"
          style={{
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <span className="text-[9px] md:text-[10px] font-bold text-white">{lastAction}</span>
        </div>
      )}

      {/* Seat card */}
      <div
        className={cn(
          'rounded-lg px-2 py-1.5 md:px-2.5 md:py-2 text-center min-w-[72px] md:min-w-[84px] relative transition-all duration-200',
          isCurrent && !seat.isFolded && 'ring-2 ring-white/40',
          seat.isAllIn && !seat.isFolded && 'ring-2 ring-ph-error/60',
        )}
        style={{
          background: 'rgba(0,0,0,0.50)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        {/* Timer bar */}
        {isCurrent && !seat.isFolded && (
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg overflow-hidden bg-white/10">
            <div
              className="h-full transition-all duration-1000 linear"
              style={{
                width: `${Math.max(0, Math.min(100, (timeLeft / 30) * 100))}%`,
                background: timeLeft > 10 ? 'var(--ph-success)' : timeLeft > 5 ? 'var(--ph-warning)' : 'var(--ph-error)',
              }}
            />
          </div>
        )}

        {/* Nickname */}
        <div className="text-[10px] md:text-[11px] text-white/70 font-medium truncate max-w-[72px] md:max-w-[76px] leading-tight" title={seat.nickname}>
          {seat.nickname}
        </div>

        {/* Chip stack */}
        <div className="text-[12px] md:text-[13px] font-bold text-white tabular-nums leading-tight">
          {seat.chipStack.toLocaleString()}
        </div>

        {/* All-in badge */}
        {seat.isAllIn && !seat.isFolded && (
          <div className="text-[8px] font-bold text-ph-error uppercase tracking-wider">
            ALL IN
          </div>
        )}

        {/* Fold overlay */}
        {seat.isFolded && (
          <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wide">FOLD</span>
          </div>
        )}
      </div>

      {/* Opponent cards -- only during showdown or when dealt (card backs) */}
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

      {/* Card backs -- only when hand is active and player is in hand (not folded) */}
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

const MemoizedSeatDisplay = React.memo(SeatDisplay);

// ─── Win Overlay ──────────────────────────────────────────────────

function WinOverlay({ winnerName, amount }: { winnerName: string; amount: number }) {
  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div
        className="animate-pot-win px-6 py-3 rounded-xl text-center"
        style={{ background: 'rgba(0,0,0,0.75)' }}
      >
        <p className="text-lg md:text-xl font-bold text-white">
          {winnerName}
        </p>
        <p className="text-sm md:text-base font-bold text-ph-enter">
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
          'absolute bottom-0 left-0 right-0 bg-ph-elevated rounded-t-2xl transition-transform duration-300 max-h-[60vh] flex flex-col',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/15 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 pb-2 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white/80">핸드 히스토리</h3>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors p-1"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
          {actionLog.length === 0 ? (
            <p className="text-xs text-white/25 text-center mt-8">아직 액션이 없습니다</p>
          ) : (
            actionLog.map((entry) => (
              <div key={entry.id} className="text-[11px] text-white/50 py-1 border-b border-white/5">
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
  const [betInputEditing, setBetInputEditing] = useState(false);
  const [betInputText, setBetInputText] = useState('');
  const [preAction, setPreAction] = useState<'fold' | 'check_fold' | 'call' | null>(null);
  const [potBounce, setPotBounce] = useState(false);
  const [winOverlay, setWinOverlay] = useState<{ name: string; amount: number } | null>(null);
  const [newCardsDealt, setNewCardsDealt] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
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
    if (turnTimeLeft <= 3 && turnTimeLeft > 0 && turnTimeLeft !== prevTimeLeftRef.current) {
      sounds.timerUrgent();
    } else if (turnTimeLeft <= 5 && turnTimeLeft > 3 && turnTimeLeft !== prevTimeLeftRef.current) {
      sounds.timerWarning();
    }
    prevTimeLeftRef.current = turnTimeLeft;
  }, [turnTimeLeft, isHeroTurn, sounds]);

  // ─── SSE Connection ───────────────────────────────────────────

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectDelay = 1000;
    const MAX_RECONNECT_DELAY = 10000;

    function connect() {
      eventSource = new EventSource(`/api/poker/${tableId}`);

      eventSource.onopen = () => {
        reconnectDelay = 1000;
      };

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
              prevCCLengthForAnimRef.current = 0;
              newCardStartIndex.current = 0;
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
            setTurnTimeLeft(reconstructed.turnTimeLeft);

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
            setTurnTimeLeft(data.turnTimeLeft);
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
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
          connect();
        }, reconnectDelay);
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

  // Prevent duplicate pre-action in same hand+street
  const lastPreActionRef = useRef<{ handId: string | null; street: string | null }>({ handId: null, street: null });

  // Auto-execute pre-action when it becomes hero's turn
  useEffect(() => {
    if (isHeroTurn && preAction && !actionPending) {
      // Prevent duplicate pre-action in same hand+street
      const currentHandId = gameState?.handId ?? null;
      const currentStreet = gameState?.street ?? null;
      if (lastPreActionRef.current.handId === currentHandId &&
          lastPreActionRef.current.street === currentStreet) {
        setPreAction(null);
        return;
      }
      lastPreActionRef.current = { handId: currentHandId, street: currentStreet };

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
  }, [isHeroTurn, preAction, actionPending, canCheck, callAmount, handleAction, gameState?.handId, gameState?.street]);

  // ─── Bet Sizing Presets ───────────────────────────────────────

  const pot = gameState.pot;
  const bigBlind = gameState.bigBlind;
  const BET_PRESETS = [
    { label: '1/3', getValue: (p: number) => Math.floor(p / 3) },
    { label: '1/2', getValue: (p: number) => Math.floor(p / 2) },
    { label: '2/3', getValue: (p: number) => Math.floor(p * 2 / 3) },
    { label: 'Pot', getValue: (p: number) => p },
    { label: 'All-in', getValue: (_p: number, stack: number) => stack },
  ];
  const betPresets = BET_PRESETS.map((preset) => {
    const raw = preset.getValue(pot, maxRaiseTotal);
    const clamped = Math.min(Math.max(raw, minRaiseTotal), maxRaiseTotal);
    const disabled = clamped < bigBlind && preset.label !== 'All-in';
    return { label: preset.label, value: clamped, disabled };
  });

  // ─── Community Cards ────────────────────────────────────────

  const communityCardSlots = 5;
  const communityCards = gameState.communityCards;

  // Track which cards are newly dealt for sequential animation
  const prevCCLengthForAnimRef = useRef(0);
  const newCardStartIndex = useRef(0);
  useEffect(() => {
    const prev = prevCCLengthForAnimRef.current;
    const curr = communityCards.length;
    if (curr > prev) {
      newCardStartIndex.current = prev;
    }
    prevCCLengthForAnimRef.current = curr;
  }, [communityCards.length]);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="h-[100dvh] w-[100dvw] bg-ph-elevated flex flex-col overflow-hidden select-none">

      {/* ═══════════════════════════════════════════════════════════
          TOP BAR - PokerNow style, compact
          ═══════════════════════════════════════════════════════════ */}
      <header
        className="flex-shrink-0 h-9 flex items-center justify-between px-2 z-30"
        style={{
          background: 'var(--ph-elevated)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Left: back + table info */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/poker"
            className="flex items-center justify-center w-7 h-7 rounded active:scale-[0.92] transition-transform"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[11px] font-semibold text-white/80 truncate max-w-[100px] leading-none">
              {gameState.tableName}
            </h1>
            <span className="text-[10px] text-white/40 leading-none">
              NLH {gameState.smallBlind}/{gameState.bigBlind}
            </span>
            <span className="text-[9px] text-white/25 leading-none flex items-center gap-0.5">
              <Users className="w-3 h-3" />
              {seats.filter((s) => s !== null).length}/{maxSeats}
            </span>
          </div>
        </div>

        {/* Right: controls — PokerNow style compact icons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowHistory(true)}
            className="w-7 h-7 flex items-center justify-center rounded active:scale-[0.92] transition-transform text-white/35 hover:text-white/60"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-7 h-7 flex items-center justify-center rounded active:scale-[0.92] transition-transform text-white/35 hover:text-white/60"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {isSeated && (
            <button
              onClick={handleLeave}
              disabled={isLeaving}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold transition-all active:scale-[0.92]',
                'text-ph-error/60 hover:text-ph-error',
                isLeaving && 'opacity-40 cursor-not-allowed'
              )}
            >
              <LogOut className="w-3 h-3" />
              나가기
            </button>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          TABLE AREA - Fixed height, no overflow, centered
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Win overlay */}
        {winOverlay && (
          <WinOverlay winnerName={winOverlay.name} amount={winOverlay.amount} />
        )}

        {/* Table container — fills entire available space, minimal padding */}
        <div className="absolute inset-0 md:inset-1 lg:inset-2">
          {/* Green felt -- PokerNow: radial gradient, brighter center */}
          <div
            className="absolute inset-0 rounded-[20px] md:rounded-[50%/42%]"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, #4a8c5c 0%, #3d7a4e 55%, #2d5a3a 100%)',
              border: '3px solid #2a5a3a',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.12)',
            }}
          >

          {/* ── Pot pill -- PokerNow: green pill, compact ── */}
          <div className="absolute top-[26%] md:top-[22%] left-1/2 -translate-x-1/2 z-10">
            {gameState.pot > 0 ? (
              <div
                className={cn(
                  'px-3 py-0.5 rounded-full',
                  potBounce && 'animate-pot-bounce'
                )}
                style={{ background: 'rgba(34,80,50,0.85)', border: '1px solid rgba(74,140,92,0.4)' }}
              >
                <span className="text-[11px] md:text-[13px] font-bold text-white tabular-nums">
                  {gameState.pot.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="px-3 py-0.5 rounded-full" style={{ background: 'rgba(34,80,50,0.5)' }}>
                <span className="text-[11px] md:text-[13px] font-bold text-white/30 tabular-nums">0</span>
              </div>
            )}
          </div>

          {/* ── Community Cards ── */}
          <div className="absolute top-[40%] md:top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10">
            <div className="flex gap-1.5 md:gap-2">
              {Array.from({ length: communityCardSlots }).map((_, i) => {
                const card = communityCards[i];
                if (!card) {
                  return (
                    <div
                      key={i}
                      className="w-10 h-[56px] md:w-12 md:h-[66px] rounded-[3px]"
                      style={{
                        background: 'rgba(0,0,0,0.12)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    />
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
                    <CardRenderer rank={parsed.rank} suit={parsed.suit} size="md" className="md:hidden" />
                    <CardRenderer rank={parsed.rank} suit={parsed.suit} size="lg" className="hidden md:flex" />
                  </div>
                );
              })}
            </div>

            {/* Side pots */}
            {gameState.sidePots.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-center">
                {gameState.sidePots.map((sp, i) => (
                  <div
                    key={i}
                    className="px-2 py-0.5 rounded-full text-[8px] text-white/50"
                    style={{ background: 'rgba(0,0,0,0.4)' }}
                  >
                    사이드 {sp.amount.toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Status overlay (waiting) -- PokerNow style ── */}
          {gameState.status === 'waiting' && (
            <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                {[0, 0.25, 0.5].map((delay, k) => (
                  <div
                    key={k}
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-medium text-white/60">Waiting for others...</p>
              <div className="text-[10px] text-white/30 text-center leading-relaxed">
                <p>NLH ~ {gameState.smallBlind}/{gameState.bigBlind}</p>
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
                <MemoizedSeatDisplay
                  seat={seat}
                  seatIndex={i}
                  isHero={i === heroSeatIndex}
                  isDealer={gameState.dealerSeat === i && isPlaying}
                  isCurrent={gameState.currentSeat === i}
                  timeLeft={gameState.currentSeat === i ? turnTimeLeft : 0}
                  showCards={isShowdown}
                  onSitDown={handleSitDown}
                  lastAction={lastActions[i]}
                  hasNewCards={newCardsDealt}
                  isHandActive={isPlaying}
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
          </div>{/* close felt */}
        </div>{/* close table container */}
      </div>{/* close flex-1 area */}

      {/* ═══════════════════════════════════════════════════════════
          HERO ZONE — PokerNow style, compact single-strip
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="flex-shrink-0"
        style={{
          background: 'var(--ph-surface)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {isSeated && heroSeat ? (
          <div>
            {/* ── Hero card -- PokerNow style: avatar/cards + info card ── */}
            <div className="px-3 pt-2 pb-1.5 flex items-center gap-3">
              {/* Status + chip stack (cards are on the table now) */}
              <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
                {/* Status line */}
                <div className="text-[10px] leading-tight">
                  {isHeroTurn && !heroSeat.isFolded ? (
                    <span
                      className={cn(
                        'font-bold tabular-nums',
                        turnTimeLeft > 10
                          ? 'text-ph-success'
                          : turnTimeLeft > 5
                            ? 'text-ph-warning'
                            : 'text-ph-error animate-pulse'
                      )}
                    >
                      내 차례 {turnTimeLeft}초
                    </span>
                  ) : heroSeat.isFolded ? (
                    <span className="text-ph-error/60 font-semibold uppercase tracking-wide">FOLD</span>
                  ) : isPlaying && !heroSeat.isFolded ? (
                    <span className="text-white/30 truncate">
                      {gameState.currentSeat !== null
                        ? `${seats[gameState.currentSeat]?.nickname ?? '...'}님 차례`
                        : '대기 중'}
                    </span>
                  ) : (
                    <span className="text-white/25">
                      {gameState.status === 'waiting' ? 'WAITING' : '다음 핸드 준비 중'}
                    </span>
                  )}
                </div>

                {/* Nickname + chips */}
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] text-white/50 font-medium truncate max-w-[80px]">
                    {heroSeat.nickname}
                  </span>
                  <span className="text-[14px] md:text-[16px] font-bold text-white tabular-nums leading-none">
                    {heroSeat.chipStack.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Leave button -- compact, right side */}
              {(heroSeat.isFolded || !isPlaying) && (
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all active:scale-[0.92] flex-shrink-0',
                    'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/8',
                    isLeaving && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <LogOut className="w-3 h-3" />
                  {isLeaving ? '...' : '나가기'}
                </button>
              )}
            </div>

            {/* ── Action Bar — PokerNow style ── */}
            {isHeroTurn && !heroSeat.isFolded && (
              <div className="px-2 pb-2 pt-0.5">
                {/* Raise / Bet sizing panel — PokerNow flat */}
                {showRaiseSlider && (
                  <div
                    className="mb-2 rounded-xl p-3"
                    style={{ background: 'var(--ph-elevated)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {/* Preset chips */}
                    <div className="flex gap-1.5 mb-2.5 overflow-x-auto scrollbar-hide">
                      {betPresets.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => !p.disabled && setRaiseAmount(p.value)}
                          disabled={p.disabled}
                          className={cn(
                            'flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-[0.92]',
                            p.disabled
                              ? 'bg-white/4 text-white/20 cursor-not-allowed'
                              : raiseAmount === p.value
                                ? 'bg-white text-black'
                                : 'bg-white/8 text-white/50 hover:bg-white/12'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Slider row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRaiseAmount(Math.max(minRaiseTotal, raiseAmount - bigBlind))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/8 text-white/50 active:scale-[0.88]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="range"
                        min={minRaiseTotal}
                        max={maxRaiseTotal}
                        step={Math.max(1, bigBlind)}
                        value={raiseAmount}
                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="flex-1 poker-slider touch-none"
                      />
                      <button
                        onClick={() => setRaiseAmount(Math.min(maxRaiseTotal, raiseAmount + bigBlind))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/8 text-white/50 active:scale-[0.88]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Amount display — tap to edit directly */}
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {betInputEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            autoFocus
                            value={betInputText}
                            onChange={(e) => setBetInputText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const parsed = parseInt(betInputText, 10);
                                if (!isNaN(parsed)) {
                                  setRaiseAmount(Math.min(maxRaiseTotal, Math.max(minRaiseTotal, parsed)));
                                }
                                setBetInputEditing(false);
                              } else if (e.key === 'Escape') {
                                setBetInputEditing(false);
                              }
                            }}
                            className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-center text-base font-bold text-white tabular-nums outline-none focus:border-ph-enter"
                          />
                          <button
                            onClick={() => {
                              const parsed = parseInt(betInputText, 10);
                              if (!isNaN(parsed)) {
                                setRaiseAmount(Math.min(maxRaiseTotal, Math.max(minRaiseTotal, parsed)));
                              }
                              setBetInputEditing(false);
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-ph-enter text-white active:scale-[0.88]"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setBetInputText(String(raiseAmount));
                            setBetInputEditing(true);
                          }}
                          className="flex items-baseline gap-2 active:opacity-70 transition-opacity"
                        >
                          <span className="text-lg font-bold text-white tabular-nums underline decoration-white/20 underline-offset-2">
                            {raiseAmount.toLocaleString()}
                          </span>
                          {pot > 0 && (
                            <span className="text-[10px] text-white/30 font-medium">
                              ({Math.round((raiseAmount / (pot + raiseAmount)) * 100)}% pot)
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Main 3-button row — PokerNow flat buttons */}
                <div className="flex gap-2 items-stretch">
                  {/* FOLD */}
                  {!canCheck && (
                    <button
                      onClick={() => handleAction('fold')}
                      disabled={actionPending}
                      className={cn(
                        'flex-1 min-h-[48px] rounded-lg font-bold text-[13px] transition-all active:scale-[0.96] bg-ph-text-secondary text-white',
                        actionPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      폴드
                    </button>
                  )}

                  {/* CHECK / CALL */}
                  <button
                    onClick={() => canCheck ? handleAction('check') : handleAction('call', callAmount)}
                    disabled={actionPending}
                    className={cn(
                      'flex-1 min-h-[48px] rounded-lg font-bold transition-all active:scale-[0.96]',
                      canCheck ? 'bg-ph-enter text-white' : 'bg-ph-felt text-white',
                      actionPending && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {canCheck ? (
                      <span className="text-[13px]">체크</span>
                    ) : (
                      <span className="flex flex-col items-center leading-tight">
                        <span className="text-[13px]">콜</span>
                        <span className="text-[11px] opacity-80 font-semibold tabular-nums">{callAmount.toLocaleString()}</span>
                      </span>
                    )}
                  </button>

                  {/* RAISE / BET / ALL-IN */}
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
                        'flex-1 min-h-[48px] rounded-lg font-bold transition-all active:scale-[0.96]',
                        showRaiseSlider && raiseAmount >= maxRaiseTotal
                          ? 'bg-ph-error text-white animate-all-in-pulse'
                          : 'bg-ph-warning text-white',
                        actionPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {showRaiseSlider ? (
                        raiseAmount >= maxRaiseTotal ? (
                          <span className="text-[13px]">올인</span>
                        ) : (
                          <span className="flex flex-col items-center leading-tight">
                            <span className="text-[12px]">{gameState.currentBet > 0 ? '레이즈' : '벳'}</span>
                            <span className="text-[11px] opacity-85 font-semibold tabular-nums">{raiseAmount.toLocaleString()}</span>
                          </span>
                        )
                      ) : (
                        <span className="flex flex-col items-center leading-tight">
                          <span className="text-[12px]">{gameState.currentBet > 0 ? '레이즈' : '벳'}</span>
                          <span className="text-[11px] opacity-75 font-semibold tabular-nums">{minRaiseTotal.toLocaleString()}</span>
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Pre-action buttons (not hero's turn) ── */}
            {!isHeroTurn && isPlaying && !heroSeat.isFolded && (
              <div className="px-3 py-2">
                <div className="flex gap-2">
                  {[
                    { key: 'fold' as const, label: '폴드', activeClass: 'bg-ph-text-secondary text-white' },
                    { key: 'check_fold' as const, label: '체크/폴드', activeClass: 'bg-ph-enter-hover text-white' },
                    { key: 'call' as const, label: '콜', activeClass: 'bg-ph-enter-hover text-white' },
                  ].map(({ key, label, activeClass }) => (
                    <button
                      key={key}
                      onClick={() => setPreAction(preAction === key ? null : key)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.93]',
                        preAction === key ? activeClass : 'bg-white/5 text-white/30'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Spectator -- PokerNow: CHAT LOG | JOIN button | info */
          <div className="px-3 py-2.5 flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white/40 bg-white/5 hover:bg-white/8 transition-colors active:scale-[0.95]"
            >
              CHAT LOG
            </button>
            <div className="flex-1 text-center">
              <p className="text-[11px] text-white/30">
                {userId ? '빈 좌석을 터치하여 참가' : '관전 중'}
              </p>
            </div>
            {!userId && (
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold bg-ph-enter text-white hover:bg-ph-enter-hover transition-colors active:scale-[0.95]"
              >
                로그인
              </Link>
            )}
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
