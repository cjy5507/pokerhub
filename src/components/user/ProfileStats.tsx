'use client';

import Link from 'next/link';
import { Users, FileText, Spade, TrendingUp } from 'lucide-react';

type ProfileStatsProps = {
  userId: string;
  stats: {
    followers: number;
    following: number;
    posts: number;
    hands: number;
  };
};

export function ProfileStats({ userId, stats }: ProfileStatsProps) {
  const statItems = [
    { label: '팔로워', value: stats.followers, icon: Users, link: `/profile/${userId}/followers` },
    { label: '팔로잉', value: stats.following, icon: TrendingUp, link: `/profile/${userId}/following` },
    { label: '게시글', value: stats.posts, icon: FileText, link: null },
    { label: '핸드 공유', value: stats.hands, icon: Spade, link: null },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
      {statItems.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold">{item.value.toLocaleString()}</div>
            <div className="text-[10px] sm:text-sm text-muted-foreground">{item.label}</div>
          </>
        );

        if (item.link) {
          return (
            <Link
              key={item.label}
              href={item.link}
              className="bg-surface border border-border rounded-lg p-2.5 sm:p-4 text-center hover:border-primary transition-colors cursor-pointer"
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={item.label}
            className="bg-surface border border-border rounded-lg p-2.5 sm:p-4 text-center"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
