'use client';

import { Trophy, Star, Shield, Award } from 'lucide-react';
import type { UserBadge } from '@/lib/gamification/badges';

type BadgeListProps = {
  badges: UserBadge[];
};

const rarityStyles = {
  common: {
    bg: 'bg-ph-elevated',
    border: 'border-ph-text-secondary',
    glow: '',
  },
  rare: {
    bg: 'bg-blue-900/30',
    border: 'border-blue-500/50',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
  },
  epic: {
    bg: 'bg-purple-900/30',
    border: 'border-purple-500/50',
    glow: 'shadow-[0_0_10px_rgba(168,85,247,0.3)]',
  },
  legendary: {
    bg: 'bg-amber-900/30',
    border: 'border-amber-500/50',
    glow: 'shadow-[0_0_10px_rgba(251,191,36,0.3)]',
  },
};

const categoryIcons = {
  achievement: Trophy,
  participation: Star,
  skill: Award,
  social: Shield,
  special: Trophy,
};

export function BadgeList({ badges }: BadgeListProps) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="bg-ph-surface border border-ph-border rounded-lg p-6 mb-8">
      <h3 className="text-xl font-bold text-ph-text mb-4">획득한 뱃지</h3>

      <div className="flex flex-wrap gap-3">
        {badges.map((badge) => {
          const Icon = categoryIcons[badge.category];
          const styles = rarityStyles[badge.rarity];

          return (
            <div
              key={badge.id}
              className={`
                ${styles.bg}
                ${styles.border}
                ${styles.glow}
                border
                rounded-lg
                px-4
                py-3
                flex
                items-center
                gap-3
                transition-all
                hover:scale-105
                cursor-default
              `}
              title={badge.descriptionKo || badge.descriptionEn || ''}
            >
              <Icon className="w-5 h-5 text-ph-gold" />
              <div>
                <div className="text-sm font-semibold text-ph-text">
                  {badge.nameKo || badge.nameEn}
                </div>
                <div className="text-xs text-ph-text-muted capitalize">
                  {badge.rarity}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
