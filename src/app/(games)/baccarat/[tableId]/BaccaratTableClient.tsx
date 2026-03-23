'use client';

import { ArrowLeft, CircleUserRound, Music4, Music3, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useBaccaratGame } from './useBaccaratGame';
import { motion } from 'framer-motion';
import { BaccaratDealer } from './components/BaccaratDealer';
import { BaccaratBettingGrid } from './components/BaccaratBettingGrid';
import { BaccaratRoadmap } from './components/BaccaratRoadmap';

interface BaccaratTableClientProps {
  tableId: string;
  userId: string | null;
  nickname: string | null;
  initialBalance?: number;
}

const LOADING_STYLE =
  'fixed inset-0 z-50 bg-[#090d14] flex items-center justify-center text-[#d6e7ff]';

const TABLE_STYLE =
  'fixed inset-0 z-50 bg-[#090d14] text-[#d6e7ff] flex flex-col overflow-hidden select-none relative font-sans';

const BACCARAT_STAGE_CSS = `
@keyframes casinoPulse {
  0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.2); }
  100% { box-shadow: 0 0 0 20px rgba(56,189,248,0); }
}
@keyframes laneFlow {
  0% { transform: translateX(-18%); opacity: 0.22; }
  100% { transform: translateX(18%); opacity: 0.6; }
}
@keyframes tickerPulse {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}
@keyframes phaseSweep {
  from { transform: translateX(-20%); }
  to { transform: translateX(120%); }
}
`;

const PHASE_COPY: Record<string, string> = {
  waiting: '대기중',
  betting: '베팅 중',
  dealing: '딜링 중',
  result: '정산 중',
};

const PHASE_GLOW: Record<string, string> = {
  waiting: 'rgba(148,163,184,0.4)',
  betting: 'rgba(250,204,21,0.4)',
  dealing: 'rgba(59,130,246,0.4)',
  result: 'rgba(52,211,153,0.4)',
};

export function BaccaratTableClient({
  tableId,
  userId,
  nickname,
  initialBalance,
}: BaccaratTableClientProps) {
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
    playerCards,
    bankerCards,
    playerScore,
    bankerScore,
    revealedCards,
    isMounted,
    isDesktop,
    placeBet,
    clearBets,
  } = useBaccaratGame(tableId, userId, initialBalance);

  if (!isMounted) {
    return (
      <div className={LOADING_STYLE}>
        <div className="animate-pulse text-sm font-black tracking-[0.35em]">LOADING TABLE...</div>
      </div>
    );
  }

  return (
    <div className={TABLE_STYLE}>
      <style dangerouslySetInnerHTML={{ __html: BACCARAT_STAGE_CSS }} />

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_12%,#0f172a_0%,#090d14_44%,#060a13_100%)]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 14% 14%, rgba(56,189,248,0.2), transparent 42%), radial-gradient(circle at 86% 14%, rgba(250,204,21,0.14), transparent 38%), linear-gradient(145deg, rgba(30,41,59,0.22), rgba(2,6,23,0.16))',
          animation: 'laneFlow 12s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] opacity-25" />

      <motion.header
        className="relative z-30 h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#0c1322]/90 backdrop-blur"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/baccarat" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="leading-tight min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Pato Studio</p>
            <h1 className="text-sm md:text-base font-black text-white/95 truncate">스피드 바카라</h1>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/55 uppercase tracking-[0.16em]">보유 포인트</div>
          <div className="font-black text-base md:text-lg text-[#fde68a]">₩{balance.toLocaleString('en-US')}</div>
        </div>
      </motion.header>

      <div className="relative z-20 border-b border-white/10 h-8 px-4 bg-black/50 backdrop-blur flex items-center gap-3 text-[10px] md:text-[11px] text-white/70 overflow-hidden">
        <span
          className="inline-flex h-5 min-w-16 items-center justify-center rounded-full border border-white/20 px-2 uppercase tracking-[0.18em] text-white/90 font-black"
          style={{ background: PHASE_GLOW[gameState], animation: 'casinoPulse 1.2s ease-in-out infinite', boxShadow: `0 0 0 0 ${PHASE_GLOW[gameState]}` }}
        >
          {PHASE_COPY[gameState]}
        </span>
        <span className="truncate">
          라운드 {tableId.slice(0, 4)} · {nickname ? `플레이어 ${nickname}` : ''}
        </span>
        <span className="ml-auto hidden md:block">상태: {gameState === 'betting' ? '베팅 집계중' : gameState === 'dealing' ? '딜링 진행중' : gameState === 'result' ? '승패 확정' : '대기'}</span>
      </div>

      <div className="absolute left-3 right-3 top-[56px] h-3 pointer-events-none z-30 overflow-hidden">
        <div className="relative h-full">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.42),transparent)] phase" />
          <style>{`.phase { animation: phaseSweep 3.8s linear infinite; }`}</style>
        </div>
      </div>

      <motion.main
        className="relative z-20 flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden px-3 py-2 gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <motion.div
          className="xl:flex-1 relative rounded-3xl border border-white/15 bg-black/45 backdrop-blur overflow-hidden min-h-0"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <BaccaratDealer
            gameState={gameState}
            timeRemaining={timeRemaining}
            playerCards={playerCards}
            bankerCards={bankerCards}
            playerScore={playerScore}
            bankerScore={bankerScore}
            revealedCards={revealedCards}
          />
        </motion.div>

        <motion.aside
          className="xl:w-[330px] 2xl:w-[400px] border border-white/15 bg-black/45 rounded-3xl overflow-hidden flex-shrink-0"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          {isDesktop ? (
            <div className="h-full">
              <BaccaratRoadmap history={history} gameState={gameState} />
            </div>
          ) : (
            <div className="h-48 border-b border-white/15">
              <BaccaratRoadmap history={history} gameState={gameState} />
            </div>
          )}
        </motion.aside>
      </motion.main>

      <motion.div
        className="relative z-30 border-t border-white/15 bg-black/60 backdrop-blur"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-2">
        <div className="hidden xl:flex items-center gap-2 justify-between text-[11px] text-white/60 pb-2">
            <div className="flex items-center gap-2">
              <CircleUserRound className="w-3.5 h-3.5" />
              <span>현재 베팅 라운드: {gameState === 'betting' ? timeRemaining : '-'}</span>
              <span className="text-white/40">|</span>
              {gameState === 'betting' ? <span>좌측/우측/타이/페어에 배팅 가능</span> : <span>라운드 전환 대기</span>}
            </div>
            <div className="flex items-center gap-2 text-right">
              <button onClick={() => setIsMuted((m) => !m)} className="rounded-lg border border-white/20 px-2 py-1 text-white/75 hover:text-white hover:border-white/40 transition">
                {isMuted ? <Music4 className="w-4 h-4" /> : <Music3 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsMuted((m) => !m)} className="rounded-lg border border-white/20 px-2 py-1 text-white/75 hover:text-white hover:border-white/40 transition">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <BaccaratBettingGrid
            gameState={gameState}
            myBets={myBets}
            selectedChip={selectedChip}
            setSelectedChip={setSelectedChip}
            placeBet={placeBet}
            clearBets={clearBets}
          />
        </div>
      </motion.div>
    </div>
  );
}
