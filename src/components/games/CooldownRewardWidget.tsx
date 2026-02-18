'use client';

import { useState, useEffect } from 'react';
import { Leaf, Clock, Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { claimCooldownReward } from '@/app/(games)/actions';

const COOLDOWN_MS = 300 * 60 * 1000; // 5 hours

interface HarvestStats {
  lastReward: number;
  harvestCount: number;
  totalToday: number;
}

export function CooldownRewardWidget() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [stats, setStats] = useState<HarvestStats>({
    lastReward: 0,
    harvestCount: 0,
    totalToday: 0,
  });
  const [showCelebration, setShowCelebration] = useState(false);

  // Load stats from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('pokerhub_harvest_stats');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      const today = new Date().toDateString();

      // Reset if new day
      if (parsed.date !== today) {
        localStorage.setItem('pokerhub_harvest_stats', JSON.stringify({
          date: today,
          lastReward: 0,
          harvestCount: 0,
          totalToday: 0,
        }));
      } else {
        setStats(parsed);
      }
    }
  }, []);

  // Check cooldown and update countdown
  useEffect(() => {
    const updateCooldown = () => {
      const lastClaimStr = localStorage.getItem('pokerhub_last_harvest');
      if (!lastClaimStr) {
        setIsAvailable(true);
        setTimeRemaining('');
        return;
      }

      const lastClaim = new Date(lastClaimStr).getTime();
      const now = Date.now();
      const elapsed = now - lastClaim;

      if (elapsed >= COOLDOWN_MS) {
        setIsAvailable(true);
        setTimeRemaining('');
      } else {
        setIsAvailable(false);
        const remaining = COOLDOWN_MS - elapsed;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = async () => {
    if (!isAvailable || isClaiming) return;

    setIsClaiming(true);
    try {
      const result = await claimCooldownReward();

      if (result.success && result.pointsEarned) {
        // Update localStorage
        if (result.nextClaimAt) {
          localStorage.setItem('pokerhub_last_harvest', result.nextClaimAt);
        }

        // Update stats
        const today = new Date().toDateString();
        const newStats: HarvestStats = {
          lastReward: result.pointsEarned,
          harvestCount: stats.harvestCount + 1,
          totalToday: stats.totalToday + result.pointsEarned,
        };

        localStorage.setItem('pokerhub_harvest_stats', JSON.stringify({
          ...newStats,
          date: today,
        }));

        setStats(newStats);
        setIsAvailable(false);
        setShowCelebration(true);

        // Hide celebration after 2 seconds
        setTimeout(() => setShowCelebration(false), 2000);
      } else {
        console.error('Failed to claim reward:', result.error);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="relative w-full bg-ph-surface border border-ph-border rounded-lg p-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-ph-gold/5 via-transparent to-transparent pointer-events-none" />

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 bg-gradient-to-t from-ph-gold/20 via-ph-gold/10 to-transparent animate-pulse pointer-events-none z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Sparkles className="w-12 h-12 text-ph-gold animate-bounce" />
            <span className="text-2xl font-bold text-ph-gold drop-shadow-lg">
              +{stats.lastReward}P
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-4">
        <Leaf className="w-5 h-5 text-ph-gold" />
        <h3 className="text-ph-gold font-bold text-lg">포인트 수확</h3>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-ph-gold/30 to-transparent mb-4" />

      {/* Main button */}
      <button
        onClick={handleClaim}
        disabled={!isAvailable || isClaiming}
        className={cn(
          'relative w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300',
          'flex items-center justify-center gap-2',
          'border-2 overflow-hidden group',
          isAvailable
            ? 'bg-gradient-to-br from-ph-gold to-ph-gold-hover border-ph-gold-hover text-ph-surface hover:shadow-lg hover:shadow-ph-gold/50 hover:scale-105 animate-pulse'
            : 'bg-ph-elevated border-ph-border text-ph-text-muted cursor-not-allowed grayscale'
        )}
      >
        {/* Shimmer effect when available */}
        {isAvailable && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        )}

        <span className="relative z-10 flex items-center gap-2">
          {isAvailable ? (
            <>
              {isClaiming ? (
                <>
                  <div className="w-5 h-5 border-2 border-ph-surface border-t-transparent rounded-full animate-spin" />
                  수확 중...
                </>
              ) : (
                <>
                  수확하기
                  <Leaf className="w-5 h-5" />
                </>
              )}
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              {timeRemaining} 남음
            </>
          )}
        </span>
      </button>

      {/* Stats */}
      <div className="mt-4 space-y-2 text-sm">
        {stats.lastReward > 0 && (
          <div className="flex items-center justify-between text-ph-text-muted">
            <span className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-ph-gold" />
              마지막 수확
            </span>
            <span className="text-ph-gold font-bold">+{stats.lastReward}P</span>
          </div>
        )}

        <div className="flex items-center justify-between text-ph-text-muted">
          <span className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-ph-gold" />
            오늘 수확
          </span>
          <span className="text-ph-gold font-bold">
            {stats.harvestCount}회 / {stats.totalToday}P
          </span>
        </div>
      </div>

      {/* Progress indicator for today's harvests */}
      {stats.harvestCount > 0 && (
        <div className="mt-3">
          <div className="h-1 bg-ph-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ph-gold to-ph-gold-hover transition-all duration-500"
              style={{ width: `${Math.min((stats.harvestCount / 5) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-ph-text-muted mt-1 text-center">
            오늘 {stats.harvestCount}/5 회 수확 완료
          </p>
        </div>
      )}
    </div>
  );
}
