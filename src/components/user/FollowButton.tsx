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
          ? 'bg-[#2a2a2a] border border-[#333] text-[#e0e0e0] hover:border-[#c9a227]'
          : 'bg-[#c9a227] text-[#121212] hover:bg-[#b89220]'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? '...' : isFollowing ? '팔로잉' : '팔로우'}
    </button>
  );
}
