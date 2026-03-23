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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]" onClick={onCancel}>
      <div className="bg-op-elevated border border-op-border rounded-xl p-5 max-w-sm w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-op-text mb-4">좌석 {seatNumber + 1} 착석</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-op-text-secondary mb-2">
              바이인: <span className="text-op-text font-bold">{buyIn.toLocaleString()}P</span>
            </label>
            <input
              type="range"
              min={minBuyIn}
              max={maxBuyIn}
              step={Math.max(1, Math.floor(minBuyIn / 10))}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              className="w-full accent-op-gold"
            />
            <div className="flex justify-between text-xs text-op-text-muted mt-1">
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
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                  buyIn === preset ? 'bg-op-gold text-op-text-inverse border-op-gold' : 'bg-op-surface text-op-text-secondary border-op-border hover:bg-op-elevated'
                )}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={onCancel} className="flex-1 bg-op-surface hover:bg-op-border border border-op-border text-op-text font-semibold py-3 rounded-lg transition-colors">
              취소
            </button>
            <button onClick={() => onConfirm(buyIn)} className="flex-1 bg-op-gold hover:bg-op-gold-hover text-op-text-inverse border border-op-gold font-semibold py-3 rounded-lg transition-colors">
              착석
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
