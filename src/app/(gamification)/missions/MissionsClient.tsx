'use client';

import { MissionCard } from '@/components/gamification/MissionCard';
import { claimMissionRewardAction } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { Trophy } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  current: number;
  target: number;
  reward: number;
  status: 'active' | 'completed' | 'claimed';
}

interface MissionsClientProps {
  dailyMissions: Mission[];
  allCompleted: boolean;
}

export function MissionsClient({
  dailyMissions,
  allCompleted,
}: MissionsClientProps) {
  const router = useRouter();

  const handleClaim = async (missionId: string) => {
    try {
      const result = await claimMissionRewardAction(missionId);

      if (result.success && result.data) {
        toast.success(
          `보상 획득! +${result.data.pointsEarned}포인트, +${result.data.xpEarned}XP`
        );
        router.refresh();
      } else {
        toast.error(result.error || '보상 수령에 실패했습니다');
      }
    } catch (error) {
      toast.error('보상 수령 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 pb-20 lg:pb-0 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-op-text mb-2">
          일일 미션
        </h1>
        <p className="text-sm text-op-text-secondary">
          미션을 완료하고 보상을 받아가세요
        </p>
      </div>

      {/* All-Clear Bonus Banner */}
      {allCompleted && (
        <div className="bg-gradient-to-r from-op-gold/20 to-op-gold/20 border-2 border-op-gold rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-op-gold" />
            <div>
              <div className="font-bold text-op-text mb-1">
                일일 미션 전체 완료!
              </div>
              <div className="text-sm text-op-text-secondary">
                보너스 +200포인트, +25XP 획득
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Missions */}
      <div className="space-y-3 mb-8">
        <h2 className="text-lg font-bold text-op-text mb-3">
          오늘의 미션 ({dailyMissions.filter((m) => m.status === 'claimed').length}/
          {dailyMissions.length})
        </h2>
        {dailyMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            id={mission.id}
            title={mission.title}
            description={mission.description}
            icon={mission.icon}
            current={mission.current}
            target={mission.target}
            reward={mission.reward}
            status={mission.status}
            onClaim={handleClaim}
          />
        ))}
      </div>

      {/* Info */}
      <div className="bg-op-surface rounded-lg p-4">
        <h3 className="text-sm font-bold text-op-text mb-3">미션 정보</h3>
        <ul className="space-y-2 text-xs lg:text-sm text-op-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-op-gold">•</span>
            <span>일일 미션은 매일 자정(KST)에 초기화됩니다</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-op-gold">•</span>
            <span>모든 일일 미션을 완료하면 보너스 보상을 받습니다</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-op-gold">•</span>
            <span>미션은 사용자마다 무작위로 배정됩니다</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
