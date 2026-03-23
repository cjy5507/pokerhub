'use client';

import { ArrowLeft, Flag, Trophy, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useSnailRace } from './useSnailRace';
import { SnailRaceTrack } from './components/SnailRaceTrack';
import { SnailRaceBettingPanel } from './components/SnailRaceBettingPanel';
import { SnailRaceHistory } from './components/SnailRaceHistory';
import { SnailRaceResults } from './components/SnailRaceResults';

interface SnailRaceClientProps {
  tableId: string;
  userId: string | null;
  initialBalance?: number;
}

const LOADING_STYLE = 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#1a1c20] flex items-center justify-center';
const TABLE_STYLE = 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#1a1c20] flex flex-col overflow-hidden select-none relative font-sans text-slate-900 dark:text-white';
const BG_GRID_STYLE = { backgroundSize: '40px 40px' } as const;
const STADIUM_EFFECTS_CSS = `
@keyframes raceGlowShift {
  0% { transform: translateX(-8%) scale(1); opacity: 0.24; }
  50% { transform: translateX(6%) scale(1.08); opacity: 0.44; }
  100% { transform: translateX(-8%) scale(1); opacity: 0.24; }
}
@keyframes raceNoiseSweep {
  0% { transform: translateY(-25%); }
  100% { transform: translateY(25%); }
}
@keyframes pulseRadar {
  0% { opacity: 0.26; transform: scale(0.94); }
  100% { opacity: 0; transform: scale(1.26); }
}
@media (max-width: 420px) {
  .snail-countdown-center {
    display: none;
  }
}
@media (max-width: 520px) {
  .snail-live-message {
    display: none;
  }
}
`;

const SNAIL_NAMES: Record<number, string> = {
  0: '\uC9C0\uB098', 1: '\uD574\uC5F0', 2: '\uC601', 3: '\uBF59\uCE74', 4: '\uC6B0\uC131', 5: '\uD14C\uB9AC', 6: '\uACBD\uC6D0',
};
const EVENT_INFO: Record<string, { emoji: string; label: string; getMessage: (name: string) => string }> = {
  obstacle: { emoji: '\uD83E\uDEA8', label: '\uB3CC\uBA69\uC774!', getMessage: (n) => `${n}\uAC00 \uB3CC\uC5D0 \uBD80\uB52A\uD600\uC2B5\uB2C8\uB2E4! \uD83D\uDE35` },
  mushroom: { emoji: '\uD83C\uDF44', label: '\uB3C5\uBC84\uC12F!', getMessage: (n) => `${n}\uAC00 \uB3C5\uBC84\uC12F\uC744 \uBC1F\uC558\uC2B5\uB2C8\uB2E4! \uD83E\uDD22` },
  boost: { emoji: '\u26A1', label: '\uBC88\uAC1C \uBD80\uC2A4\uD2B8!', getMessage: (n) => `${n}\uC5D0\uAC8C \uBC88\uAC1C \uBD80\uC2A4\uD2B8! \uD83D\uDCA8` },
  rain: { emoji: '\uD83C\uDF27\uFE0F', label: '\uC18C\uB098\uAE30!', getMessage: () => '\uC18C\uB098\uAE30\uB85C \uC21C\uC704\uAC00 \uB4A4\uC11E\uC785\uB2C8\uB2E4! \uD83C\uDF00' },
};


