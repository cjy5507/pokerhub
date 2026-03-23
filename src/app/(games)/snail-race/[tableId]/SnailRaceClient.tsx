'use client';

import { ArrowLeft, Clock3, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

const LOADING_STYLE =
  'fixed inset-0 z-50 bg-black/95 text-white flex items-center justify-center';

const TABLE_STYLE =
  'fixed inset-0 z-50 bg-[#090d14] dark:bg-black text-[#d6e7ff] flex flex-col overflow-hidden select-none relative font-sans';

const STADIUM_STYLE = `
@keyframes stadiumDrift {
  0% { transform: translateX(-6%) scale(1); opacity: 0.28; }
  50% { transform: translateX(7%) scale(1.04); opacity: 0.5; }
  100% { transform: translateX(-6%) scale(1); opacity: 0.28; }
}
@keyframes tickerSweep {
  0% { transform: translateY(-18%); opacity: 0.5; }
  100% { transform: translateY(18%); opacity: 1; }
}
@keyframes panelReveal {
  0% { opacity: 0; transform: translateY(18px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes liveBadge {
  0% { opacity: 0.45; }
  100% { opacity: 1; }
}
.ticker {
  background: linear-gradient(90deg, transparent, rgba(125,211,252,0.28), transparent);
}
`;

const PHASE_BADGES: Record<string, { label: string; accent: string; halo: string }> = {
  betting: { label: '베팅', accent: '#22c55e', halo: 'rgba(34,197,94,0.35)' },
  racing: { label: '레이스', accent: '#f59e0b', halo: 'rgba(245,158,11,0.35)' },
  result: { label: '결과', accent: '#38bdf8', halo: 'rgba(56,189,248,0.3)' },
};

const SNAIL_NAMES: Record<number, string> = {
  0: '지나',
  1: '해연',
  2: '영',
  3: '뻥카',
  4: '우성',
  5: '테리',
  6: '경원',
};

const EVENT_INFO: Record<
  string,
  { emoji: string; label: string; getMessage: (name: string) => string }
> = {
  obstacle: {
    emoji: '🧱',
    label: '장애물!',
    getMessage: (n) => `${n}가 장애물에 맞았어요!`,
  },
  mushroom: {
    emoji: '🍄',
    label: '버프!',
    getMessage: (n) => `${n}가 버프 아이템을 얻었어요!`,
  },
  boost: {
    emoji: '⚡',
    label: '가속!',
    getMessage: (n) => `${n}에 가속이 걸렸어요!`,
  },
  rain: {
    emoji: '🌧️',
    label: '비!',
    getMessage: () => '빗줄기 때문에 순위가 흔들려요.',
  },
};

export function SnailRaceClient({ tableId, userId, initialBalance }: SnailRaceClientProps) {
  const {
    gameState,
    timeRemaining,
    isMuted,
    setIsMuted,
    selectedChip,
    setSelectedChip,
    balance,
    myBets,
    history,
    raceResult,
    isMounted,
    isDesktop,
    placeBet,
    clearBets,
    participants,
    odds,
    activeEvent,
    cosmeticEvent,
  } = useSnailRace(tableId, userId, initialBalance);

  if (!isMounted) {
    return (
      <div className={LOADING_STYLE}>
        <div className="animate-pulse text-sm font-black tracking-[0.35em]">LOADING STAGE...</div>
      </div>
    );
  }

  const phase = PHASE_BADGES[gameState];
  const timer = timeRemaining > 0 ? timeRemaining : 0;
  const isUrgent = gameState === 'betting' && timer > 0 && timer <= 5;
  const isWarmup = gameState === 'betting' && timer > 10;

  return (
    <motion.div
      className={TABLE_STYLE}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <style dangerouslySetInnerHTML={{ __html: STADIUM_STYLE }} />

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_5%,#0f172a_0%,#0a1020_35%,#060a13_100%)]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(145deg, rgba(30,41,59,0.22), rgba(5,15,37,0.16)), radial-gradient(circle at 18% 17%, rgba(56,189,248,0.24), transparent 43%), radial-gradient(circle at 86% 17%, rgba(250,204,21,0.16), transparent 34%)',
          animation: 'stadiumDrift 11s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] opacity-30" />

      <motion.header
        className="relative z-30 flex-shrink-0 h-14 flex items-center justify-between gap-3 px-4 border-b border-white/10 bg-[#0c1322]/80 backdrop-blur"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/snail-race"
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="leading-tight min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Pato Stage</p>
            <h1 className="text-sm md:text-base font-black text-white truncate">🐌 달팽이 레이스</h1>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center text-center">
          <span className="text-[10px] text-white/60 uppercase tracking-[0.18em]">Stage Timer</span>
          <div className="flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5 text-white/60" />
            <span
              className={`text-xl font-black tabular-nums ${
                isUrgent ? 'text-[#fca5a5]' : isWarmup ? 'text-[#4ade80]' : 'text-[#fef08a]'
              }`}
            >
              {timer}
            </span>
            <span className="text-[10px] text-white/60">초</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-right">
            <div className="text-[10px] text-white/50 tracking-[0.16em] uppercase">보유 포인트</div>
            <div className="font-black text-base md:text-lg text-[#fde68a]">₩{balance.toLocaleString('en-US')}</div>
          </div>
          <button
            onClick={() => setIsMuted((m) => !m)}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </motion.header>

      <motion.div
        className="relative z-30 h-8 px-4 border-b border-white/10 bg-white/5 backdrop-blur flex items-center gap-3 text-[10px] md:text-[11px] text-white/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <span
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/20 text-white/90"
          style={{ background: `${phase.halo}`, animation: 'liveBadge 0.95s ease-in-out infinite alternate' }}
        >
          <span
            className="inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: phase.accent, boxShadow: `0 0 8px ${phase.halo}` }}
          />
          {phase.label}
        </span>
        <span className="tracking-wider uppercase text-white/50">라이브 상태</span>
        <span className="truncate">{gameState === 'betting' ? '베팅 집계 중 · 마지막 구간을 노려라' : gameState === 'racing' ? '레이스 진행 중 · 이벤트가 순위를 흔듭니다' : '결과 정산 중 · 다음 참가자 확정 중'}</span>
      </motion.div>

      <div className="absolute left-1/2 top-14 -translate-x-1/2 z-40 h-8 w-[94%] pointer-events-none">
        <div className="relative h-full rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent overflow-hidden">
          <div className="ticker absolute inset-0" style={{ animation: 'tickerSweep 2.3s linear infinite' }} />
        </div>
      </div>

      {activeEvent && (
        <motion.div
          className="absolute left-3 right-3 top-22 md:top-[72px] z-50"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5 rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl">
            <span className="text-2xl">{EVENT_INFO[activeEvent.type]?.emoji}</span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-black text-white/80">{EVENT_INFO[activeEvent.type]?.label}</span>
              <span className="text-[11px] text-white/70">
                {EVENT_INFO[activeEvent.type]?.getMessage(
                  SNAIL_NAMES[activeEvent.targetSnailId ?? 0] ?? '달팽이',
                )}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.main
        className="relative z-20 flex-1 min-h-0 overflow-hidden px-3 py-2 flex flex-col"
        style={{ animation: 'panelReveal 0.5s ease-out both' }}
      >
        <div className="relative h-full min-h-0 rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-1 top-1 bottom-1 rounded-[22px] bg-gradient-to-b from-white/[0.06] via-transparent to-white/[0.02]" />
          <div className="relative z-20 h-full flex flex-col xl:flex-row overflow-hidden">
            {isDesktop && (
              <motion.aside
                className="hidden xl:flex w-[300px] 2xl:w-[340px] border-r border-white/15 bg-black/45 p-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.35 }}
              >
                <div className="w-full">
                  <p className="text-[10px] text-white/55 uppercase tracking-[0.22em] px-1 pb-2">최근 결과</p>
                  <SnailRaceHistorySidebar history={history} />
                </div>
              </motion.aside>
            )}

            <div className="flex-1 relative min-h-0 flex flex-col">
              <div className="relative px-3 py-2 md:px-4 md:py-3">
                <SnailRaceTrack
                  gameState={gameState}
                  raceResult={raceResult}
                  timeRemaining={timeRemaining}
                  participants={participants}
                  activeEvent={activeEvent}
                  cosmeticEvent={cosmeticEvent}
                />
              </div>
              {!isDesktop && <SnailRaceHistory history={history} />}
            </div>
          </div>
        </div>

        <div className="h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </motion.main>

      {gameState === 'racing' && (
        <div className="absolute top-[132px] right-4 z-30 pointer-events-none hidden xl:flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-lime-300/85">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-lime-300/40 bg-black/40"
            style={{ boxShadow: '0 0 12px rgba(132,204,22,0.42)' }}
          />
          TRACK RADAR
        </div>
      )}

      <motion.div
        className="relative z-30"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
      >
        <SnailRaceBettingPanel
          gameState={gameState}
          myBets={myBets}
          selectedChip={selectedChip}
          setSelectedChip={setSelectedChip}
          placeBet={placeBet}
          clearBets={clearBets}
          participants={participants}
          odds={odds}
        />
      </motion.div>

      <SnailRaceResults
        gameState={gameState}
        raceResult={raceResult}
        myBets={myBets}
        balance={balance}
        odds={odds}
      />
    </motion.div>
  );
}

const SNAIL_COLORS_SIDEBAR: Record<number, string> = {
  0: '#ef4444',
  1: '#3b82f6',
  2: '#22c55e',
  3: '#f59e0b',
  4: '#a855f7',
  5: '#ec4899',
  6: '#06b6d4',
};
const SNAIL_NAMES_SIDEBAR: Record<number, string> = {
  0: '지나',
  1: '해연',
  2: '영',
  3: '뻥카',
  4: '우성',
  5: '테리',
  6: '경원',
};

function SnailRaceHistorySidebar({
  history,
}: {
  history: Array<{ first: number; second: number; third: number }>;
}) {
  const SNAIL_COLORS = SNAIL_COLORS_SIDEBAR;
  const SNAIL_NAMES = SNAIL_NAMES_SIDEBAR;

  if (history.length === 0) {
    return <p className="text-xs text-white/40 pt-4">결과가 아직 없습니다.</p>;
  }

  const display = [...history].reverse().slice(0, 24);

  return (
    <div className="flex flex-col gap-2">
      {display.map((entry, i) => (
        <motion.div
          key={`${entry.first}-${i}`}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/5 border border-white/10"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <span className="w-4 text-right text-[9px] text-white/45 font-mono">{history.length - i}</span>
          {[entry.first, entry.second, entry.third].map((snailId, rank) => (
            <div key={rank} className="flex items-center gap-1">
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/25"
                style={{ backgroundColor: SNAIL_COLORS[snailId] ?? '#888' }}
              />
              {rank < 2 && <span className="text-[8px] text-white/35">→</span>}
            </div>
          ))}
          <span className="text-[10px] text-white/70 truncate">{SNAIL_NAMES[entry.first] ?? `#${entry.first}`}</span>
        </motion.div>
      ))}
    </div>
  );
}
