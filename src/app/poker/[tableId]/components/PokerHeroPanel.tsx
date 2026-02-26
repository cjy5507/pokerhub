'use client';

import Link from 'next/link';
import { LogOut, Minus, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameState, SeatState, PlayerAction } from '@/lib/poker/types';

// ─── Style constants ──────────────────────────────────────────────

const HERO_PANEL_STYLE = {
  background: 'rgba(10, 10, 10, 0.85)',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
  paddingBottom: 'env(safe-area-inset-bottom)',
} as const;

const RAISE_PANEL_STYLE = {
  background: 'var(--op-elevated)',
  border: '1px solid rgba(255,255,255,0.08)',
} as const;

// ─── PokerHeroPanel ───────────────────────────────────────────────

interface BetPreset {
  label: string;
  value: number;
  disabled: boolean;
}

interface PokerHeroPanelProps {
  isSeated: boolean;
  heroSeat: SeatState | null;
  isHeroTurn: boolean;
  isPlaying: boolean;
  turnTimeLeft: number;
  gameState: GameState;
  seats: (SeatState | null)[];
  actionPending: boolean;
  canCheck: boolean;
  callAmount: number;
  showRaiseSlider: boolean;
  setShowRaiseSlider: (v: boolean) => void;
  raiseAmount: number;
  setRaiseAmount: (v: number) => void;
  betPresets: BetPreset[];
  minRaiseTotal: number;
  maxRaiseTotal: number;
  bigBlind: number;
  pot: number;
  betInputEditing: boolean;
  setBetInputEditing: (v: boolean) => void;
  betInputText: string;
  setBetInputText: (v: string) => void;
  preAction: 'fold' | 'check_fold' | 'call' | null;
  setPreAction: (v: 'fold' | 'check_fold' | 'call' | null) => void;
  onAction: (action: PlayerAction, amount?: number) => void;
  onLeave: () => void;
  isLeaving: boolean;
  userId: string | null;
  onShowHistory: () => void;
}

