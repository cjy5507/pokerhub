'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  History,
  BarChart3,
  Disc,
  X,
  Minus,
  Plus,
  Crown,
  Sparkles
} from 'lucide-react';
import { spinRoulette, getUserPoints } from '../actions';

interface SpinResult {
  multiplier: string;
  winAmount: number;
}

interface SpinHistory {
  bet: number;
  multiplier: string;
  win: number;
  time: string;
}

interface Stats {
  totalSpins: number;
  totalBet: number;
  totalWon: number;
}

const SEGMENTS = [
  { multiplier: '0x', color: 'rgba(239, 68, 68, 0.8)', borderColor: '#ef4444', label: '0x', weight: 40, deg: 0 },
  { multiplier: '0.5x', color: 'rgba(249, 115, 22, 0.8)', borderColor: '#f97316', label: '0.5x', weight: 20, deg: 60 },
  { multiplier: '1x', color: 'rgba(234, 179, 8, 0.8)', borderColor: '#eab308', label: '1x', weight: 20, deg: 120 },
  { multiplier: '2x', color: 'rgba(34, 197, 94, 0.8)', borderColor: '#22c55e', label: '2x', weight: 12, deg: 180 },
  { multiplier: '3x', color: 'rgba(59, 130, 246, 0.8)', borderColor: '#3b82f6', label: '3x', weight: 5, deg: 240 },
  { multiplier: '5x', color: 'rgba(139, 92, 246, 0.8)', borderColor: '#8b5cf6', label: '5x', weight: 3, deg: 300 },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length; // 60 degrees each

const BET_AMOUNTS = [50, 100, 200, 500];

function parseMultiplier(m: string): number {
  return parseFloat(m.replace('x', ''));
}

export default function RoulettePage() {
  const [currentPoints, setCurrentPoints] = useState(0);
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);
  const [betAmount, setBetAmount] = useState(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegree, setSpinDegree] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSpins: 0,
    totalBet: 0,
    totalWon: 0,
  });
  const [showResult, setShowResult] = useState(false);
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  const refreshBalance = useCallback(async () => {
    const result = await getUserPoints();
    if (result.success && result.points !== undefined) {
      setCurrentPoints(result.points);
    }
    setIsLoadingPoints(false);
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const handleSpin = async () => {
    if (isSpinning || currentPoints < betAmount) return;

    setIsSpinning(true);
    setResult(null);
    setShowResult(false);
    setWinningSegmentIndex(null);

    try {
      const serverResult = await spinRoulette(betAmount);

      if (!serverResult.success) {
        setErrorMessage(serverResult.error || '룰렛 실행에 실패했습니다');
        setIsSpinning(false);
        return;
      }
      setErrorMessage(null);

      const multiplier = serverResult.multiplier!;
      const winAmount = serverResult.winAmount!;

      // Force a tiny visual delay to ensure React commits the "isSpinning=true" and reset state before applying the final rotation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Find the matching segment for animation
      const segmentIndex = SEGMENTS.findIndex(s => s.multiplier === multiplier);
      const targetSegment = SEGMENTS[segmentIndex >= 0 ? segmentIndex : 0];

      // Calculate target rotation for animation
      const segmentOffset = Math.random() * (SEGMENT_ANGLE - 4) + 2; // random within segment
      const targetDeg = targetSegment.deg + segmentOffset;
      const finalRotation = spinDegree + 1440 + (360 - targetDeg);

      setSpinDegree(finalRotation);

      // After spin animation completes
      spinTimerRef.current = setTimeout(async () => {
        setIsSpinning(false);
        setResult({ multiplier, winAmount });
        setShowResult(true);
        if (segmentIndex >= 0) {
          setWinningSegmentIndex(segmentIndex);
        }

        // Refresh real balance from server
        await refreshBalance();

        // Update history
        const newEntry: SpinHistory = {
          bet: betAmount,
          multiplier,
          win: winAmount,
          time: new Date().toLocaleTimeString('ko-KR'),
        };
        setHistory(prev => [newEntry, ...prev].slice(0, 20));

        // Update stats
        setStats(prev => ({
          totalSpins: prev.totalSpins + 1,
          totalBet: prev.totalBet + betAmount,
          totalWon: prev.totalWon + winAmount,
        }));

        // Clear winning segment highlight after 2.5 seconds
        highlightTimerRef.current = setTimeout(() => setWinningSegmentIndex(null), 2500);
      }, 4000);
    } catch (error) {
      console.error('Roulette spin error:', error);
      setErrorMessage('룰렛 실행 중 서버 통신 에러가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsSpinning(false);
    }
  };

  const profit = stats.totalWon - stats.totalBet;

  const getResultIcon = (multiplier: string) => {
    const val = parseMultiplier(multiplier);
    if (val === 0) return <X className="w-10 h-10 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />;
    if (val <= 1) return <Minus className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />;
    if (val < 10) return <Plus className="w-10 h-10 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" />;
    return <Crown className="w-10 h-10 text-op-gold drop-shadow-[0_0_15px_rgba(201,162,39,0.9)] animate-pulse" />;
  };

  const getResultColor = (multiplier: string) => {
    const val = parseMultiplier(multiplier);
    if (val === 0) return 'from-red-950/80 to-red-900/40 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]';
    if (val <= 1) return 'from-yellow-950/80 to-yellow-900/40 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]';
    if (val < 10) return 'from-green-950/80 to-green-900/40 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]';
    return 'from-amber-950/90 to-amber-900/50 border-op-gold/80 shadow-[0_0_40px_rgba(201,162,39,0.4)]';
  };

  // Build conic gradient from SEGMENTS
  const conicGradient = SEGMENTS.map((seg, i) => {
    const start = i * SEGMENT_ANGLE;
    const end = (i + 1) * SEGMENT_ANGLE;
    return `${seg.color} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-op-text pb-20 lg:pb-0 px-4 py-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-op-gold/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-op-gold/40 to-op-gold-hover/10 rounded-2xl shadow-[0_0_20px_rgba(201,162,39,0.3)] backdrop-blur-md border border-op-gold/30">
            <Disc className="w-8 h-8 text-op-gold animate-[spin_10s_linear_infinite]" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white via-gray-200 to-gray-400 text-transparent bg-clip-text drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            포인트 룰렛
          </h1>
        </div>

        {/* Current Points - Glass Panel */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center max-w-sm mx-auto shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          <div className="text-sm font-medium text-white/50 mb-1 flex items-center justify-center gap-2">
            <Crown className="w-4 h-4 text-op-gold" />
            보유 포인트
          </div>
          <div className="text-4xl font-black text-op-gold drop-shadow-[0_0_15px_rgba(201,162,39,0.5)]">
            {isLoadingPoints ? '...' : `${currentPoints.toLocaleString()}P`}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6 lg:gap-8 relative z-10">
        {/* Left Column - Wheel */}
        <div className="space-y-6 flex flex-col items-center w-full">
          {/* Wheel Container - Premium Frame */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-6 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-[440px]">
            <div className="relative mx-auto aspect-square w-full">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-30 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                <div className="w-8 h-12 bg-gradient-to-b from-white to-gray-400 rounded-b-full shadow-inner border border-white/40 flex items-end justify-center pb-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]" />
                </div>
              </div>

              {/* Wheel Outer Frame */}
              <div className="absolute inset-[-10px] rounded-full bg-gradient-to-br from-gray-700 via-gray-900 to-black p-[10px] shadow-[inset_0_4px_20px_rgba(0,0,0,0.9),0_10px_30px_rgba(0,0,0,0.8)]">
                {/* Wheel Inner Content */}
                <div className="relative w-full h-full rounded-full overflow-hidden bg-black/50 border border-white/5">
                  <div
                    className={cn(
                      "relative w-full h-full rounded-full transition-transform duration-[4000ms]",
                      isSpinning ? "ease-[cubic-bezier(0.1,0.9,0.2,1)]" : "ease-out"
                    )}
                    style={{
                      transform: `rotate(${spinDegree}deg)`,
                      background: `conic-gradient(${conicGradient})`,
                      boxShadow: isSpinning ? '0 0 40px rgba(255,255,255,0.2)' : 'none'
                    }}
                  >
                    {/* Metallic Center Rim */}
                    <div className="absolute inset-0 rounded-full border-[8px] border-white/10 mix-blend-overlay pointer-events-none" />

                    {/* Segment Borders and Labels */}
                    {SEGMENTS.map((segment, index) => {
                      const rotation = segment.deg + SEGMENT_ANGLE / 2;
                      return (
                        <div key={`seg-${index}`} className="absolute w-full h-full pointer-events-none">
                          {/* Segment Separator line */}
                          <div
                            className="absolute left-1/2 top-0 w-[3px] h-1/2 bg-gradient-to-b from-white/40 via-white/10 to-transparent -translate-x-1/2 origin-bottom shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                            style={{ transform: `rotate(${segment.deg}deg)` }}
                          />

                          {/* Label Container */}
                          <div
                            className="absolute inset-0 flex items-start justify-center pt-8"
                            style={{ transform: `rotate(${rotation}deg)` }}
                          >
                            <span
                              className="text-white font-black text-xl sm:text-2xl"
                              style={{
                                textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
                                opacity: winningSegmentIndex !== null && winningSegmentIndex !== index ? 0.3 : 1,
                                transition: 'opacity 0.3s'
                              }}
                            >
                              {segment.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Winning Overlay Pulse */}
                    {winningSegmentIndex !== null && (
                      <div
                        className="absolute inset-0 rounded-full animate-pulse z-10 pointer-events-none"
                        style={{
                          background: `conic-gradient(
                            transparent ${SEGMENTS[winningSegmentIndex].deg}deg,
                            rgba(255, 255, 255, 0.4) ${SEGMENTS[winningSegmentIndex].deg}deg,
                            rgba(255, 255, 255, 0.4) ${SEGMENTS[winningSegmentIndex].deg + SEGMENT_ANGLE}deg,
                            transparent ${SEGMENTS[winningSegmentIndex].deg + SEGMENT_ANGLE}deg
                          )`,
                        }}
                      />
                    )}

                    {/* Detailed Center Hub */}
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-300 via-gray-500 to-gray-800 p-1 shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
                        <div className="w-full h-full rounded-full bg-[#111] border-2 border-gray-600 flex items-center justify-center shadow-inner">
                          <Disc className="w-10 h-10 text-op-gold/50" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls - Glass Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <CoinsIcon className="w-4 h-4 text-op-gold" />
                배팅 금액 선택
              </div>
              <div className="text-xs font-bold text-white/40 bg-black/40 px-3 py-1 rounded-full">
                현재: {betAmount.toLocaleString()}P
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              {BET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={isSpinning}
                  className={cn(
                    "py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 relative overflow-hidden group",
                    betAmount === amount
                      ? "bg-gradient-to-b from-op-gold to-op-gold-hover text-black shadow-[0_0_20px_rgba(201,162,39,0.5)] transform scale-[1.03]"
                      : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
                    isSpinning && "opacity-50 cursor-not-allowed transform-none"
                  )}
                >
                  {betAmount === amount && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  )}
                  <span className="relative z-10">{amount}</span>
                </button>
              ))}
            </div>

            {errorMessage && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex justify-center gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm text-red-400 font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Spin Button */}
            <button
              onClick={handleSpin}
              disabled={isSpinning || currentPoints < betAmount}
              className={cn(
                "w-full py-5 rounded-2xl font-black text-xl sm:text-2xl transition-all duration-300 relative overflow-hidden shadow-2xl group",
                isSpinning || currentPoints < betAmount
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                  : "bg-gradient-to-r from-[#d4af37] via-[#fff4cc] to-[#c9a227] text-black border border-op-gold/50 cursor-pointer shadow-[0_0_40px_rgba(201,162,39,0.4)]"
              )}
            >
              {!(isSpinning || currentPoints < betAmount) && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[200%] group-hover:animate-[shimmer_1.5s_infinite]" />
              )}

              <div className={cn(
                "relative z-10 flex items-center justify-center gap-2",
                !(isSpinning || currentPoints < betAmount) && "group-hover:scale-105 transition-transform duration-300"
              )}>
                {isSpinning ? (
                  <>
                    <Disc className="w-6 h-6 animate-spin" />
                    스핀 중...
                  </>
                ) : currentPoints < betAmount ? (
                  "포인트 부족"
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    행운 돌리기!
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Result Display Pop-up */}
          {showResult && result && (
            <div
              className={cn(
                "w-full bg-gradient-to-br rounded-[24px] p-6 border backdrop-blur-md animate-[slideUpFade_0.4s_ease-out]",
                getResultColor(result.multiplier)
              )}
            >
              <div className="flex items-center justify-center gap-6">
                <div className="p-4 bg-black/40 rounded-2xl backdrop-blur-xl border border-white/10">
                  {getResultIcon(result.multiplier)}
                </div>
                <div>
                  <div className="text-sm font-medium text-white/60 mb-1 uppercase tracking-wider">
                    {parseMultiplier(result.multiplier) > 1 ? 'Jackpot!' : 'Result'}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white drop-shadow-md">
                      {result.multiplier}
                    </span>
                    <span className={cn(
                      "text-2xl font-bold truncate",
                      parseMultiplier(result.multiplier) === 0
                        ? "text-red-400"
                        : parseMultiplier(result.multiplier) <= 1
                          ? "text-yellow-400"
                          : parseMultiplier(result.multiplier) < 10
                            ? "text-green-400"
                            : "text-op-gold drop-shadow-[0_0_10px_rgba(201,162,39,0.8)]"
                    )}>
                      {result.winAmount > 0 ? "+" : ""}{result.winAmount.toLocaleString()}P
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & History */}
        <div className="space-y-6 flex flex-col w-full h-full">
          {/* Statistics - Glass Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">내 통계</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard label="총 스핀" value={stats.totalSpins.toString()} />
              <StatCard label="총 배팅" value={`${stats.totalBet.toLocaleString()}`} valueColor="text-white" />
              <StatCard label="총 획득" value={`${stats.totalWon.toLocaleString()}`} valueColor="text-green-400" glowColor="rgba(74,222,128,0.2)" />

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-20">
                  {profit >= 0 ? <TrendingUp className="w-12 h-12 text-green-500" /> : <TrendingDown className="w-12 h-12 text-red-500" />}
                </div>
                <div className="text-sm text-white/50 mb-1 font-medium z-10">내 손익</div>
                <div className={cn(
                  "text-2xl font-black truncate z-10",
                  profit >= 0 ? "text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]" : "text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                )}>
                  {profit > 0 ? "+" : ""}{profit.toLocaleString()}P
                </div>
              </div>
            </div>
          </div>

          {/* History - Glass Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 shadow-xl flex-1 flex flex-col overflow-hidden max-h-[500px]">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30">
                <History className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">스핀 기록</h2>
              <div className="ml-auto text-xs font-medium text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                최근 20개
              </div>
            </div>

            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <History className="w-12 h-12 text-white/10 mb-3" />
                <p className="text-white/40 font-medium">아직 스핀 기록이 없습니다</p>
                <p className="text-xs text-white/30 mt-1">행운을 돌려 첫 기록을 남겨보세요!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {history.map((spin, index) => {
                  const profit = spin.win - spin.bet;
                  const isWin = profit > 0;
                  const isTie = profit === 0;

                  return (
                    <div
                      key={index}
                      className="bg-black/40 hover:bg-black/60 border border-white/5 rounded-xl p-4 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-bold text-white/30 bg-white/5 px-2 py-1 rounded-md min-w-[65px] text-center">
                          {spin.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/60">{spin.bet}P</span>
                          <X className="w-3 h-3 text-white/30" />
                          <span className={cn(
                            "font-black text-lg",
                            parseMultiplier(spin.multiplier) >= 2 ? "text-op-gold drop-shadow-[0_0_5px_rgba(201,162,39,0.5)]" : "text-white"
                          )}>{spin.multiplier}</span>
                        </div>
                      </div>
                      <div className={cn(
                        "font-black text-lg",
                        isWin ? "text-green-400" : isTie ? "text-yellow-400" : "text-red-400"
                      )}>
                        {isWin ? "+" : ""}{profit.toLocaleString()}P
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 text-center bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-4 relative z-10">
        <p className="text-xs md:text-sm text-white/40 font-medium">본 룰렛은 실제 금전적 가치가 없는 가상 포인트로만 운영됩니다.</p>
        <p className="text-[10px] md:text-xs text-white/30 mt-1">포인트는 현금으로 교환할 수 없으며, 서비스 내 활동에만 사용됩니다.</p>
      </div>
    </div>
  );
}

// Simple reusable icon for betting
function CoinsIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="M16.71 13.88.94" />
    </svg>
  );
}

// Reusable stat card for the stats section
function StatCard({ label, value, valueColor = "text-white", glowColor }: { label: string, value: string, valueColor?: string, glowColor?: string }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-center transition-all hover:bg-black/50">
      <div className="text-sm text-white/50 mb-1 font-medium">{label}</div>
      <div
        className={cn("text-2xl font-black truncate", valueColor)}
        style={glowColor ? { textShadow: `0 0 15px ${glowColor}` } : {}}
      >
        {value}
      </div>
    </div>
  );
}
