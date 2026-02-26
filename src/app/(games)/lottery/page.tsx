'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, Star, Crown, Zap, Trophy, X, TrendingUp, Gift, Sparkles, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buyLotteryTicket, getUserPoints } from '../actions';

// Prize tiers configuration matching server-side tiers
const PRIZE_TIERS = [
  { id: 'first', name: '1등', prize: 5000, probability: 0.5, color: 'from-[#FFD700] via-[#FDB931] to-[#9F7928]', glow: 'shadow-[#FFD700]/60', icon: Crown },
  { id: 'second', name: '2등', prize: 500, probability: 3, color: 'from-[#E2E2E2] via-[#C9D6FF] to-[#9CA3AF]', glow: 'shadow-[#C9D6FF]/60', icon: Star },
  { id: 'third', name: '3등', prize: 200, probability: 8, color: 'from-[#CD7F32] via-[#F8B175] to-[#8C5013]', glow: 'shadow-[#CD7F32]/60', icon: Zap },
  { id: 'fourth', name: '4등', prize: 100, probability: 20, color: 'from-emerald-400 via-teal-500 to-green-600', glow: 'shadow-emerald-500/60', icon: Trophy },
  { id: 'none', name: '꽝', prize: 0, probability: 68.5, color: 'from-gray-600 via-gray-700 to-gray-900', glow: 'shadow-gray-900/40', icon: X },
] as const;

type TierType = typeof PRIZE_TIERS[number]['id'];

interface LotteryTicket {
  id: string;
  tier: TierType;
  prizeAmount: number;
}

const MOCK_WINNERS: { tier: TierType; nickname: string; prize: number; time: string }[] = [
  { tier: 'first', nickname: '포커왕', prize: 5000, time: '2분 전' },
  { tier: 'second', nickname: '에이스', prize: 500, time: '15분 전' },
  { tier: 'third', nickname: '행운아', prize: 200, time: '1시간 전' },
  { tier: 'fourth', nickname: '럭키가이', prize: 100, time: '2시간 전' },
];

