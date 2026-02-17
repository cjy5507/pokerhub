'use client';

import { useState } from 'react';
import { Ticket, Star, Crown, Zap, Trophy, X, TrendingUp, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

// Prize tiers configuration with improved probability distribution
const PRIZE_TIERS = [
  { id: 'first', name: '1등', prize: 10000, probability: 0.05, color: 'from-red-500 to-yellow-500', glow: 'shadow-red-500/50', icon: Crown },
  { id: 'second', name: '2등', prize: 3000, probability: 0.3, color: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/50', icon: Star },
  { id: 'third', name: '3등', prize: 500, probability: 3, color: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/50', icon: Zap },
  { id: 'fourth', name: '4등', prize: 200, probability: 12, color: 'from-green-500 to-emerald-500', glow: 'shadow-green-500/50', icon: Trophy },
  { id: 'fifth', name: '5등', prize: 100, probability: 30, color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/50', icon: Gift },
  { id: 'none', name: '꽝', prize: 0, probability: 54.65, color: 'from-gray-600 to-gray-700', glow: 'shadow-gray-500/30', icon: X },
] as const;

type TierType = typeof PRIZE_TIERS[number]['id'];

interface LotteryTicket {
  id: string;
  tier: TierType;
  prizeAmount: number;
  timestamp?: Date;
}

// Mock function - will be replaced with server action
async function buyLotteryTicket(): Promise<{
  success: boolean;
  ticket?: LotteryTicket;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const roll = Math.random() * 100;
  let tier: TierType;
  let prizeAmount: number;

  if (roll < 0.05) { tier = 'first'; prizeAmount = 10000; }
  else if (roll < 0.35) { tier = 'second'; prizeAmount = 3000; }
  else if (roll < 3.35) { tier = 'third'; prizeAmount = 500; }
  else if (roll < 15.35) { tier = 'fourth'; prizeAmount = 200; }
  else if (roll < 45.35) { tier = 'fifth'; prizeAmount = 100; }
  else { tier = 'none'; prizeAmount = 0; }

  return {
    success: true,
    ticket: {
      id: crypto.randomUUID(),
      tier,
      prizeAmount,
      timestamp: new Date()
    }
  };
}

// Mock data with Korean names
const MOCK_WINNERS = [
  { nickname: '김민수', tier: 'first' as const, prize: 10000, time: '2분 전' },
  { nickname: '박지영', tier: 'third' as const, prize: 500, time: '5분 전' },
  { nickname: '이준호', tier: 'second' as const, prize: 3000, time: '12분 전' },
  { nickname: '최수진', tier: 'fifth' as const, prize: 100, time: '23분 전' },
  { nickname: '정태웅', tier: 'fourth' as const, prize: 200, time: '34분 전' },
  { nickname: '강서연', tier: 'first' as const, prize: 10000, time: '1시간 전' },
  { nickname: '윤재현', tier: 'third' as const, prize: 500, time: '1시간 전' },
  { nickname: '한유진', tier: 'second' as const, prize: 3000, time: '2시간 전' },
];

export default function LotteryPage() {
  const [userPoints, setUserPoints] = useState(1250);
  const [currentTicket, setCurrentTicket] = useState<LotteryTicket | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [history, setHistory] = useState<LotteryTicket[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const TICKET_COST = 100;
  const DAILY_LIMIT = 10;

  const handleBuyTicket = async () => {
    if (userPoints < TICKET_COST) {
      alert('포인트가 부족합니다!');
      return;
    }
    if (todayCount >= DAILY_LIMIT) {
      alert('오늘의 구매 한도를 초과했습니다!');
      return;
    }

    setIsPurchasing(true);
    const result = await buyLotteryTicket();
    setIsPurchasing(false);

    if (result.success && result.ticket) {
      setUserPoints(prev => prev - TICKET_COST);
      setCurrentTicket(result.ticket);
      setIsRevealed(false);
      setTodayCount(prev => prev + 1);
    } else {
      alert(result.error || '복권 구매에 실패했습니다');
    }
  };

  const handleFlip = () => {
    if (!currentTicket || isFlipping || isRevealed) return;

    setIsFlipping(true);

    // Card flip animation duration
    setTimeout(() => {
      setIsFlipping(false);
      setIsRevealed(true);

      // Add to history
      setHistory(prev => [currentTicket, ...prev].slice(0, 10));

      // Update points if won
      if (currentTicket.prizeAmount > 0) {
        setUserPoints(prev => prev + currentTicket.prizeAmount);
      }
    }, 800);
  };

  const handleReset = () => {
    setCurrentTicket(null);
    setIsRevealed(false);
    setIsFlipping(false);
  };

  const getTierInfo = (tier: TierType) => {
    return PRIZE_TIERS.find(t => t.id === tier)!;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0] pb-20">
      {/* Header */}
      <div className="border-b border-[#333] bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-[#c9a227] to-[#8b7520] rounded-xl shadow-lg shadow-[#c9a227]/20">
              <Ticket size={28} className="text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#e0e0e0]">복권</h1>
              <p className="text-sm text-[#a0a0a0]">운을 시험해보세요</p>
            </div>
          </div>

          {/* Points Display */}
          <div className="p-4 bg-[#1e1e1e] border border-[#333] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="text-[#c9a227]" size={20} />
              <span className="text-[#a0a0a0]">보유 포인트</span>
            </div>
            <span className="text-2xl font-bold text-[#c9a227]">{userPoints.toLocaleString()}P</span>
          </div>

          {/* Daily Limit */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-[#a0a0a0]">오늘의 구매</span>
            <span className={cn(
              "font-medium",
              todayCount >= DAILY_LIMIT ? "text-red-400" : "text-[#c9a227]"
            )}>
              {todayCount} / {DAILY_LIMIT}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Card Flip Area */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#e0e0e0]">
            <Gift className="text-[#c9a227]" size={24} />
            복권 카드
          </h2>

          {!currentTicket ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-80 h-96 rounded-2xl bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] border-2 border-dashed border-[#444] flex items-center justify-center mb-6">
                <div className="text-center">
                  <Ticket size={64} className="text-[#444] mx-auto mb-4" />
                  <p className="text-[#a0a0a0]">복권을 구매하세요</p>
                </div>
              </div>
              <button
                onClick={handleBuyTicket}
                disabled={isPurchasing || userPoints < TICKET_COST || todayCount >= DAILY_LIMIT}
                className={cn(
                  "px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95",
                  "bg-gradient-to-r from-[#c9a227] to-[#8b7520] text-black shadow-lg shadow-[#c9a227]/30",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                )}
              >
                {isPurchasing ? '구매 중...' : `복권 구매 (${TICKET_COST}P)`}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="card-container" style={{ perspective: '1000px' }}>
                <div
                  className={cn(
                    "card-flip w-80 h-96 relative cursor-pointer",
                    isRevealed && "flipped"
                  )}
                  onClick={handleFlip}
                  style={{
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.8s',
                    transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* Card Back (Hidden state) */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden border-4 border-[#c9a227] shadow-2xl"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(0deg)',
                      background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 50%, #2a2a2a 100%)',
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative mb-4">
                          <Star size={80} className="text-[#c9a227] mx-auto animate-pulse" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 bg-[#c9a227]/20 rounded-full blur-xl animate-pulse" />
                          </div>
                        </div>
                        <p className="text-2xl font-black text-[#c9a227] tracking-wider">클릭하여 공개</p>
                        <p className="text-sm text-[#a0a0a0] mt-2">카드를 뒤집어보세요</p>
                      </div>
                    </div>
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="grid grid-cols-4 h-full">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className="border border-[#c9a227]/30" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Front (Revealed state) */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-500",
                      "bg-gradient-to-br border-4 shadow-2xl",
                      getTierInfo(currentTicket.tier).color,
                      isRevealed && getTierInfo(currentTicket.tier).glow,
                      currentTicket.tier === 'none' && "border-gray-500",
                      currentTicket.tier !== 'none' && "border-white glow-burst"
                    )}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="text-center relative z-10">
                      {currentTicket.tier !== 'none' ? (
                        <>
                          {(() => {
                            const TierIcon = getTierInfo(currentTicket.tier).icon;
                            return <TierIcon size={80} className="text-white mx-auto mb-4 drop-shadow-2xl animate-bounce-slow" />;
                          })()}
                          <p className="text-4xl font-black text-white mb-2 drop-shadow-lg">{getTierInfo(currentTicket.tier).name}</p>
                          <p className="text-6xl font-black text-white drop-shadow-lg">{currentTicket.prizeAmount.toLocaleString()}P</p>
                          <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                            <p className="text-sm text-white font-medium">당첨을 축하합니다!</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <X size={80} className="text-white mx-auto mb-4 drop-shadow-2xl" />
                          <p className="text-5xl font-black text-white drop-shadow-lg">꽝</p>
                          <p className="text-lg text-white/80 mt-4">다음 기회에...</p>
                        </>
                      )}
                    </div>
                    {/* Radial glow effect for winning tiers */}
                    {currentTicket.tier !== 'none' && isRevealed && (
                      <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent animate-pulse-slow" />
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                {isRevealed && (
                  <button
                    onClick={handleReset}
                    className="px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-r from-[#c9a227] to-[#8b7520] text-black shadow-lg shadow-[#c9a227]/30"
                  >
                    다시 구매하기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prize Tiers with visual probability bars */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#e0e0e0]">
            <TrendingUp className="text-[#c9a227]" size={24} />
            당첨 확률
          </h2>
          <div className="space-y-3">
            {PRIZE_TIERS.map((tier) => {
              const TierIcon = tier.icon;
              return (
                <div key={tier.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TierIcon size={20} className="text-[#c9a227]" />
                      <span className="font-bold text-[#e0e0e0]">{tier.name}</span>
                      <span className="text-2xl font-black text-[#c9a227]">
                        {tier.prize > 0 ? `${tier.prize.toLocaleString()}P` : '0P'}
                      </span>
                    </div>
                    <span className="text-sm text-[#a0a0a0] font-medium">{tier.probability}%</span>
                  </div>
                  <div className="h-3 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className={cn("h-full bg-gradient-to-r", tier.color, "transition-all duration-500")}
                      style={{ width: `${Math.min(tier.probability * 2, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[#333]">
            <p className="text-sm text-[#a0a0a0]">기댓값: 약 83P (승률: ~45%)</p>
          </div>
        </div>

        {/* Recent Winners */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#e0e0e0]">
            <Trophy className="text-[#c9a227]" size={24} />
            최근 당첨자
          </h2>
          <div className="space-y-2">
            {MOCK_WINNERS.map((winner, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[#2a2a2a] hover:bg-[#333] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    winner.tier === 'first' && "bg-red-500",
                    winner.tier === 'second' && "bg-purple-500",
                    winner.tier === 'third' && "bg-blue-500",
                    winner.tier === 'fourth' && "bg-green-500",
                    winner.tier === 'fifth' && "bg-amber-500"
                  )} />
                  <span className="font-medium text-[#e0e0e0]">{winner.nickname}</span>
                  <span className="text-sm text-[#a0a0a0]">{getTierInfo(winner.tier).name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#c9a227]">{winner.prize.toLocaleString()}P</span>
                  <span className="text-xs text-[#a0a0a0]">{winner.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My History */}
        {history.length > 0 && (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#e0e0e0]">
              <Ticket className="text-[#c9a227]" size={24} />
              내 복권 기록
            </h2>
            <div className="space-y-2">
              {history.map((ticket, idx) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#2a2a2a]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#a0a0a0]">#{history.length - idx}</span>
                    <span className="font-medium text-[#e0e0e0]">{getTierInfo(ticket.tier).name}</span>
                  </div>
                  <span className={cn(
                    "font-bold",
                    ticket.prizeAmount > 0 ? "text-[#c9a227]" : "text-[#a0a0a0]"
                  )}>
                    {ticket.prizeAmount > 0 ? `+${ticket.prizeAmount.toLocaleString()}P` : '꽝'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @keyframes glow-burst {
          0% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 60px rgba(255, 255, 255, 0.8), 0 0 100px rgba(255, 255, 255, 0.4);
          }
          100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .glow-burst {
          animation: glow-burst 2s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
