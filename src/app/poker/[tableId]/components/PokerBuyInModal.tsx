'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BuyInModalProps {
  seatNumber: number;
  minBuyIn: number;
  maxBuyIn: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export function BuyInModal({ seatNumber, minBuyIn, maxBuyIn, onConfirm, onCancel }: BuyInModalProps) {
  const [buyIn, setBuyIn] = useState(Math.floor((minBuyIn + maxBuyIn) / 2));
  const presets = [minBuyIn, Math.floor((minBuyIn + maxBuyIn) / 2), maxBuyIn];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200]" onClick={onCancel}>
      <div className="bg-op-elevated border border-white/10 rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
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
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setBuyIn(preset)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  buyIn === preset ? 'bg-op-enter text-white' : 'bg-white/8 text-white/50 hover:bg-white/12'
                )}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={onCancel} className="flex-1 bg-op-elevated hover:bg-op-border text-white font-semibold py-3 rounded-lg transition-colors">
              취소
            </button>
            <button onClick={() => onConfirm(buyIn)} className="flex-1 bg-op-enter hover:bg-op-enter-hover text-white font-semibold py-3 rounded-lg transition-colors">
              착석
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
