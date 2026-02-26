'use client';

import React, { useMemo } from 'react';

const SNAILS = [
  { id: 0, name: '테리', color: '#ef4444' },
  { id: 1, name: '강욱', color: '#3b82f6' },
  { id: 2, name: '경원', color: '#22c55e' },
] as const;

export interface SnailRaceTrackProps {
  gameState: 'betting' | 'racing' | 'result';
  raceResult: { seed: string; finishOrder: number[] } | null;
}

// Mulberry32 PRNG — deterministic, same seed always yields same sequence
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromHex(hex: string): number {
  return parseInt(hex.replace(/-/g, '').slice(0, 8), 16);
}

// Final `left` % for the snail element by finish place (1st/2nd/3rd)
// Conservative values so snail doesn't overflow the track area on narrow screens
const FINISH_LEFT = [83, 71, 59];

const PLACE_LABELS = ['1위 🥇', '2위 🥈', '3위 🥉'];
const MEDALS = ['🥇', '🥈', '🥉'];

interface SnailInfo {
  id: number;
  animName: string;
  finalLeft: number;
  place: number;
}

interface RaceData {
  css: string;
  snails: SnailInfo[];
}

function buildRaceData(seed: string, finishOrder: number[]): RaceData {
  const seedNum = seedFromHex(seed);
  const shortSeed = seed.replace(/-/g, '').slice(0, 8);
  const cssBlocks: string[] = [];
  const snails: SnailInfo[] = [];

  SNAILS.forEach((snail) => {
    // Each snail gets its own PRNG stream derived from the global seed
    const rng = mulberry32((seedNum ^ (snail.id * 0x9e3779b9)) >>> 0);

    const place = finishOrder.indexOf(snail.id);
    const safePlace = place < 0 ? 2 : Math.min(place, 2);
    const finalLeft = FINISH_LEFT[safePlace] ?? 59;
    const animName = `snailRace_${snail.id}_${shortSeed}`;

    // Racing archetype: 0 = explosive start, 1 = strong finish
    const character = rng();
    const earlyBurst = [0.30, 0.25, 0.20, 0.15, 0.10];
    const lateSurge  = [0.10, 0.15, 0.20, 0.25, 0.30];
    const balanced   = [0.20, 0.20, 0.20, 0.20, 0.20];

    let weights: number[];
    if (character < 0.35) {
      const t = character / 0.35;
      weights = earlyBurst.map((e, i) => e * (1 - t) + balanced[i] * t);
    } else if (character > 0.65) {
      const t = (character - 0.65) / 0.35;
      weights = balanced.map((b, i) => b * (1 - t) + lateSurge[i] * t);
    } else {
      weights = balanced.map((b) => b * (0.7 + rng() * 0.6));
    }

    // Normalize
    const total = weights.reduce((a, b) => a + b, 0);
    const normWeights = weights.map((w) => w / total);

    // Build positions at 0%, 20%, 40%, 60%, 80%, 100%
    // Intermediate positions can reach 1st-place territory for drama / overtakes
    const maxIntermediate = FINISH_LEFT[0] ?? 83;
    const positions: number[] = [0];
    let cumulative = 0;

    for (let seg = 0; seg < 4; seg++) {
      cumulative += normWeights[seg] * finalLeft;
      const jitter = (rng() - 0.5) * 10; // ±5% drama
      const pos = Math.max(0, Math.min(maxIntermediate, cumulative + jitter));
      positions.push(pos);
    }
    positions.push(finalLeft);

    // Allow ≤5% backtracking (realistic deceleration, no teleporting)
    for (let i = 2; i < positions.length - 1; i++) {
      positions[i] = Math.max(positions[i], positions[i - 1] - 5);
    }

    const percents = [0, 20, 40, 60, 80, 100];
    const rules = percents
      .map((pct, i) => `  ${pct}% { left: ${positions[i].toFixed(2)}%; }`)
      .join('\n');
    cssBlocks.push(`@keyframes ${animName} {\n${rules}\n}`);
    snails.push({ id: snail.id, animName, finalLeft, place: safePlace });
  });

  return { css: cssBlocks.join('\n\n'), snails };
}