export function PokerHeroPanel({
  isSeated, heroSeat, isHeroTurn, isPlaying, turnTimeLeft,
  gameState, seats, actionPending, canCheck, callAmount,
  showRaiseSlider, setShowRaiseSlider, raiseAmount, setRaiseAmount,
  betPresets, minRaiseTotal, maxRaiseTotal, bigBlind, pot,
  betInputEditing, setBetInputEditing, betInputText, setBetInputText,
  preAction, setPreAction, onAction, onLeave, isLeaving, userId, onShowHistory,
}: PokerHeroPanelProps) {
  if (!isSeated || !heroSeat) {
    // Spectator view
    return (
      <div className="flex-shrink-0 relative z-20 backdrop-blur-xl" style={HERO_PANEL_STYLE}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <button
            onClick={onShowHistory}
            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white/40 bg-white/5 hover:bg-white/8 transition-colors active:scale-[0.95]"
          >
            CHAT LOG
          </button>
          <div className="flex-1 text-center">
            <p className="text-[11px] text-white/30">{userId ? '빈 좌석을 터치하여 참가' : '관전 중'}</p>
          </div>
          {!userId && (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg text-[11px] font-bold bg-op-enter text-white hover:bg-op-enter-hover transition-colors active:scale-[0.95]"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 relative z-20 backdrop-blur-xl" style={HERO_PANEL_STYLE}>
      {/* Hero info bar */}
      <div className="px-3 pt-2 pb-1.5 flex items-center gap-3">
        <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
          <div className="text-[10px] leading-tight">
            {isHeroTurn && !heroSeat.isFolded ? (
              <span className={cn(
                'font-bold tabular-nums',
                turnTimeLeft > 10 ? 'text-op-success' : turnTimeLeft > 5 ? 'text-op-warning' : 'text-op-error animate-pulse'
              )}>
                내 차례 {turnTimeLeft}초
              </span>
            ) : heroSeat.isFolded ? (
              <span className="text-op-error/60 font-semibold uppercase tracking-wide">FOLD</span>
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
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] text-white/50 font-medium truncate max-w-[80px]">{heroSeat.nickname}</span>
            <span className="text-[14px] md:text-[16px] font-bold text-white tabular-nums leading-none">
              {heroSeat.chipStack.toLocaleString()}
            </span>
          </div>
        </div>
        {(heroSeat.isFolded || !isPlaying) && (
          <button
            onClick={onLeave}
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

      {/* Action bar — hero's turn */}
      {isHeroTurn && !heroSeat.isFolded && (
        <div className="px-2 pb-2 pt-0.5">
          {showRaiseSlider && (
            <div className="mb-2 rounded-xl p-3" style={RAISE_PANEL_STYLE}>
              {/* Bet presets */}
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
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/8 text-white/50 active:scale-[0.88]"
                >
                  <Minus className="w-4 h-4" />
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
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/8 text-white/50 active:scale-[0.88]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {/* Amount display */}
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
                          if (!isNaN(parsed)) setRaiseAmount(Math.min(maxRaiseTotal, Math.max(minRaiseTotal, parsed)));
                          setBetInputEditing(false);
                        } else if (e.key === 'Escape') {
                          setBetInputEditing(false);
                        }
                      }}
                      className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-center text-base font-bold text-white tabular-nums outline-none focus:border-op-enter"
                    />
                    <button
                      onClick={() => {
                        const parsed = parseInt(betInputText, 10);
                        if (!isNaN(parsed)) setRaiseAmount(Math.min(maxRaiseTotal, Math.max(minRaiseTotal, parsed)));
                        setBetInputEditing(false);
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-op-enter text-white active:scale-[0.88]"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setBetInputText(String(raiseAmount)); setBetInputEditing(true); }}
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

          {/* Main action buttons */}
          <div className="flex gap-2 items-stretch">
            {!canCheck && (
              <button
                onClick={() => onAction('fold')}
                disabled={actionPending}
                className={cn(
                  'flex-1 min-h-[48px] rounded-xl font-bold text-[13px] tracking-wide transition-all active:scale-[0.96] bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white relative overflow-hidden group',
                  actionPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="relative z-10">폴드</span>
              </button>
            )}
            <button
              onClick={() => canCheck ? onAction('check') : onAction('call', callAmount)}
              disabled={actionPending}
              className={cn(
                'flex-1 min-h-[48px] rounded-xl font-bold tracking-wide transition-all active:scale-[0.96] shadow-lg relative overflow-hidden group',
                canCheck ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]',
                actionPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              {canCheck ? (
                <span className="text-[13px] relative z-10">체크</span>
              ) : (
                <span className="flex flex-col items-center leading-tight relative z-10">
                  <span className="text-[13px]">콜</span>
                  <span className="text-[11px] opacity-80 font-semibold tabular-nums">{callAmount.toLocaleString()}</span>
                </span>
              )}
            </button>
            {maxRaiseTotal > 0 && (
              <button
                onClick={() => {
                  if (showRaiseSlider) {
                    const action: PlayerAction = gameState.currentBet > 0 ? 'raise' : 'bet';
                    if (raiseAmount >= maxRaiseTotal) onAction('all_in', maxRaiseTotal);
                    else onAction(action, raiseAmount);
                  } else {
                    setShowRaiseSlider(true);
                  }
                }}
                disabled={actionPending}
                className={cn(
                  'flex-1 min-h-[48px] rounded-xl font-bold tracking-wide transition-all active:scale-[0.96] shadow-lg relative overflow-hidden group',
                  showRaiseSlider && raiseAmount >= maxRaiseTotal
                    ? 'bg-gradient-to-b from-red-500 to-red-600 border border-red-400 text-white animate-all-in-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                    : 'bg-gradient-to-b from-op-gold to-yellow-600 border border-yellow-400 text-black shadow-[0_0_20px_rgba(201,162,39,0.3)]',
                  actionPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <div className="relative z-10 text-center flex flex-col items-center leading-tight">
                  {showRaiseSlider ? (
                    raiseAmount >= maxRaiseTotal ? (
                      <span className="text-[13px]">올인</span>
                    ) : (
                      <>
                        <span className="text-[12px]">{gameState.currentBet > 0 ? '레이즈' : '벳'}</span>
                        <span className="text-[11px] opacity-85 font-semibold tabular-nums">{raiseAmount.toLocaleString()}</span>
                      </>
                    )
                  ) : (
                    <>
                      <span className="text-[12px]">{gameState.currentBet > 0 ? '레이즈' : '벳'}</span>
                      <span className="text-[11px] opacity-75 font-semibold tabular-nums">{minRaiseTotal.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pre-action buttons (not hero's turn) */}
      {!isHeroTurn && isPlaying && !heroSeat.isFolded && (
        <div className="px-3 py-2">
          <div className="flex gap-2">
            {([
              { key: 'fold' as const, label: '폴드', activeClass: 'bg-white/10 text-white/70 border border-white/20' },
              { key: 'check_fold' as const, label: '체크/폴드', activeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' },
              { key: 'call' as const, label: '콜', activeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]' },
            ]).map(({ key, label, activeClass }) => (
              <button
                key={key}
                onClick={() => setPreAction(preAction === key ? null : key)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-[11px] tracking-wide font-bold transition-all active:scale-[0.93]',
                  preAction === key ? activeClass : 'bg-transparent border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
