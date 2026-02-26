'use client';

import Link from 'next/link';
import { ArrowLeft, LogOut, MessageSquare, VolumeX, Volume2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameState, SeatState } from '@/lib/poker/types';

const HEADER_STYLE = {
  background: 'var(--op-elevated)',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
} as const;

interface PokerTableHeaderProps {
  gameState: GameState;
  seats: (SeatState | null)[];
  maxSeats: number;
  isMuted: boolean;
  onToggleMute: () => void;
  isSeated: boolean;
  isLeaving: boolean;
  onLeave: () => void;
  onShowHistory: () => void;
}

export function PokerTableHeader({
  gameState, seats, maxSeats, isMuted, onToggleMute,
  isSeated, isLeaving, onLeave, onShowHistory,
}: PokerTableHeaderProps) {
  return (
    <header className="flex-shrink-0 h-9 flex items-center justify-between px-2 z-30" style={HEADER_STYLE}>
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
      <div className="flex items-center gap-0.5">
        <button
          onClick={onShowHistory}
          className="w-7 h-7 flex items-center justify-center rounded active:scale-[0.92] transition-transform text-white/35 hover:text-white/60"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleMute}
          className="w-7 h-7 flex items-center justify-center rounded active:scale-[0.92] transition-transform text-white/35 hover:text-white/60"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        {isSeated && (
          <button
            onClick={onLeave}
            disabled={isLeaving}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold transition-all active:scale-[0.92]',
              'text-op-error/60 hover:text-op-error',
              isLeaving && 'opacity-40 cursor-not-allowed'
            )}
          >
            <LogOut className="w-3 h-3" />
            나가기
          </button>
        )}
      </div>
    </header>
  );
}
