'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SkipBack, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReplayerPlayer {
  position: string;
  stackSize: number;
  cards?: string;
  isHero: boolean;
}

export interface ReplayerAction {
  street: string;
  sequence: number;
  position: string;
  action: string;
  amount?: number;
}

export interface HandReplayerProps {
  players: ReplayerPlayer[];
  actions: ReplayerAction[];
  boardFlop?: string;
  boardTurn?: string;
  boardRiver?: string;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  fold: '폴드',
  check: '체크',
  call: '콜',
  bet: '벳',
  raise: '레이즈',
  'all-in': '올인',
  all_in: '올인',
};

const ACTION_COLORS: Record<string, string> = {
  fold: 'text-op-text-muted',
  check: 'text-op-success',
  call: 'text-op-info',
  bet: 'text-op-warning',
  raise: 'text-op-warning',
  'all-in': 'text-op-error',
  all_in: 'text-op-error',
};

const POSITION_COLORS: Record<string, string> = {
  BTN: 'bg-amber-500',
  SB: 'bg-blue-500',
  BB: 'bg-emerald-600',
  UTG: 'bg-purple-600',
  'UTG+1': 'bg-indigo-500',
  'UTG+2': 'bg-violet-500',
  MP: 'bg-pink-500',
  HJ: 'bg-teal-500',
  CO: 'bg-cyan-500',
};

// ─── Position Layout on Oval Table ────────────────────────────────────────────
// Returns [top%, left%] for up to 9 players arranged around an oval.
// Center is (50, 50). Players go clockwise from bottom.

function getTablePositions(count: number): [number, number][] {
  const layouts: Record<number, [number, number][]> = {
    2: [[90, 50], [10, 50]],
    3: [[90, 50], [14, 26], [14, 74]],
    4: [[90, 50], [50, 5], [10, 50], [50, 95]],
    5: [[90, 50], [68, 8], [18, 20], [18, 80], [68, 92]],
    6: [[90, 50], [72, 12], [22, 18], [8, 50], [22, 82], [72, 88]],
    7: [[90, 50], [76, 16], [46, 5], [14, 26], [14, 74], [46, 95], [76, 84]],
    8: [[90, 50], [76, 20], [50, 6], [20, 18], [8, 50], [20, 82], [50, 94], [76, 80]],
    9: [[90, 50], [80, 24], [57, 10], [30, 14], [10, 35], [10, 65], [30, 86], [57, 90], [80, 76]],
  };
  return layouts[Math.min(count, 9)] ?? layouts[6]!;
}

// ─── Card renderer (inline mini) ──────────────────────────────────────────────

function MiniCard({ card }: { card: string }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const isRed = suit === 'h' || suit === 'd';
  const suitSymbol = { h: '♥', d: '♦', c: '♣', s: '♠' }[suit] ?? suit;
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-8 bg-white rounded text-[9px] font-bold leading-none border border-gray-200 select-none"
      style={{ color: isRed ? '#ef4444' : '#111' }}
    >
      {rank}{suitSymbol}
    </span>
  );
}

// ─── Build replay steps ────────────────────────────────────────────────────────

interface ReplayStep {
  stepIndex: number;
  activePosition: string | null;
  action: ReplayerAction | null;
  street: string;
  potSize: number;
  revealedFlop: boolean;
  revealedTurn: boolean;
  revealedRiver: boolean;
  foldedPositions: Set<string>;
  description: string;
}