const SnailRaceTrackComponent: React.FC<SnailRaceTrackProps> = ({
  gameState,
  raceResult,
}) => {
  const raceData = useMemo<RaceData | null>(() => {
    if (!raceResult) return null;
    return buildRaceData(raceResult.seed, raceResult.finishOrder);
  }, [raceResult]);

  const isBetting = gameState === 'betting';
  const isRacing  = gameState === 'racing';
  const isResult  = gameState === 'result';
  const isActive  = isRacing || isResult;

  return (
    <div className="w-full rounded-xl border border-white/10 bg-gray-900/80 backdrop-blur-sm overflow-hidden select-none">
      {/* Dynamic @keyframes — generated from seed so every client is in sync */}
      {raceData && (
        <style dangerouslySetInnerHTML={{ __html: raceData.css }} />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/40">
        <span className="text-xs font-black text-white/30 tracking-widest uppercase">
          🏁 달팽이 경주
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border transition-colors ${
            isBetting
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              : isRacing
              ? 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse'
              : 'bg-white/10 text-white/50 border-white/10'
          }`}
        >
          {isBetting ? '배팅 중' : isRacing ? 'RACING!' : '결과 확인'}
        </span>
      </div>

      {/* Race lanes */}
      <div className="flex flex-col gap-2 p-3">
        {SNAILS.map((snail) => {
          const info = raceData?.snails.find((s) => s.id === snail.id);
          const isWinner = isResult && raceResult?.finishOrder[0] === snail.id;

          const snailStyle: React.CSSProperties =
            isActive && info
              ? { animation: `${info.animName} 15s linear forwards` }
              : { left: 0 };

          return (
            <div
              key={snail.id}
              className="relative h-16 md:h-20 rounded-lg overflow-hidden"
              style={{ borderLeft: `3px solid ${snail.color}60` }}
            >
              {/* Lane fill */}
              <div className="absolute inset-0 bg-black/30" />

              {/* Speed stripes (subtle) */}
              <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent 0px, transparent 39px, white 39px, white 40px)',
                }}
              />

              {/* Lane content row */}
              <div className="relative h-full flex items-center">
                {/* Snail label */}
                <div className="w-[80px] md:w-[92px] shrink-0 flex items-center gap-2 px-2 z-10">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: snail.color,
                      boxShadow: `0 0 6px ${snail.color}`,
                    }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] md:text-xs font-bold text-white/80 truncate">
                      {snail.name}
                    </span>
                    {isResult && info && (
                      <span
                        className="text-[10px] font-black leading-tight"
                        style={{
                          color:
                            info.place === 0
                              ? '#fbbf24'
                              : info.place === 1
                              ? '#94a3b8'
                              : '#cd853f',
                        }}
                      >
                        {PLACE_LABELS[info.place] ?? ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Start line */}
                <div className="absolute left-[80px] md:left-[92px] top-1 bottom-1 w-px bg-white/15 z-10" />

                {/* Race track area */}
                <div className="relative flex-1 h-full overflow-hidden">
                  {/* Finish line — dashed yellow */}
                  <div
                    className="absolute right-1.5 top-1 bottom-1 w-0.5 z-10"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(180deg, #eab308 0px, #eab308 4px, transparent 4px, transparent 8px)',
                    }}
                  />

                  {/* Snail character */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl z-20 ${
                      isWinner ? 'animate-pulse' : ''
                    }`}
                    style={{
                      backgroundColor: `${snail.color}22`,
                      border: `2px solid ${snail.color}90`,
                      boxShadow: isWinner
                        ? `0 0 16px ${snail.color}, 0 0 32px #fbbf2460`
                        : `0 0 8px ${snail.color}50`,
                      ...snailStyle,
                    }}
                  >
                    🐌
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Result podium */}
      {isResult && raceResult && (
        <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-white/5 bg-black/20">
          {raceResult.finishOrder.map((snailId, place) => {
            const snail = SNAILS.find((s) => s.id === snailId);
            if (!snail) return null;
            return (
              <div key={snailId} className="flex items-center gap-1.5">
                <span className="text-base">{MEDALS[place] ?? ''}</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: snail.color }}
                >
                  {snail.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SnailRaceTrack = React.memo(SnailRaceTrackComponent);
