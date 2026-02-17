import { MissionCard } from '@/components/gamification/MissionCard';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getDailyMissions } from '@/lib/gamification/missions';
import { MissionsClient } from './MissionsClient';
import { BookOpen, MessageSquare, Heart, Trophy, FileText } from 'lucide-react';

const MISSION_ICONS = {
  post_count: BookOpen,
  comment_count: MessageSquare,
  like_received: Heart,
  hand_share: Trophy,
  attendance: FileText,
};

export default async function MissionsPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect('/login');
  }

  // Fetch daily missions
  const missions = await getDailyMissions(session.userId);

  // Map missions to UI format
  const dailyMissions = missions.map((m) => ({
    id: m.id,
    title: m.mission.nameKo,
    description: m.mission.descriptionKo || undefined,
    icon: MISSION_ICONS[m.mission.conditionType] || BookOpen,
    current: m.progress,
    target: m.mission.conditionTarget,
    reward: m.mission.pointReward,
    status: (m.rewardClaimed ? 'claimed' : m.isCompleted ? 'completed' : 'active') as 'active' | 'completed' | 'claimed',
  }));

  // Check if all missions are completed
  const allCompleted = dailyMissions.every((m) => m.status === 'claimed');

  return (
    <MissionsClient
      dailyMissions={dailyMissions}
      allCompleted={allCompleted}
    />
  );
}