export default function LotteryPage() {
  const [userPoints, setUserPoints] = useState(0);
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);
  const [currentTicket, setCurrentTicket] = useState<LotteryTicket | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [history, setHistory] = useState<LotteryTicket[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
  }, []);

  const refreshBalance = useCallback(async () => {
    const result = await getUserPoints();
    if (result.success && result.points !== undefined) {
      setUserPoints(result.points);
    }
    setIsLoadingPoints(false);
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const TICKET_COST = 100;
  const DAILY_LIMIT = 5;

  const handleBuyTicket = async () => {
    if (userPoints < TICKET_COST) {
      setErrorMessage('포인트가 부족합니다!');
      return;
    }
    if (todayCount >= DAILY_LIMIT) {
      setErrorMessage('오늘의 구매 한도를 초과했습니다!');
      return;
    }

    setErrorMessage(null);
    setIsPurchasing(true);
    try {
      const result = await buyLotteryTicket();

      if (result.success && result.ticket) {
        // Refresh real balance from server
        await refreshBalance();
        setCurrentTicket({
          id: String(result.ticket.id),
          tier: result.ticket.tier as TierType,
          prizeAmount: result.ticket.prizeAmount,
        });
        setIsRevealed(false);
        setTodayCount(prev => prev + 1);
      } else {
        setErrorMessage(result.error || '복권 구매에 실패했습니다');
      }
    } catch {
      setErrorMessage('복권 구매에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleFlip = () => {
    if (!currentTicket || isFlipping || isRevealed) return;

    setIsFlipping(true);

    // Card flip animation duration
    flipTimerRef.current = setTimeout(() => {
      setIsFlipping(false);
      setIsRevealed(true);

      // Add to history
      setHistory(prev => [currentTicket, ...prev].slice(0, 10));
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-op-text pb-20 lg:pb-0 relative overflow-hidden transition-colors">
      {/* Background ambient glow matching roulette */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 dark:bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-op-gold/5 dark:bg-op-gold/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-white/5 backdrop-blur-xl relative z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-op-gold/40 to-op-gold-hover/10 rounded-2xl shadow-[0_0_20px_rgba(201,162,39,0.3)] backdrop-blur-md border border-op-gold/30">
              <Ticket size={32} className="text-op-gold" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-gray-200 dark:to-gray-400 text-transparent bg-clip-text drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                프리미엄 복권
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-white/50 tracking-wide mt-1">오늘의 행운을 긁어보세요</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Points Display */}
            <div className="flex-1 p-4 sm:p-5 bg-white/80 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-between relative overflow-hidden group transition-colors">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
              <div className="flex items-center gap-2 relative z-10">
                <Crown className="text-op-gold w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-white/50">보유 포인트</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-op-gold drop-shadow-[0_0_15px_rgba(201,162,39,0.5)] relative z-10">
                {isLoadingPoints ? '...' : `${userPoints.toLocaleString()}P`}
              </span>
            </div>

            {/* Daily Limit */}
            <div className="sm:w-64 p-4 sm:p-5 bg-white/80 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl flex flex-col justify-center transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-white/50">오늘의 구매 한도</span>
                <span className={cn(
                  "font-black text-lg",
                  todayCount >= DAILY_LIMIT ? "text-red-400" : "text-op-gold"
                )}>
                  {todayCount} / {DAILY_LIMIT}
                </span>
              </div>
              <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    todayCount >= DAILY_LIMIT ? "bg-red-500" : "bg-gradient-to-r from-op-gold to-[#fff4cc]"
                  )}
                  style={{ width: `${(todayCount / DAILY_LIMIT) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 lg:space-y-8 relative z-10">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">

          {/* Card Flip Area - Takes up 3 cols on desktop */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] sm:rounded-[32px] p-4 sm:p-10 shadow-2xl relative overflow-hidden min-h-[400px] sm:min-h-[500px] flex flex-col transition-colors">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 sm:gap-3 text-slate-900 dark:text-white">
                  <Gift className="text-op-gold w-6 h-6 sm:w-7 sm:h-7" />
                  스페셜 티켓
                </h2>

                {currentTicket && isRevealed && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-xl text-sm font-bold text-slate-900 dark:text-white transition-colors border border-black/10 dark:border-white/10"
                  >
                    <Ticket className="w-4 h-4" />새 복권
                  </button>
                )}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                {!currentTicket ? (
                  <div className="w-full flex flex-col items-center">
                    {/* VIP Ticket Placeholder */}
                    <div className="w-full max-w-[260px] sm:max-w-[340px] aspect-[3/4] mx-auto rounded-2xl bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 border border-black/10 dark:border-white/10 flex items-center justify-center mb-6 sm:mb-8 relative group overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-transform duration-500 hover:scale-[1.02]">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                      <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/10 to-transparent"></div>

                      <div className="text-center relative z-10 p-6 sm:p-8 flex flex-col items-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center mb-4 sm:mb-6 group-hover:border-op-gold/50 transition-colors">
                          <Ticket className="w-8 h-8 sm:w-10 sm:h-10 text-black/30 dark:text-white/30 group-hover:text-op-gold transition-colors" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-white/70 mb-1.5 sm:mb-2">프리미엄 복권</h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 font-medium">티켓을 구매하고 행운을 확인하세요</p>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex justify-center gap-2 items-center w-full max-w-[340px]">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-sm text-red-400 font-medium">{errorMessage}</p>
                      </div>
                    )}

                    <button
                      onClick={handleBuyTicket}
                      disabled={isPurchasing || userPoints < TICKET_COST || todayCount >= DAILY_LIMIT}
                      className={cn(
                        "w-full max-w-[260px] sm:max-w-[340px] py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl transition-all duration-300 relative overflow-hidden shadow-2xl group",
                        isPurchasing || userPoints < TICKET_COST || todayCount >= DAILY_LIMIT
                          ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700"
                          : "bg-gradient-to-r from-[#d4af37] via-[#fff4cc] to-[#c9a227] text-black border border-op-gold/50 cursor-pointer shadow-[0_0_40px_rgba(201,162,39,0.4)]"
                      )}
                    >
                      {!(isPurchasing || userPoints < TICKET_COST || todayCount >= DAILY_LIMIT) && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[200%] group-hover:animate-[shimmer_1.5s_infinite]" />
                      )}

                      <div className={cn(
                        "relative z-10 flex items-center justify-center gap-2",
                        !(isPurchasing || userPoints < TICKET_COST || todayCount >= DAILY_LIMIT) && "group-hover:scale-105 transition-transform duration-300"
                      )}>
                        {isPurchasing ? "발급 중..." : `구매하기 (${TICKET_COST}P)`}
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex-1 flex flex-col items-center justify-center">
                    <div className="card-container relative w-full flex justify-center" style={{ perspective: '1200px' }}>
                      <div
                        className={cn(
                          "card-flip w-full max-w-[260px] sm:max-w-[340px] aspect-[3/4] relative cursor-pointer group",
                          isRevealed && "flipped"
                        )}
                        onClick={handleFlip}
                        style={{
                          transformStyle: 'preserve-3d',
                          transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
                        }}
                      >
                        {/* Card Back (Hidden state) - Premium Holographic look */}
                        <div
                          className="absolute inset-0 rounded-[24px] overflow-hidden border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(0deg)',
                            background: 'linear-gradient(135deg, #1f1f1f 0%, #111 50%, #0a0a0a 100%)',
                          }}
                        >
                          {/* Inner gold border */}
                          <div className="absolute inset-[8px] border-2 border-dashed border-op-gold/40 rounded-[16px] pointer-events-none" />

                          {/* Holographic overlay */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center relative z-10">
                              <div className="relative mb-6">
                                <Crown size={70} className="text-op-gold mx-auto drop-shadow-[0_0_15px_rgba(201,162,39,0.5)]" />
                                <Sparkles className="absolute -top-4 -right-4 text-white/50 animate-pulse w-8 h-8" />
                                <Sparkles className="absolute -bottom-2 -left-4 text-white/30 animate-pulse w-6 h-6 delay-150" />
                              </div>
                              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-wider mb-2">SCRATCH</p>
                              <p className="text-sm font-medium text-white/40 bg-white/5 px-4 py-1.5 rounded-full inline-block border border-white/10">카드를 터치하여 긁기</p>
                            </div>
                          </div>

                          <div className="absolute bottom-6 left-0 w-full text-center">
                            <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">Premium Ticket</p>
                          </div>
                        </div>

                        {/* Card Front (Revealed state) */}
                        <div
                          className={cn(
                            "absolute inset-0 rounded-[24px] overflow-hidden flex items-center justify-center transition-all duration-500",
                            "bg-gradient-to-br shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2",
                            getTierInfo(currentTicket.tier).color,
                            isRevealed && getTierInfo(currentTicket.tier).glow,
                            currentTicket.tier === 'none' ? "border-gray-600/50" : "border-white/50"
                          )}
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          {/* Shine overlay */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />

                          <div className="text-center relative z-10 w-full px-8">
                            {currentTicket.tier !== 'none' ? (
                              <>
                                <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-6 mb-6 inline-block border border-white/20 shadow-xl">
                                  {(() => {
                                    const TierIcon = getTierInfo(currentTicket.tier).icon;
                                    return <TierIcon size={70} className="text-white mx-auto drop-shadow-2xl animate-bounce-slow" />;
                                  })()}
                                </div>

                                <p className="text-2xl font-bold text-white/90 mb-1 drop-shadow-md tracking-wider">
                                  {getTierInfo(currentTicket.tier).name} 당첨!
                                </p>

                                <div className="bg-white/10 backdrop-blur-md rounded-2xl py-4 px-2 border border-white/20 mb-8 shadow-inner">
                                  <p className="text-5xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                    {currentTicket.prizeAmount.toLocaleString()}P
                                  </p>
                                </div>

                                <p className="text-sm text-white/80 font-bold uppercase tracking-widest">Congratulations</p>
                              </>
                            ) : (
                              <>
                                <div className="bg-black/30 backdrop-blur-sm rounded-full p-8 mb-6 inline-block border border-white/10">
                                  <X size={60} className="text-white/80 mx-auto" />
                                </div>
                                <p className="text-4xl font-black text-white drop-shadow-lg mb-2">꽝</p>
                                <p className="text-base font-medium text-white/60">다음 기회를 노려보세요...</p>
                              </>
                            )}
                          </div>

                          {/* Pattern overlay for premium feel */}
                          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Prize Tiers */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 shadow-xl transition-colors">
              <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-slate-900 dark:text-white">
                <TrendingUp className="text-op-gold w-5 h-5 sm:w-6 sm:h-6" />
                당첨금 및 확률
              </h2>
              <div className="space-y-4">
                {PRIZE_TIERS.map((tier) => {
                  const TierIcon = tier.icon;
                  return (
                    <div key={tier.id} className="relative group p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-black/10 dark:hover:border-white/10">
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border",
                            tier.prize > 0 ? "bg-gradient-to-br border-white/40" : "bg-gray-800 border-gray-600",
                            tier.prize > 0 ? tier.color : ""
                          )}>
                            <TierIcon size={14} className="text-white drop-shadow-md" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">{tier.name}</span>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-white/40">{tier.probability}%</span>
                          </div>
                        </div>
                        <span className={cn(
                          "text-lg font-black",
                          tier.prize > 0 ? "text-op-gold drop-shadow-[0_0_8px_rgba(201,162,39,0.4)]" : "text-slate-400 dark:text-white/40"
                        )}>
                          {tier.prize > 0 ? `${tier.prize.toLocaleString()}P` : '0P'}
                        </span>
                      </div>

                      {/* Subtle probability bar underneath */}
                      <div className="absolute bottom-0 left-3 right-3 h-1 flex rounded-full overflow-hidden opacity-30">
                        <div
                          className={cn("h-full bg-gradient-to-r", tier.color)}
                          style={{ width: `${Math.min(tier.probability * 3, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* My History */}
            {history.length > 0 && (
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 shadow-xl max-h-[350px] flex flex-col transition-colors">
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 text-slate-900 dark:text-white shrink-0">
                  <History className="text-op-gold w-5 h-5 sm:w-6 sm:h-6" />
                  최근 결과
                </h2>
                <div className="space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {history.map((ticket, idx) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-black/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-white/40 border border-black/10 dark:border-white/10">
                          {history.length - idx}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-white/80 text-sm">{getTierInfo(ticket.tier).name}</span>
                      </div>
                      <span className={cn(
                        "font-black text-sm",
                        ticket.prizeAmount > 0 ? "text-op-gold drop-shadow-[0_0_5px_rgba(201,162,39,0.4)]" : "text-slate-400 dark:text-white/30"
                      )}>
                        {ticket.prizeAmount > 0 ? `+${ticket.prizeAmount.toLocaleString()}P` : '꽝'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center pt-8 text-xs text-slate-400 dark:text-white/30 font-medium border-t border-black/5 dark:border-white/5 mt-8">
          <p>본 복권은 실제 금전적 가치가 없는 가상 포인트로만 운영됩니다.</p>
          <p className="mt-1">포인트는 현금으로 교환할 수 없으며, 서비스 내 활동에만 사용됩니다.</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
