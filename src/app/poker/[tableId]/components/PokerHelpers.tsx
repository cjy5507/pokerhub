'use client';

import { cn } from '@/lib/utils';

// ─── Card Back ────────────────────────────────────────────────────

const CARD_BACK_STYLE = {
  background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #1a2f4f 100%)',
  border: '1px solid rgba(255,255,255,0.12)',
} as const;

export function CardBack({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizeClasses =
    size === 'xs' ? 'w-4 h-5' :
      size === 'sm' ? 'w-7 h-10' :
        size === 'md' ? 'w-12 h-[66px]' :
          'w-[60px] h-[84px]';
  return <div className={cn(sizeClasses, 'rounded-[2px]')} style={CARD_BACK_STYLE} />;
}

// ─── Dealer Button ────────────────────────────────────────────────

export function DealerButton() {
  return (
    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center z-10 bg-white">
      <span className="text-[8px] font-bold text-black">D</span>
    </div>
  );
}

// ─── Chip Amount ──────────────────────────────────────────────────

const CHIP_AMOUNT_STYLE = { background: 'rgba(0,0,0,0.7)' } as const;

export function ChipAmount({ amount, animate }: { amount: number; animate?: boolean }) {
  if (amount <= 0) return null;
  return (
    <div className={cn('px-2 py-0.5 rounded-full', animate && 'animate-chip-to-pot')} style={CHIP_AMOUNT_STYLE}>
      <span className="text-[9px] md:text-[11px] font-bold text-white tabular-nums">
        {amount.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Win Overlay ──────────────────────────────────────────────────

const WIN_OVERLAY_STYLE = { background: 'rgba(0,0,0,0.75)' } as const;

export function WinOverlay({ winnerName, amount }: { winnerName: string; amount: number }) {
  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div className="animate-pot-win px-6 py-3 rounded-xl text-center" style={WIN_OVERLAY_STYLE}>
        <p className="text-lg md:text-xl font-bold text-white">{winnerName}</p>
        <p className="text-sm md:text-base font-bold text-op-enter">+{amount.toLocaleString()}</p>
      </div>
    </div>
  );
}
