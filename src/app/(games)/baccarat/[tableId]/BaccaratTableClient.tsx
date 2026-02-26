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

const LOADING_STYLE = 'w-full flex-1 min-h-[calc(100dvh-80px)] md:min-h-0 md:h-[calc(100vh-120px)] bg-slate-50 dark:bg-[#1a1c20] rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-2xl transition-colors';
const TABLE_STYLE = 'w-full flex-1 min-h-[calc(100dvh-80px)] md:min-h-0 md:h-[calc(100vh-120px)] bg-slate-50 dark:bg-[#1a1c20] rounded-xl flex flex-col overflow-hidden select-none relative font-sans text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl transition-colors';
const BG_GRID_STYLE = { backgroundSize: '40px 40px' } as const;

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
      {/* Backgrounds */}
      <div className="absolute inset-0 pointer-events-none transition-colors bg-[radial-gradient(circle_at_50%_0%,#f1f5f9_0%,#e2e8f0_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,#374151_0%,#1a1c20_60%)] opacity-80" />
      <div
        className="absolute inset-0 opacity-100 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)]"
        style={BG_GRID_STYLE}
      />

      {/* Header */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 z-30 border-b border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/poker" className="text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors p-2 rounded-md bg-slate-200/50 hover:bg-slate-300/50 dark:bg-white/5 dark:hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm md:text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white/90">
              PATO 스피드 바카라 <span className="text-yellow-600 dark:text-yellow-500 font-mono italic text-xs ml-1">v2.0</span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-white/40">[{tableId.slice(0, 4)}] 회차 진행중</p>
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
