'use client';

import { ArrowLeft, Volume2, VolumeX, Info } from 'lucide-react';
import Link from 'next/link';
import { useBaccaratGame } from './useBaccaratGame';
import { BaccaratDealer } from './components/BaccaratDealer';
import { BaccaratBettingGrid } from './components/BaccaratBettingGrid';
import { BaccaratRoadmap } from './components/BaccaratRoadmap';

interface BaccaratTableClientProps {
  tableId: string;
  userId: string | null;
  nickname: string | null;
  initialBalance?: number;
}

const LOADING_STYLE = 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#1a1c20] flex items-center justify-center';
const TABLE_STYLE = 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#1a1c20] flex flex-col overflow-hidden select-none relative font-sans text-slate-900 dark:text-white';
const BG_GRID_STYLE = { backgroundSize: '40px 40px' } as const;
const BACCARAT_STAGE_CSS = `
@keyframes casinoLightSweep {
  0% { transform: translateX(-14%); opacity: 0.2; }
  50% { transform: translateX(10%); opacity: 0.42; }
  100% { transform: translateX(-14%); opacity: 0.2; }
}
@keyframes liveTickerPulse {
  0% { opacity: 0.35; }
  100% { opacity: 1; }
}
`;

export function BaccaratTableClient({ tableId, userId, nickname, initialBalance }: BaccaratTableClientProps) {
  const {
    gameState, timeRemaining, isMuted, setIsMuted,
    selectedChip, setSelectedChip, balance, myBets, history,
    playerCards, bankerCards, playerScore, bankerScore,
    revealedCards, isMounted, isDesktop, placeBet, clearBets,
  } = useBaccaratGame(tableId, userId, initialBalance);

  if (!isMounted) {
    return (
      <div className={LOADING_STYLE}>
        <div className="animate-pulse text-slate-500 dark:text-white/50 text-sm font-bold tracking-widest">LOADING TABLE...</div>
      </div>
    );
  }

  return (
    <div className={TABLE_STYLE}>
      <style dangerouslySetInnerHTML={{ __html: BACCARAT_STAGE_CSS }} />
      {/* Backgrounds */}
      <div className="absolute inset-0 pointer-events-none transition-colors bg-[radial-gradient(circle_at_50%_0%,#ecfdf5_0%,#d1fae5_45%,#bbf7d0_100%)] dark:bg-[radial-gradient(circle_at_50%_0%,#064e3b_0%,#022c22_45%,#020617_100%)] opacity-85" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 14% 18%, rgba(52,211,153,0.26), transparent 38%), radial-gradient(circle at 86% 16%, rgba(251,191,36,0.2), transparent 34%)',
          animation: 'casinoLightSweep 12s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0 opacity-100 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)]"
        style={BG_GRID_STYLE}
      />

      {/* Header */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 z-30 border-b border-emerald-500/25 dark:border-emerald-300/20 bg-white/75 dark:bg-black/45 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/poker" className="text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors p-2 rounded-md bg-slate-200/50 hover:bg-slate-300/50 dark:bg-white/5 dark:hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm md:text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white/90">
              PATO 스피드 바카라 <span className="text-yellow-600 dark:text-yellow-500 font-mono italic text-xs ml-1">v2.0</span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-white/40">
              [{tableId.slice(0, 4)}] 회차 진행중{nickname ? ` · ${nickname}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">보유 포인트</span>
            <span className="text-sm md:text-base font-black text-yellow-600 dark:text-yellow-500 tabular-nums">₩{balance.toLocaleString('en-US')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10">
              <Info className="w-5 h-5" />
            </button>
            <button onClick={() => setIsMuted(m => !m)} className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-30 h-7 border-b border-emerald-500/20 bg-emerald-100/70 dark:bg-emerald-950/35 backdrop-blur-md px-4">
        <div className="h-full flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-800 dark:text-emerald-100">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live Table
          <span className="text-emerald-700/80 dark:text-emerald-100/70 tracking-[0.12em]" style={{ animation: 'liveTickerPulse 0.85s ease-in-out infinite alternate' }}>
            {gameState === 'betting' ? '베팅 집계 중' : gameState === 'dealing' ? '딜링 진행 중' : gameState === 'result' ? '결과 정산 중' : '라운드 준비 중'}
          </span>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col xl:flex-row relative min-h-0 z-10 w-full">
        {isDesktop && (
          <div className="hidden xl:flex w-[320px] 2xl:w-[400px] border-r border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-black/40 flex-col">
            <BaccaratRoadmap history={history} gameState={gameState} />
          </div>
        )}
        <div className="flex-1 flex flex-col relative w-full h-full pb-4">
          <BaccaratDealer
            gameState={gameState}
            timeRemaining={timeRemaining}
            playerCards={playerCards}
            bankerCards={bankerCards}
            playerScore={playerScore}
            bankerScore={bankerScore}
            revealedCards={revealedCards}
          />
        </div>
        {!isDesktop && (
          <div className="flex xl:hidden w-full border-b border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-black/40">
            <BaccaratRoadmap history={history} gameState={gameState} />
          </div>
        )}
      </div>

      {/* Betting grid */}
      <BaccaratBettingGrid
        gameState={gameState}
        myBets={myBets}
        selectedChip={selectedChip}
        setSelectedChip={setSelectedChip}
        placeBet={placeBet}
        clearBets={clearBets}
      />
    </div>
  );
}
