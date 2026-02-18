'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Crown
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
  { multiplier: '0x', color: '#ef4444', label: '0x', weight: 20, deg: 0 },
  { multiplier: '1x', color: '#eab308', label: '1x', weight: 30, deg: 60 },
  { multiplier: '2x', color: '#22c55e', label: '2x', weight: 25, deg: 120 },
  { multiplier: '5x', color: '#3b82f6', label: '5x', weight: 15, deg: 180 },
  { multiplier: '10x', color: '#8b5cf6', label: '10x', weight: 7, deg: 240 },
  { multiplier: '50x', color: '#c9a227', label: '50x', weight: 3, deg: 300 },
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
        alert(serverResult.error || '룰렛 실행에 실패했습니다');
        setIsSpinning(false);
        return;
      }

      const multiplier = serverResult.multiplier!;
      const winAmount = serverResult.winAmount!;

      // Find the matching segment for animation
      const segmentIndex = SEGMENTS.findIndex(s => s.multiplier === multiplier);
      const targetSegment = SEGMENTS[segmentIndex >= 0 ? segmentIndex : 0];

      // Calculate target rotation for animation
      const segmentOffset = Math.random() * (SEGMENT_ANGLE - 4) + 2; // random within segment
      const targetDeg = targetSegment.deg + segmentOffset;
      const finalRotation = spinDegree + 1440 + (360 - targetDeg);

      setSpinDegree(finalRotation);

      // After spin animation completes
      setTimeout(async () => {
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

        // Clear winning segment highlight after 2 seconds
        setTimeout(() => setWinningSegmentIndex(null), 2000);
      }, 4000);
    } catch {
      alert('룰렛 실행에 실패했습니다. 다시 시도해주세요.');
      setIsSpinning(false);
    }
  };

  const profit = stats.totalWon - stats.totalBet;

  const getResultIcon = (multiplier: string) => {
    const val = parseMultiplier(multiplier);
    if (val === 0) return <X className="w-8 h-8 text-red-400" />;
    if (val <= 1) return <Minus className="w-8 h-8 text-yellow-400" />;
    if (val < 10) return <Plus className="w-8 h-8 text-green-400" />;
    return <Crown className="w-8 h-8 text-ph-gold" />;
  };

  const getResultColor = (multiplier: string) => {
    const val = parseMultiplier(multiplier);
    if (val === 0) return 'from-red-900/50 to-red-800/50 border-red-400';
    if (val <= 1) return 'from-yellow-900/50 to-yellow-800/50 border-yellow-400';
    if (val < 10) return 'from-green-900/50 to-green-800/50 border-green-400';
    return 'from-amber-900/50 to-amber-800/50 border-ph-gold';
  };

  // Build conic gradient from SEGMENTS
  const conicGradient = SEGMENTS.map((seg, i) => {
    const start = i * SEGMENT_ANGLE;
    const end = (i + 1) * SEGMENT_ANGLE;
    return `${seg.color} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="min-h-screen bg-ph-bg text-ph-text pb-20 px-4 py-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Disc className="w-8 h-8 text-ph-gold" />
          <h1 className="text-3xl font-bold">포인트 룰렛</h1>
        </div>

        {/* Current Points */}
        <div className="bg-ph-surface border border-ph-border rounded-xl p-4 text-center">
          <div className="text-sm text-ph-text-secondary mb-1">보유 포인트</div>
          <div className="text-3xl font-bold text-ph-gold">{isLoadingPoints ? '...' : `${currentPoints.toLocaleString()}P`}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
        {/* Left Column - Wheel */}
        <div className="space-y-6">
          {/* Wheel Container */}
          <div className="bg-ph-surface border border-ph-border rounded-xl p-8">
            <div className="relative mx-auto" style={{ width: '320px', height: '320px' }}>
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div
                  className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-ph-gold"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(201,162,39,0.5))' }}
                />
              </div>

              {/* Wheel */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "relative w-[300px] h-[300px] rounded-full shadow-[0_0_30px_rgba(201,162,39,0.3)] border-4 border-ph-gold/30",
                    isSpinning && "shadow-[0_0_50px_rgba(201,162,39,0.6)] transition-transform duration-[4000ms] ease-out"
                  )}
                  style={{
                    transform: `rotate(${spinDegree}deg)`,
                    background: `conic-gradient(${conicGradient})`,
                  }}
                >
                  {/* Segment Borders */}
                  {SEGMENTS.map((segment, index) => (
                    <div
                      key={`border-${index}`}
                      className="absolute w-full h-full"
                      style={{
                        transform: `rotate(${segment.deg}deg)`,
                      }}
                    >
                      <div className="absolute left-1/2 top-0 w-[2px] h-full bg-black/20" />
                    </div>
                  ))}

                  {/* Winning Segment Pulse */}
                  {winningSegmentIndex !== null && (
                    <div
                      className="absolute inset-0 rounded-full animate-pulse"
                      style={{
                        background: `conic-gradient(
                          transparent 0deg,
                          transparent ${SEGMENTS[winningSegmentIndex].deg}deg,
                          rgba(255,255,255,0.3) ${SEGMENTS[winningSegmentIndex].deg}deg,
                          rgba(255,255,255,0.3) ${SEGMENTS[winningSegmentIndex].deg + SEGMENT_ANGLE}deg,
                          transparent ${SEGMENTS[winningSegmentIndex].deg + SEGMENT_ANGLE}deg,
                          transparent 360deg
                        )`,
                      }}
                    />
                  )}

                  {/* Center Circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-ph-surface border-4 border-white shadow-lg" />
                  </div>

                  {/* Segment Labels */}
                  {SEGMENTS.map((segment, index) => (
                    <div
                      key={index}
                      className="absolute w-full h-full flex items-center justify-center text-white font-bold text-lg pointer-events-none"
                      style={{
                        transform: `rotate(${segment.deg + SEGMENT_ANGLE / 2}deg)`,
                      }}
                    >
                      <div
                        className="absolute"
                        style={{
                          top: '50px',
                          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                        }}
                      >
                        {segment.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bet Selection */}
          <div className="bg-ph-surface border border-ph-border rounded-xl p-6">
            <div className="text-sm text-ph-text-secondary mb-3">배팅 금액 선택</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {BET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={isSpinning}
                  className={cn(
                    "py-3 rounded-lg font-semibold transition-all",
                    betAmount === amount
                      ? "bg-ph-gold text-black shadow-[0_0_20px_rgba(201,162,39,0.4)]"
                      : "bg-ph-elevated text-ph-text hover:bg-ph-elevated",
                    isSpinning && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {amount}P
                </button>
              ))}
            </div>

            {/* Spin Button */}
            <button
              onClick={handleSpin}
              disabled={isSpinning || currentPoints < betAmount}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-xl transition-all",
                isSpinning || currentPoints < betAmount
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-ph-gold to-ph-gold-hover text-black hover:shadow-[0_0_30px_rgba(201,162,39,0.5)] hover:scale-[1.02]"
              )}
            >
              {isSpinning ? "스핀 중..." : currentPoints < betAmount ? "포인트 부족" : "SPIN"}
            </button>
          </div>

          {/* Result Display */}
          {showResult && result && (
            <div
              className={cn(
                "bg-gradient-to-br rounded-xl p-6 border-2",
                getResultColor(result.multiplier)
              )}
            >
              <div className="flex items-center justify-center gap-4">
                {getResultIcon(result.multiplier)}
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">{result.multiplier}</div>
                  <div className={cn(
                    "text-3xl font-bold",
                    parseMultiplier(result.multiplier) === 0
                      ? "text-red-400"
                      : parseMultiplier(result.multiplier) <= 1
                      ? "text-yellow-400"
                      : parseMultiplier(result.multiplier) < 10
                      ? "text-green-400"
                      : "text-ph-gold"
                  )}>
                    {result.winAmount > 0 ? "+" : ""}{result.winAmount.toLocaleString()}P
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & History */}
        <div className="space-y-6">
          {/* Statistics */}
          <div className="bg-ph-surface border border-ph-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-ph-gold" />
              <h2 className="text-lg font-bold">통계</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ph-elevated rounded-lg p-4">
                <div className="text-sm text-ph-text-secondary mb-1">총 스핀</div>
                <div className="text-2xl font-bold">{stats.totalSpins}</div>
              </div>

              <div className="bg-ph-elevated rounded-lg p-4">
                <div className="text-sm text-ph-text-secondary mb-1">총 배팅</div>
                <div className="text-2xl font-bold text-red-400">{stats.totalBet.toLocaleString()}P</div>
              </div>

              <div className="bg-ph-elevated rounded-lg p-4">
                <div className="text-sm text-ph-text-secondary mb-1">총 획득</div>
                <div className="text-2xl font-bold text-green-400">{stats.totalWon.toLocaleString()}P</div>
              </div>

              <div className="bg-ph-elevated rounded-lg p-4">
                <div className="text-sm text-ph-text-secondary mb-1 flex items-center gap-1">
                  {profit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  손익
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  profit >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {profit >= 0 ? "+" : ""}{profit.toLocaleString()}P
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-ph-surface border border-ph-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-ph-gold" />
              <h2 className="text-lg font-bold">최근 기록</h2>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-ph-text-secondary">
                아직 스핀 기록이 없습니다
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.map((spin, index) => (
                  <div
                    key={index}
                    className="bg-ph-elevated rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-ph-text-secondary">{spin.time}</div>
                      <div className="text-sm">
                        <span className="text-ph-text-secondary">{spin.bet}P</span>
                        <span className="mx-2 text-ph-text-muted">x</span>
                        <span className="font-bold">{spin.multiplier}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "font-bold",
                      spin.win > spin.bet ? "text-green-400" : spin.win === spin.bet ? "text-yellow-400" : "text-red-400"
                    )}>
                      {spin.win > spin.bet ? "+" : ""}{(spin.win - spin.bet).toLocaleString()}P
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