function buildSteps(
  actions: ReplayerAction[],
  boardFlop?: string,
  boardTurn?: string,
  boardRiver?: string,
): ReplayStep[] {
  const steps: ReplayStep[] = [];
  let pot = 0;
  let revealedFlop = false;
  let revealedTurn = false;
  let revealedRiver = false;
  let currentStreet = 'preflop';
  const foldedPositions = new Set<string>();

  // Initial state
  steps.push({
    stepIndex: 0,
    activePosition: null,
    action: null,
    street: 'preflop',
    potSize: 0,
    revealedFlop: false,
    revealedTurn: false,
    revealedRiver: false,
    foldedPositions: new Set(),
    description: 'Preflop 시작',
  });

  for (const action of actions) {
    // Detect street transition
    if (action.street !== currentStreet) {
      currentStreet = action.street;
      if (currentStreet === 'flop' && boardFlop) revealedFlop = true;
      if (currentStreet === 'turn' && boardTurn) revealedTurn = true;
      if (currentStreet === 'river' && boardRiver) revealedRiver = true;
    }

    if (action.action === 'fold') {
      foldedPositions.add(action.position);
    }

    const amountStr = action.amount ? ` ${action.amount.toLocaleString()}` : '';
    const label = ACTION_LABELS[action.action] ?? action.action;
    const streetLabel: Record<string, string> = {
      preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River',
    };

    // Add to pot
    if (['call', 'bet', 'raise', 'all_in', 'all-in'].includes(action.action) && action.amount) {
      pot += action.amount;
    }

    steps.push({
      stepIndex: steps.length,
      activePosition: action.position,
      action,
      street: action.street,
      potSize: pot,
      revealedFlop,
      revealedTurn,
      revealedRiver,
      foldedPositions: new Set(foldedPositions),
      description: `[${streetLabel[action.street] ?? action.street}] ${action.position}: ${label}${amountStr}`,
    });
  }

  return steps;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function HandReplayer({
  players,
  actions,
  boardFlop,
  boardTurn,
  boardRiver,
  className,
}: HandReplayerProps) {
  const steps = buildSteps(actions, boardFlop, boardTurn, boardRiver);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = steps[stepIndex] ?? steps[0]!;
  const totalSteps = steps.length;

  const goToStep = useCallback((idx: number) => {
    setStepIndex(Math.max(0, Math.min(idx, totalSteps - 1)));
  }, [totalSteps]);

  const goNext = useCallback(() => {
    setStepIndex(prev => {
      if (prev >= totalSteps - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [totalSteps]);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(goNext, 1200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, goNext]);

  // Stop at end
  useEffect(() => {
    if (stepIndex >= totalSteps - 1) {
      setIsPlaying(false);
    }
  }, [stepIndex, totalSteps]);

  // Community cards to show
  const flopCards = currentStep.revealedFlop && boardFlop
    ? boardFlop.split(' ')
    : [];
  const turnCard = currentStep.revealedTurn && boardTurn ? boardTurn : null;
  const riverCard = currentStep.revealedRiver && boardRiver ? boardRiver : null;

  // Build position layout
  const positions = getTablePositions(players.length);

  // Map position string → player
  const playerByPosition = new Map<string, ReplayerPlayer>();
  for (const p of players) {
    playerByPosition.set(p.position.toUpperCase(), p);
  }

  // Normalize position from DB enum (btn→BTN, utg1→UTG+1 etc.)
  function normalizePosition(pos: string): string {
    const map: Record<string, string> = {
      btn: 'BTN', sb: 'SB', bb: 'BB',
      utg: 'UTG', utg1: 'UTG+1', utg2: 'UTG+2',
      mp: 'MP', mp1: 'HJ', co: 'CO',
    };
    return map[pos.toLowerCase()] ?? pos.toUpperCase();
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>

      {/* ── Table area ─────────────────────────────────────── */}
      <div className="relative w-full" style={{ paddingBottom: '60%' }}>
        {/* Oval felt */}
        <div
          className="absolute inset-0 rounded-[50%/40%]"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #4a8c5c 0%, #3d7a4e 55%, #2d5a3a 100%)',
            border: '3px solid #2a5a3a',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.12)',
          }}
        >
          {/* Pot */}
          <div className="absolute top-[26%] left-1/2 -translate-x-1/2 z-10">
            <div
              className="px-3 py-0.5 rounded-full"
              style={{ background: 'rgba(34,80,50,0.85)', border: '1px solid rgba(74,140,92,0.4)' }}
            >
              <span className="text-[11px] font-bold text-op-gold tabular-nums">
                팟 {currentStep.potSize.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Community cards */}
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 z-10">
            {/* Flop */}
            {flopCards.length > 0
              ? flopCards.map((c, i) => <MiniCard key={`f${i}`} card={c} />)
              : [0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="inline-flex w-6 h-8 rounded"
                    style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                ))
            }
            {/* Turn */}
            <span className="w-1" />
            {turnCard
              ? <MiniCard card={turnCard} />
              : (
                  <span
                    className="inline-flex w-6 h-8 rounded"
                    style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                )
            }
            {/* River */}
            {riverCard
              ? <MiniCard card={riverCard} />
              : (
                  <span
                    className="inline-flex w-6 h-8 rounded"
                    style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                )
            }
          </div>

          {/* Players around table */}
          {players.map((player, idx) => {
            const pos = positions[idx];
            if (!pos) return null;
            const normalPos = normalizePosition(player.position);
            const isActive = currentStep.activePosition?.toUpperCase() === normalPos ||
              currentStep.activePosition === player.position;
            const isFolded = currentStep.foldedPositions.has(player.position) ||
              currentStep.foldedPositions.has(normalPos);
            const posColor = POSITION_COLORS[normalPos] ?? 'bg-gray-500';

            return (
              <div
                key={player.position}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: `${pos[0]}%`, left: `${pos[1]}%` }}
              >
                <div
                  className={cn(
                    'flex flex-col items-center gap-0.5 transition-all duration-300',
                    isFolded && 'opacity-35'
                  )}
                >
                  {/* Player chip */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-all duration-200',
                      posColor,
                      isActive && 'ring-2 ring-op-gold ring-offset-1 ring-offset-transparent scale-110',
                      player.isHero && !isActive && 'ring-2 ring-white/40',
                    )}
                    style={
                      isActive
                        ? { boxShadow: '0 0 12px rgba(201,162,39,0.7)' }
                        : undefined
                    }
                  >
                    {normalPos}
                  </div>
                  {/* Stack size */}
                  {player.stackSize > 0 && (
                    <div
                      className="px-1.5 py-0.5 rounded text-[8px] font-semibold text-white/80 whitespace-nowrap"
                      style={{ background: 'rgba(0,0,0,0.55)' }}
                    >
                      {player.stackSize.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Current action description ──────────────────────── */}
      <div
        className="min-h-[40px] px-4 py-2.5 rounded-lg text-sm text-center"
        style={{ background: 'var(--op-elevated)', border: '1px solid var(--op-border)' }}
      >
        {currentStep.action ? (
          <span className={cn('font-semibold', ACTION_COLORS[currentStep.action.action] ?? 'text-op-text')}>
            {currentStep.description}
          </span>
        ) : (
          <span className="text-op-text-muted">{currentStep.description}</span>
        )}
      </div>

      {/* ── Progress bar ────────────────────────────────────── */}
      <div className="h-1 rounded-full bg-op-border overflow-hidden">
        <div
          className="h-full bg-op-gold rounded-full transition-all duration-300"
          style={{ width: `${totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0}%` }}
        />
      </div>

      {/* ── Step indicator ─────────────────────────────────── */}
      <div className="text-center text-xs text-op-text-muted">
        {stepIndex + 1} / {totalSteps}
      </div>

      {/* ── Control buttons ─────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        {/* 처음 */}
        <button
          onClick={() => { goToStep(0); setIsPlaying(false); }}
          disabled={stepIndex === 0}
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
            'bg-op-surface border border-op-border hover:bg-op-elevated',
            stepIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'text-op-text',
          )}
        >
          <SkipBack className="w-3.5 h-3.5" />
          처음
        </button>

        {/* 이전 */}
        <button
          onClick={() => { goToStep(stepIndex - 1); setIsPlaying(false); }}
          disabled={stepIndex === 0}
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
            'bg-op-surface border border-op-border hover:bg-op-elevated',
            stepIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'text-op-text',
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          이전
        </button>

        {/* 재생 / 일시정지 */}
        <button
          onClick={() => setIsPlaying(p => !p)}
          disabled={stepIndex >= totalSteps - 1 && !isPlaying}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            isPlaying
              ? 'bg-op-warning text-op-text-inverse'
              : 'bg-op-gold text-op-text-inverse hover:opacity-90',
            stepIndex >= totalSteps - 1 && !isPlaying && 'opacity-40 cursor-not-allowed',
          )}
        >
          {isPlaying
            ? <><Pause className="w-4 h-4" />일시정지</>
            : <><Play className="w-4 h-4" />재생</>
          }
        </button>

        {/* 다음 */}
        <button
          onClick={() => { goToStep(stepIndex + 1); setIsPlaying(false); }}
          disabled={stepIndex >= totalSteps - 1}
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
            'bg-op-surface border border-op-border hover:bg-op-elevated',
            stepIndex >= totalSteps - 1 ? 'opacity-40 cursor-not-allowed' : 'text-op-text',
          )}
        >
          다음
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Action log strip ─────────────────────────────────── */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: 'var(--op-elevated)', border: '1px solid var(--op-border)' }}
      >
        <div className="px-3 py-2 border-b border-op-border">
          <span className="text-xs font-semibold text-op-text-muted">액션 로그</span>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {steps.slice(1).map((step, i) => (
            <button
              key={i}
              onClick={() => { goToStep(step.stepIndex); setIsPlaying(false); }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs transition-colors',
                step.stepIndex === stepIndex
                  ? 'bg-op-gold/15 text-op-gold font-semibold'
                  : 'text-op-text-secondary hover:bg-op-surface',
              )}
            >
              {step.description}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
