'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────────────────
   SNAIL ROSTER (all 7)
───────────────────────────────────────────────────────── */
const SNAILS = [
  { id: 0, name: '지나',  color: '#ef4444', shellLight: '#fca5a5', bodyColor: '#fde68a' },
  { id: 1, name: '해연',  color: '#3b82f6', shellLight: '#93c5fd', bodyColor: '#bbf7d0' },
  { id: 2, name: '영',    color: '#22c55e', shellLight: '#86efac', bodyColor: '#fde68a' },
  { id: 3, name: '뻥카',  color: '#f59e0b', shellLight: '#fcd34d', bodyColor: '#fef3c7' },
  { id: 4, name: '우성',  color: '#a855f7', shellLight: '#c4b5fd', bodyColor: '#ede9fe' },
  { id: 5, name: '테리',  color: '#ec4899', shellLight: '#f9a8d4', bodyColor: '#fce7f3' },
  { id: 6, name: '경원',  color: '#06b6d4', shellLight: '#67e8f9', bodyColor: '#cffafe' },
] as const;

/* ─────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────── */
export interface SnailRaceTrackProps {
  gameState: 'betting' | 'racing' | 'result';
  raceResult: { seed: string; finishOrder: number[] } | null;
  /** milliseconds remaining in the current phase */
  timeRemaining?: number;
  /** IDs of the 3 snails participating in this round */
  participants?: number[];
}

