'use client';

import { useState } from 'react';
import { toggleFollow } from '@/app/(user)/actions';

type FollowButtonProps = {
  userId: string;
  initialIsFollowing: boolean;
};

export function FollowButton({ userId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const result = await toggleFollow(userId);
    setLoading(false);

    if (result.success) {
      setIsFollowing(result.isFollowing);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 rounded font-medium transition-colors ${
        isFollowing
          ? 'bg-op-elevated border border-op-border text-op-text hover:border-op-gold'
          : 'bg-op-gold text-op-bg hover:bg-op-gold-hover'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? '...' : isFollowing ? '팔로잉' : '팔로우'}
    </button>
  );
}