export function SnailRaceClient({ tableId, userId, initialBalance }: SnailRaceClientProps) {
  const {
    gameState, timeRemaining, isMuted, setIsMuted,
    selectedChip, setSelectedChip, balance, myBets, history,
    raceResult, isMounted, isDesktop, placeBet, clearBets,
    participants, odds, activeEvent, cosmeticEvent,
  } = useSnailRace(tableId, userId, initialBalance);

  if (!isMounted) {
    return (
      <div className={LOADING_STYLE}>
        <div className="animate-pulse text-slate-500 dark:text-white/50 text-sm font-bold tracking-widest">
          LOADING...
        </div>
      </div>
    );
  }

  const timeDisplay = timeRemaining > 0 ? timeRemaining : 0;
  const isUrgent = gameState === 'betting' && timeDisplay > 0 && timeDisplay < 5;
  const isWarning = gameState === 'betting' && timeDisplay >= 5 && timeDisplay <= 10;

  return (
    <div className={TABLE_STYLE}>
      <style dangerouslySetInnerHTML={{ __html: STADIUM_EFFECTS_CSS }} />
      {/* Backgrounds */}
      <div className="absolute inset-0 pointer-events-none transition-colors bg-[radial-gradient(circle_at_50%_0%,#ecfccb_0%,#dcfce7_45%,#d9f99d_100%)] dark:bg-[radial-gradient(circle_at_50%_0%,#14532d_0%,#052e16_56%,#020617_100%)] opacity-85" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 18% 18%, rgba(34,197,94,0.38), transparent 42%), radial-gradient(circle at 85% 16%, rgba(132,204,22,0.24), transparent 36%)',
          animation: 'raceGlowShift 11s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0 opacity-100 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)]"
        style={BG_GRID_STYLE}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] dark:opacity-[0.14]"
        style={{
          background:
            'repeating-linear-gradient(180deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 4px)',
          animation: 'raceNoiseSweep 7.2s linear infinite',
        }}
      />

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 md:px-4 z-30 border-b border-emerald-400/25 dark:border-emerald-300/20 bg-white/70 dark:bg-black/50 backdrop-blur-xl" style={{ height: '52px' }}>
        {/* Left: back + title + phase */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link
            href="/lottery"
            className="flex-shrink-0 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors p-1.5 rounded-md bg-slate-200/50 hover:bg-slate-300/50 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white/90 whitespace-nowrap">
              🐌 달팽이 레이스 라이브
            </h1>

            {/* Phase indicator */}
            {gameState === 'betting' && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                베팅 중
              </span>
            )}
            {gameState === 'racing' && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 whitespace-nowrap animate-[wiggle_0.4s_ease-in-out_infinite]">
                <Flag className="w-2.5 h-2.5" />
                레이스!
              </span>
            )}
            {gameState === 'result' && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                <Trophy className="w-2.5 h-2.5" />
                결과
              </span>
            )}
          </div>
        </div>

        {/* Center: Prominent countdown timer */}
        <div className="snail-countdown-center absolute left-1/2 -translate-x-1/2 flex items-baseline gap-1">
          {gameState === 'betting' && (
            <>
              <span
                className={`text-2xl md:text-3xl font-black tabular-nums leading-none transition-colors ${
                  isUrgent
                    ? 'text-red-500 dark:text-red-400 animate-pulse'
                    : isWarning
                    ? 'text-yellow-500 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {timeDisplay > 0 ? timeDisplay : '—'}
              </span>
              {timeDisplay > 0 && (
                <span className={`text-xs font-bold ${
                  isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-500 dark:text-green-500'
                }`}>
                  초
                </span>
              )}
            </>
          )}
          {gameState === 'racing' && (
            <span className="text-sm md:text-base font-black text-yellow-500 dark:text-yellow-400 tracking-wide">
              레이스 중!
            </span>
          )}
          {gameState === 'result' && (
            <span className="text-sm md:text-base font-black text-blue-500 dark:text-blue-400 tracking-wide">
              결과 발표
            </span>
          )}
        </div>

        {/* Right: balance + mute */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] md:text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold leading-none">포인트</span>
            <span className="text-xs md:text-sm font-black text-yellow-600 dark:text-yellow-500 tabular-nums leading-tight">
              ₩{balance.toLocaleString('en-US')}
            </span>
          </div>
          <button
            onClick={() => setIsMuted(m => !m)}
            className="flex-shrink-0 p-1.5 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="relative z-30 h-7 border-b border-emerald-400/20 bg-emerald-100/60 dark:bg-emerald-950/40 backdrop-blur-md">
        <div className="absolute inset-0 flex items-center px-3 md:px-4">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-700 dark:text-emerald-200">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            LIVE FEED
          </div>
          <div className="snail-live-message ml-4 text-[10px] text-emerald-800/80 dark:text-emerald-100/70 font-semibold truncate">
            {gameState === 'betting' ? '배당 집계 중 · 마지막 스퍼트 타이밍을 노리세요' : gameState === 'racing' ? '레이스 진행 중 · 트랙 이벤트가 순위를 바꿉니다' : '결과 정산 중 · 다음 라운드 출전 달팽이 선정 중'}
          </div>
        </div>
      </div>

      {/* Event banner */}
      {activeEvent && (
        <div className="absolute top-[52px] left-0 right-0 z-40 mx-3 mt-2">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500/20 to-red-500/5 border border-red-500/30 backdrop-blur-md animate-[slideUpFade_0.3s_ease-out]">
            <span className="text-xl">{EVENT_INFO[activeEvent.type]?.emoji}</span>
            <div>
              <span className="text-xs font-bold text-red-300">{EVENT_INFO[activeEvent.type]?.label}</span>
              <p className="text-xs text-white/80">
                {EVENT_INFO[activeEvent.type]?.getMessage(
                  SNAIL_NAMES[activeEvent.targetSnailId ?? 0] ?? '\uB2EC\uD3BD\uC774'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 flex flex-col xl:flex-row relative min-h-0 z-10 w-full overflow-hidden">
        {/* Desktop sidebar (history) */}
        {isDesktop && (
          <div className="hidden xl:flex w-[280px] 2xl:w-[320px] border-r border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-black/40 flex-col">
            <div className="p-3 border-b border-slate-200/30 dark:border-white/5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">최근 결과</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SnailRaceHistorySidebar history={history} />
            </div>
          </div>
        )}

        {/* Track area (relative so Results overlay works) */}
        <div className="flex-1 flex flex-col relative w-full min-h-0">
          <SnailRaceTrack
            gameState={gameState}
            raceResult={raceResult}
            timeRemaining={timeRemaining}
            participants={participants}
            activeEvent={activeEvent}
            cosmeticEvent={cosmeticEvent}
          />

          {/* Results overlay */}
          <SnailRaceResults
            gameState={gameState}
            raceResult={raceResult}
            myBets={myBets}
            balance={balance}
            odds={odds}
          />
        </div>
      </div>

      {/* Mobile history strip */}
      {!isDesktop && (
        <SnailRaceHistory history={history} />
      )}

      {/* Commentary bar */}
      {gameState === 'racing' && activeEvent && (
        <div className="flex-shrink-0 mx-3 mb-2 px-3 py-2 rounded-lg bg-black/30 backdrop-blur-sm flex items-center gap-2 z-20">
          <span className="text-sm">{'\uD83C\uDFA4\uFE0F'}</span>
          <p className="text-[11px] text-slate-200">
            {EVENT_INFO[activeEvent.type]?.getMessage(
              SNAIL_NAMES[activeEvent.targetSnailId ?? 0] ?? '\uB2EC\uD3BD\uC774'
            )}
          </p>
        </div>
      )}

      {/* Betting Panel */}
      <SnailRaceBettingPanel
        gameState={gameState}
        balance={balance}
        myBets={myBets}
        selectedChip={selectedChip}
        setSelectedChip={setSelectedChip}
        placeBet={placeBet}
        clearBets={clearBets}
        participants={participants}
        odds={odds}
      />
      {gameState === 'racing' && (
        <div className="pointer-events-none absolute top-28 right-4 z-20 hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-lime-500/80">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-lime-400/35 bg-black/45"
            style={{ animation: 'pulseRadar 1.6s ease-out infinite' }}
          />
          TRACK RADAR
        </div>
      )}
    </div>
  );
}

// Desktop sidebar shows history as vertical list of podiums
const SNAIL_COLORS_SIDEBAR: Record<number, string> = {
  0: '#ef4444', 1: '#3b82f6', 2: '#22c55e',
  3: '#f59e0b', 4: '#a855f7', 5: '#ec4899', 6: '#06b6d4',
};
const SNAIL_NAMES_SIDEBAR: Record<number, string> = {
  0: '지나', 1: '해연', 2: '영',
  3: '뻥카', 4: '우성', 5: '테리', 6: '경원',
};

function SnailRaceHistorySidebar({ history }: { history: Array<{ first: number; second: number; third: number }> }) {
  const SNAIL_COLORS = SNAIL_COLORS_SIDEBAR;
  const SNAIL_NAMES = SNAIL_NAMES_SIDEBAR;

  if (history.length === 0) {
    return (
      <p className="text-[10px] text-slate-400 dark:text-white/20 text-center pt-4">아직 결과 없음</p>
    );
  }

  const display = [...history].reverse().slice(0, 20);

  return (
    <div className="flex flex-col gap-2">
      {display.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-black/5 dark:bg-white/5">
          <span className="text-[9px] text-slate-400 dark:text-white/30 font-mono w-4 text-right flex-shrink-0">
            {history.length - i}
          </span>
          {[entry.first, entry.second, entry.third].map((snailId, rank) => (
            <div key={rank} className="flex items-center gap-1 flex-shrink-0">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: SNAIL_COLORS[snailId] ?? '#888' }}
              />
              {rank < 2 && <span className="text-[8px] text-slate-300 dark:text-white/20">→</span>}
            </div>
          ))}
          <span className="text-[9px] text-slate-500 dark:text-white/40 font-bold truncate">
            {SNAIL_NAMES[entry.first] ?? `#${entry.first}`}
          </span>
        </div>
      ))}
    </div>
  );
}