/* ─────────────────────────────────────────────────────────
   PRNG — untouched from original
───────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────
   RACE DATA — untouched from original
───────────────────────────────────────────────────────── */
const FINISH_LEFT = [83, 71, 59];
const MEDALS = ['🥇', '🥈', '🥉'];
const PLACE_LABELS = ['1위', '2위', '3위'];

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

  // Only build data for snails in the finishOrder
  finishOrder.forEach((snailId) => {
    const snail = SNAILS.find(s => s.id === snailId);
    if (!snail) return;
    const rng = mulberry32((seedNum ^ (snail.id * 0x9e3779b9)) >>> 0);
    const place = finishOrder.indexOf(snail.id);
    const safePlace = place < 0 ? 2 : Math.min(place, 2);
    const finalLeft = FINISH_LEFT[safePlace] ?? 59;
    const animName = `snailRace_${snail.id}_${shortSeed}`;

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

    const total = weights.reduce((a, b) => a + b, 0);
    const normWeights = weights.map((w) => w / total);
    const maxIntermediate = FINISH_LEFT[0] ?? 83;
    const positions: number[] = [0];
    let cumulative = 0;

    for (let seg = 0; seg < 4; seg++) {
      cumulative += normWeights[seg] * finalLeft;
      const jitter = (rng() - 0.5) * 10;
      const pos = Math.max(0, Math.min(maxIntermediate, cumulative + jitter));
      positions.push(pos);
    }
    positions.push(finalLeft);

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

/* ─────────────────────────────────────────────────────────
   GLOBAL KEYFRAMES
───────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
/* ── Whole-body bob (racing) ── */
@keyframes snailBob {
  0%   { transform: translateY(0px) scaleX(1); }
  25%  { transform: translateY(-3px) scaleX(1.06); }
  50%  { transform: translateY(-5px) scaleX(0.96); }
  75%  { transform: translateY(-3px) scaleX(1.04); }
  100% { transform: translateY(0px) scaleX(1); }
}

/* ── Peristaltic body stretch (the "crawl" illusion) ── */
@keyframes snailBodyCrawl {
  0%   { transform: scaleX(1)    scaleY(1);    }
  20%  { transform: scaleX(1.14) scaleY(0.82); }
  45%  { transform: scaleX(0.90) scaleY(1.12); }
  70%  { transform: scaleX(1.10) scaleY(0.88); }
  100% { transform: scaleX(1)    scaleY(1);    }
}

/* ── Gentle idle sway ── */
@keyframes snailIdle {
  from { transform: translateY(0px) rotate(-1.5deg); }
  to   { transform: translateY(-3px) rotate(1.5deg); }
}

/* ── Winner bounce ── */
@keyframes snailWinBounce {
  0%   { transform: translateY(0px) scale(1); }
  100% { transform: translateY(-9px) scale(1.1); }
}

/* ── Trophy float ── */
@keyframes trophyFloat {
  from { transform: translateX(-50%) translateY(0px); }
  to   { transform: translateX(-50%) translateY(-5px); }
}

/* ── Shell shimmer on win ── */
@keyframes shellShimmer {
  0%   { filter: brightness(1) saturate(1.2); }
  50%  { filter: brightness(1.4) saturate(1.8); }
  100% { filter: brightness(1) saturate(1.2); }
}

/* ── Shell independent bob during crawl ── */
@keyframes shellBob {
  0%   { transform: translateY(0px) rotate(0deg); }
  30%  { transform: translateY(-3px) rotate(-2deg); }
  60%  { transform: translateY(-1px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}

/* ── Antenna independent sway ── */
@keyframes antennaSway {
  0%   { transform: rotate(0deg); }
  40%  { transform: rotate(-8deg); }
  70%  { transform: rotate(6deg); }
  100% { transform: rotate(0deg); }
}

/* ── GO! flash ── */
@keyframes goFlash {
  0%   { transform: scale(0.4) rotate(-8deg); opacity: 0; }
  25%  { transform: scale(1.2) rotate(2deg); opacity: 1; }
  70%  { transform: scale(1) rotate(0deg); opacity: 1; }
  100% { transform: scale(1.05) rotate(0deg); opacity: 0; }
}

/* ── Countdown urgency ── */
@keyframes urgentPulse {
  from { transform: scale(1); filter: brightness(1); }
  to   { transform: scale(1.15); filter: brightness(1.3); }
}
@keyframes gentlePulse {
  from { transform: scale(0.96); }
  to   { transform: scale(1.04); }
}

/* ── Confetti fall ── */
@keyframes confettiFall {
  0%   { transform: translateY(-8px) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(70px) rotate(720deg) scale(0.5); opacity: 0; }
}

/* ── Speed lines ── */
@keyframes speedLine {
  0%   { transform: translateX(6px) scaleX(0.2); opacity: 0.8; }
  100% { transform: translateX(-16px) scaleX(1); opacity: 0; }
}

/* ── Lane shine sweep ── */
@keyframes laneShine {
  0%   { left: -45%; }
  100% { left: 145%; }
}

/* ── Finish line flicker ── */
@keyframes finishFlicker {
  0%, 100% { opacity: 0.9; }
  50%       { opacity: 0.5; }
}

/* ── Grass/flora sway ── */
@keyframes grassSway {
  from { transform: rotate(-4deg); }
  to   { transform: rotate(4deg); }
}

/* ── Slime trail grow ── */
@keyframes slimeGrow {
  from { width: 0%; }
}

/* ── Status badge pulse ── */
@keyframes statusBadgePulse {
  from { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); }
  to   { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
}
`;

/* ─────────────────────────────────────────────────────────
   CSS-DRAWN SNAIL CHARACTER
───────────────────────────────────────────────────────── */
interface SnailCharacterProps {
  color: string;
  shellLight: string;
  bodyColor: string;
  isWinner: boolean;
  isRacing: boolean;
  isBetting: boolean;
  place: number;
}

function SnailCharacter({
  color, shellLight, bodyColor, isWinner, isRacing, isBetting, place,
}: SnailCharacterProps) {
  // Whole-character animation
  const wrapperAnim = isWinner
    ? 'snailWinBounce 0.45s ease-in-out infinite alternate'
    : isRacing
    ? 'snailBob 0.42s ease-in-out infinite'
    : isBetting
    ? 'snailIdle 1.9s ease-in-out infinite alternate'
    : undefined;

  // Body peristaltic crawl — independent of wrapper
  const bodyAnim = isRacing
    ? 'snailBodyCrawl 0.42s ease-in-out infinite'
    : isBetting
    ? 'snailBodyCrawl 2.2s ease-in-out infinite'
    : undefined;

  // Shell independent bob
  const shellAnim = isWinner
    ? 'shellShimmer 0.9s ease-in-out infinite'
    : isRacing
    ? 'shellBob 0.42s ease-in-out infinite'
    : isBetting
    ? 'shellBob 2s ease-in-out infinite'
    : undefined;

  // Antenna sway
  const antennaAnimL = isRacing
    ? 'antennaSway 0.35s ease-in-out infinite alternate'
    : 'antennaSway 2.5s ease-in-out infinite alternate';
  const antennaAnimR = isRacing
    ? 'antennaSway 0.35s ease-in-out 0.12s infinite alternate-reverse'
    : 'antennaSway 2.5s ease-in-out 0.6s infinite alternate-reverse';

  return (
    <div className="relative" style={{ width: 54, height: 44, animation: wrapperAnim }}>

      {/* Trophy — winner only */}
      {isWinner && (
        <div
          className="absolute left-1/2 text-sm"
          style={{
            top: -22,
            animation: 'trophyFloat 0.55s ease-in-out infinite alternate',
            transform: 'translateX(-50%)',
            zIndex: 30,
            filter: 'drop-shadow(0 0 4px #fbbf24)',
          }}
        >
          🏆
        </div>
      )}

      {/* Medal for silver / bronze */}
      {!isWinner && place > 0 && (
        <div
          className="absolute left-1/2 text-xs"
          style={{ top: -20, transform: 'translateX(-50%)', zIndex: 30 }}
        >
          {MEDALS[place]}
        </div>
      )}

      {/* Body — peristaltic crawl applied here */}
      <div
        className="absolute bottom-0 left-0"
        style={{
          width: 46,
          height: 16,
          borderRadius: '55% 55% 38% 38% / 70% 70% 38% 38%',
          backgroundColor: bodyColor,
          boxShadow: '0 3px 7px rgba(0,0,0,0.45)',
          transformOrigin: 'left center',
          animation: bodyAnim,
        }}
      />

      {/* Neck */}
      <div
        className="absolute"
        style={{
          bottom: 13,
          left: 33,
          width: 10,
          height: 14,
          borderRadius: '50% 50% 0 0',
          backgroundColor: bodyColor,
        }}
      />

      {/* Head */}
      <div
        className="absolute"
        style={{
          bottom: 23,
          left: 31,
          width: 15,
          height: 13,
          borderRadius: '50%',
          backgroundColor: bodyColor,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        {/* Eye */}
        <div
          className="absolute"
          style={{
            top: 2,
            right: 2,
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: '#1e1b4b',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: 1,
              width: 2,
              height: 2,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.7)',
            }}
          />
        </div>

        {/* Antenna L — independent sway */}
        <div
          className="absolute"
          style={{
            top: -9,
            left: 3,
            width: 2,
            height: 10,
            borderRadius: 2,
            backgroundColor: bodyColor,
            transformOrigin: 'bottom center',
            transform: 'rotate(-12deg)',
            animation: antennaAnimL,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: color,
              marginLeft: -1.5,
              marginTop: -2,
              boxShadow: `0 0 4px ${color}`,
            }}
          />
        </div>

        {/* Antenna R — independent sway (offset phase) */}
        <div
          className="absolute"
          style={{
            top: -9,
            left: 9,
            width: 2,
            height: 10,
            borderRadius: 2,
            backgroundColor: bodyColor,
            transformOrigin: 'bottom center',
            transform: 'rotate(12deg)',
            animation: antennaAnimR,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: shellLight,
              marginLeft: -1.5,
              marginTop: -2,
              boxShadow: `0 0 4px ${shellLight}`,
            }}
          />
        </div>
      </div>

      {/* Shell — independent bob */}
      <div
        className="absolute"
        style={{
          bottom: 10,
          left: 3,
          width: 34,
          height: 30,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${color}, ${shellLight}, ${color}CC, ${shellLight}99, ${color}AA, ${shellLight}, ${color})`,
          boxShadow: isWinner
            ? `0 0 18px ${color}, 0 0 36px #fbbf2455, inset 0 -4px 8px rgba(0,0,0,0.35)`
            : `0 3px 10px rgba(0,0,0,0.55), inset 0 -3px 6px rgba(0,0,0,0.3)`,
          transformOrigin: 'center bottom',
          animation: shellAnim,
        }}
      >
        {/* Highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 33% 33%, ${shellLight}BB 0%, transparent 55%)`,
          }}
        />
        {/* Inner ring */}
        <div
          className="absolute"
          style={{
            top: '26%',
            left: '26%',
            width: '48%',
            height: '48%',
            borderRadius: '50%',
            border: `2px solid ${color}77`,
            background: `radial-gradient(circle at 38% 38%, ${shellLight}44 0%, transparent 60%)`,
          }}
        />
        {/* Centre dot */}
        <div
          className="absolute"
          style={{
            top: '42%',
            left: '42%',
            width: '16%',
            height: '16%',
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SLIME TRAIL
───────────────────────────────────────────────────────── */
function SlimeTrail({ color, finalLeftPct }: { color: string; finalLeftPct: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: `calc(${finalLeftPct}% + 30px)`,
        height: 7,
        background: `linear-gradient(90deg, transparent 0%, ${color}18 25%, ${color}50 70%, ${color}28 100%)`,
        borderRadius: 4,
        filter: 'blur(1.5px)',
        zIndex: 4,
        animation: 'slimeGrow 15s linear forwards',
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   SPEED LINES
───────────────────────────────────────────────────────── */
function SpeedLines({ color }: { color: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            right: 4,
            top: `${28 + i * 16}%`,
            width: 12 + i * 5,
            height: 2,
            backgroundColor: color,
            opacity: 0.45,
            borderRadius: 1,
            animation: `speedLine 0.32s ease-out ${i * 0.09}s infinite`,
            transformOrigin: 'right center',
          }}
        />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   LANE DECORATIONS (flowers / mushrooms)
───────────────────────────────────────────────────────── */
function LaneDecorations({ laneIndex }: { laneIndex: number }) {
  const sets = [
    ['🌸', '🍄', '🌿', '🌸', '🍄', '🌼'],
    ['🌿', '🌼', '🍄', '🌿', '🌸', '🍄'],
    ['🌼', '🌸', '🌿', '🍄', '🌼', '🌿'],
  ];
  const items = sets[laneIndex % sets.length] ?? sets[0];
  const positions = [6, 17, 30, 48, 64, 78];
  const onTop = laneIndex % 2 === 0;

  return (
    <>
      {items.map((item, i) => (
        <span
          key={i}
          className="absolute text-[8px] select-none pointer-events-none"
          style={{
            left: `${positions[i]}%`,
            top: onTop ? 1 : 'auto',
            bottom: onTop ? 'auto' : 1,
            opacity: 0.5,
            animation: `grassSway ${1.1 + i * 0.25}s ease-in-out ${i * 0.18}s infinite alternate`,
            transformOrigin: 'bottom center',
            zIndex: 3,
          }}
        >
          {item}
        </span>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   CONFETTI BURST (winner celebration)
───────────────────────────────────────────────────────── */
function WinnerConfetti() {
  const colors = ['#ef4444', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316'];
  return (
    <>
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: i % 3 === 0 ? 8 : 5,
            height: i % 3 === 0 ? 5 : 8,
            borderRadius: i % 2 === 0 ? '50%' : 2,
            left: `${5 + i * 6.5}%`,
            top: '8%',
            backgroundColor: colors[i % colors.length],
            animation: `confettiFall ${0.75 + (i % 5) * 0.18}s ease-in ${i * 0.07}s forwards`,
            transform: `rotate(${i * 26}deg)`,
            zIndex: 50,
          }}
        />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   COUNTDOWN OVERLAY
───────────────────────────────────────────────────────── */
function CountdownOverlay({
  gameState,
  timeRemaining,
}: {
  gameState: string;
  timeRemaining: number;
}) {
  const [showGo, setShowGo] = useState(false);
  const prevStateRef = useRef(gameState);

  useEffect(() => {
    if (prevStateRef.current !== 'racing' && gameState === 'racing') {
      setShowGo(true);
      const t = setTimeout(() => setShowGo(false), 1900);
      prevStateRef.current = gameState;
      return () => clearTimeout(t);
    }
    prevStateRef.current = gameState;
  }, [gameState]);

  if (showGo) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
        style={{ backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.15)' }}
      >
        <span
          className="font-black tracking-widest select-none"
          style={{
            fontSize: 76,
            color: '#4ade80',
            textShadow: '0 0 28px #22c55e, 0 0 56px #22c55e88, 0 4px 0 #14532d',
            animation: 'goFlash 1.9s ease-out forwards',
          }}
        >
          GO!
        </span>
      </div>
    );
  }

  const isBetting = gameState === 'betting';
  if (!isBetting || timeRemaining <= 0) return null;

  // timeRemaining is already in seconds (integer)
  const secRemaining = timeRemaining;
  const isUrgent = secRemaining <= 5;

  // Assume betting phase is 30s total; draw arc proportional to time left
  const PHASE_TOTAL_SEC = 30;
  const fraction = Math.min(1, secRemaining / PHASE_TOTAL_SEC);
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - fraction);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
      style={{ backdropFilter: 'blur(1px)' }}
    >
      <div className="relative flex items-center justify-center" style={{ width: 86, height: 86 }}>
        {/* SVG ring */}
        <svg
          width={86}
          height={86}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={43}
            cy={43}
            r={radius}
            fill="rgba(0,0,0,0.45)"
            stroke={isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}
            strokeWidth={5}
          />
          {/* Arc */}
          <circle
            cx={43}
            cy={43}
            r={radius}
            fill="none"
            stroke={isUrgent ? '#ef4444' : '#fbbf24'}
            strokeWidth={5}
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.85s ease, stroke 0.3s ease' }}
          />
        </svg>
        {/* Number */}
        <span
          className="font-black tabular-nums select-none"
          style={{
            fontSize: 34,
            lineHeight: 1,
            color: isUrgent ? '#ef4444' : '#fbbf24',
            textShadow: isUrgent
              ? '0 0 22px #ef444499, 0 2px 0 rgba(0,0,0,0.6)'
              : '0 0 18px #fbbf2477, 0 2px 0 rgba(0,0,0,0.6)',
            animation: isUrgent
              ? 'urgentPulse 0.45s ease-in-out infinite alternate'
              : 'gentlePulse 1.1s ease-in-out infinite alternate',
          }}
        >
          {secRemaining}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const SnailRaceTrackComponent: React.FC<SnailRaceTrackProps> = ({
  gameState,
  raceResult,
  timeRemaining = 0,
  participants,
}) => {
  const raceData = useMemo<RaceData | null>(() => {
    if (!raceResult) return null;
    return buildRaceData(raceResult.seed, raceResult.finishOrder);
  }, [raceResult]);

  const isBetting = gameState === 'betting';
  const isRacing  = gameState === 'racing';
  const isResult  = gameState === 'result';
  const isActive  = isRacing || isResult;

  const winnerId = isResult && raceResult ? (raceResult.finishOrder[0] ?? -1) : -1;

  // Determine which snails to show:
  // - During racing/result: use finishOrder
  // - During betting: use participants if provided
  // - Fallback: show all 7 (should not happen in normal flow)
  const activeSnailIds: number[] = useMemo(() => {
    if (isActive && raceResult) return raceResult.finishOrder;
    if (participants && participants.length > 0) return participants;
    return [];
  }, [isActive, raceResult, participants]);

  const activeSnails = SNAILS.filter(s => activeSnailIds.includes(s.id));

  // Waiting — only shown during betting
  const waitingSnails = isBetting && participants && participants.length > 0
    ? SNAILS.filter(s => !participants.includes(s.id))
    : [];

  return (
    <div className="w-full select-none overflow-hidden">
      {/* Global keyframes */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* Race-specific keyframes (seed-derived) */}
      {raceData && (
        <style dangerouslySetInnerHTML={{ __html: raceData.css }} />
      )}

      {/* ── Outer track ─────────────────────────────── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #14532d 0%, #166534 15%, #16a34a 50%, #166534 85%, #14532d 100%)',
          border: '3px solid #15803d',
          boxShadow:
            '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.3)',
        }}
      >
        {/* Grass texture — subtle horizontal lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 6px)',
          }}
        />

        {/* Header strip */}
        <div
          className="relative z-10 flex items-center justify-between px-4 py-2.5"
          style={{
            background: 'rgba(0,0,0,0.40)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white/60 tracking-[0.2em] uppercase">
              🏁 달팽이 레이스
            </span>
          </div>
          <div
            className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border"
            style={{
              background: isBetting
                ? 'rgba(234,179,8,0.18)'
                : isRacing
                ? 'rgba(74,222,128,0.18)'
                : 'rgba(96,165,250,0.18)',
              color: isBetting ? '#fbbf24' : isRacing ? '#4ade80' : '#93c5fd',
              borderColor: isBetting
                ? 'rgba(234,179,8,0.38)'
                : isRacing
                ? 'rgba(74,222,128,0.38)'
                : 'rgba(96,165,250,0.38)',
              animation: isRacing ? 'statusBadgePulse 1s ease-out infinite' : undefined,
            }}
          >
            {isBetting ? '배팅 중' : isRacing ? '레이싱!' : '결과 확인'}
          </div>
        </div>

        {/* ── Lanes container ──────────────────────── */}
        <div className="relative flex flex-col" style={{ padding: '6px 6px 8px' }}>

          {/* Countdown + GO overlay (spans all lanes) */}
          <CountdownOverlay gameState={gameState} timeRemaining={timeRemaining} />

          {/* Confetti (spans all lanes) */}
          {isResult && winnerId >= 0 && (
            <div className="absolute inset-0 pointer-events-none z-50">
              <WinnerConfetti />
            </div>
          )}

          {/* No participants yet */}
          {activeSnails.length === 0 ? (
            <div
              className="flex items-center justify-center py-8 text-sm text-white/40 font-bold tracking-widest"
            >
              다음 라운드 대기 중...
            </div>
          ) : (
            activeSnails.map((snail, laneIndex) => {
              const info    = raceData?.snails.find((s) => s.id === snail.id);
              const isWinner = isResult && winnerId === snail.id;
              const place    = info?.place ?? laneIndex;

              // Snail position style: animate left% from PRNG keyframes, or sit at 0 during betting
              const snailContainerStyle: React.CSSProperties =
                isActive && info
                  ? {
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: 0,
                      animation: `${info.animName} 15s linear forwards`,
                      zIndex: 20,
                    }
                  : {
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: 0,
                      zIndex: 20,
                    };

              return (
                <div
                  key={snail.id}
                  className="relative overflow-hidden"
                  style={{
                    height: 82,
                    marginBottom: laneIndex < activeSnails.length - 1 ? 4 : 0,
                    borderRadius: 10,
                    // Dirt path inside grass
                    background:
                      laneIndex % 2 === 0
                        ? 'linear-gradient(180deg, rgba(133,77,14,0.20) 0%, rgba(120,53,15,0.32) 100%)'
                        : 'linear-gradient(180deg, rgba(101,67,33,0.22) 0%, rgba(133,77,14,0.28) 100%)',
                    border: `1px solid ${snail.color}28`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 5px rgba(0,0,0,0.35)`,
                  }}
                >
                  {/* Dirt floor gradient */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(200,150,80,0.06) 0%, rgba(101,67,33,0.18) 50%, rgba(200,150,80,0.06) 100%)',
                    }}
                  />

                  {/* Sheen during racing */}
                  {isRacing && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none"
                      style={{
                        width: '32%',
                        background:
                          'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                        animation: `laneShine ${2.8 + laneIndex * 0.65}s linear ${laneIndex * 0.4}s infinite`,
                      }}
                    />
                  )}

                  {/* Decorative flora */}
                  <LaneDecorations laneIndex={laneIndex} />

                  {/* Label sidebar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 flex flex-col items-center justify-center z-20 shrink-0"
                    style={{
                      width: 68,
                      background: `linear-gradient(90deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.12) 100%)`,
                      borderRight: `2px solid ${snail.color}45`,
                      gap: 3,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: snail.color,
                        boxShadow: `0 0 8px ${snail.color}`,
                        flexShrink: 0,
                      }}
                    />
                    <span className="text-[11px] font-black text-white/90 leading-tight">
                      {snail.name}
                    </span>
                    {isResult && (
                      <span
                        className="text-[10px] font-black leading-tight"
                        style={{
                          color:
                            place === 0 ? '#fbbf24' : place === 1 ? '#94a3b8' : '#b87333',
                        }}
                      >
                        {PLACE_LABELS[place]}
                      </span>
                    )}
                  </div>

                  {/* Start gate (thin striped bar) */}
                  <div
                    className="absolute top-2 bottom-2 z-10 pointer-events-none"
                    style={{
                      left: 68,
                      width: 4,
                      background: `repeating-linear-gradient(180deg, #fff 0px, #fff 5px, #1a1a1a 5px, #1a1a1a 10px)`,
                      opacity: 0.35,
                      borderRadius: 1,
                    }}
                  />

                  {/* Track area */}
                  <div
                    className="absolute top-0 bottom-0 right-0 overflow-hidden"
                    style={{ left: 72 }}
                  >
                    {/* Finish line — checkered */}
                    <div
                      className="absolute top-0 bottom-0 right-3 z-10 pointer-events-none"
                      style={{
                        width: 10,
                        backgroundImage:
                          'repeating-conic-gradient(#eab308 0% 25%, #0f0f0f 0% 50%)',
                        backgroundSize: '5px 5px',
                        opacity: 0.9,
                        boxShadow: `2px 0 8px rgba(234,179,8,0.3), -2px 0 8px rgba(234,179,8,0.3)`,
                        animation: isRacing ? 'finishFlicker 1.4s ease-in-out infinite' : undefined,
                      }}
                    />

                    {/* Slime trail */}
                    {isActive && info && (
                      <SlimeTrail color={snail.color} finalLeftPct={info.finalLeft} />
                    )}

                    {/* Snail + speed lines wrapper */}
                    <div style={snailContainerStyle}>
                      {isRacing && (
                        <div
                          className="absolute pointer-events-none"
                          style={{ right: '100%', top: '50%', transform: 'translateY(-50%)', width: 30 }}
                        >
                          <SpeedLines color={snail.color} />
                        </div>
                      )}
                      <SnailCharacter
                        color={snail.color}
                        shellLight={snail.shellLight}
                        bodyColor={snail.bodyColor}
                        isWinner={isWinner}
                        isRacing={isRacing}
                        isBetting={isBetting}
                        place={place}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Waiting snails row during betting */}
          {isBetting && waitingSnails.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 flex-wrap">
              <span className="text-[9px] text-white/30 font-bold tracking-wider">대기:</span>
              {waitingSnails.map(snail => (
                <span
                  key={snail.id}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-white/40 border border-white/10"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: snail.color }} />
                  {snail.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Result podium footer ─────────────────── */}
        {isResult && raceResult && (
          <div
            className="flex items-center justify-center gap-6 px-4 py-3 z-10 relative"
            style={{
              background: 'rgba(0,0,0,0.45)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {raceResult.finishOrder.map((snailId, place) => {
              const snail = SNAILS.find((s) => s.id === snailId);
              if (!snail) return null;
              return (
                <div key={snailId} className="flex items-center gap-1.5">
                  <span className="text-base">{MEDALS[place] ?? ''}</span>
                  <span
                    className="text-xs font-black"
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
    </div>
  );
};

export const SnailRaceTrack = React.memo(SnailRaceTrackComponent);
