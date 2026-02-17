'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserCircle, Settings, UserPlus, UserMinus, Ban } from 'lucide-react';
import { toggleFollow, toggleBlock } from '@/app/(user)/actions';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type ProfileHeaderProps = {
  user: {
    id: string;
    nickname: string;
    email: string;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    level: number;
    xp: number;
    points: number;
    customTitle: string | null;
    createdAt: Date;
  };
  levelInfo: {
    currentLevel: number;
    nextLevel: number;
    progress: number;
    xpNeeded: number;
  };
  levelTier: {
    tier: string;
    color: string;
  };
  isOwnProfile: boolean;
  isFollowing: boolean;
  isBlocked: boolean;
};

export function ProfileHeader({
  user,
  levelInfo,
  levelTier,
  isOwnProfile,
  isFollowing: initialFollowing,
  isBlocked: initialBlocked,
}: ProfileHeaderProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isBlocked, setIsBlocked] = useState(initialBlocked);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    const result = await toggleFollow(user.id);
    if (result.success) {
      setIsFollowing(result.isFollowing);
    }
    setIsLoading(false);
  };

  const handleBlock = async () => {
    if (!confirm(isBlocked ? '차단을 해제하시겠습니까?' : '이 사용자를 차단하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    const result = await toggleBlock(user.id);
    if (result.success) {
      setIsBlocked(result.isBlocked);
      if (result.isBlocked) {
        setIsFollowing(false);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="relative">
      {/* Banner */}
      <div className="h-64 bg-surface-elevated relative overflow-hidden">
        {user.bannerUrl ? (
          <Image
            src={user.bannerUrl}
            alt="Banner"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-surface to-surface-elevated" />
        )}
      </div>

      {/* Profile Info */}
      <div className="max-w-[1560px] mx-auto px-4">
        <div className="relative -mt-20 flex items-end gap-6">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-40 h-40 rounded-full border-4 border-background overflow-hidden bg-surface"
              style={{ borderColor: levelTier.color }}
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.nickname}
                  width={160}
                  height={160}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserCircle className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Level Badge */}
            <div
              className="absolute -bottom-2 -right-2 px-4 py-1 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: levelTier.color }}
            >
              Lv.{user.level}
            </div>
          </div>

          {/* Name and Actions */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{user.nickname}</h1>
                  {user.customTitle && (
                    <span className="px-3 py-1 bg-gold text-white text-sm rounded-md">
                      {user.customTitle}
                    </span>
                  )}
                </div>
                {user.bio && (
                  <p className="mt-2 text-muted-foreground max-w-2xl">{user.bio}</p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  가입일: {format(new Date(user.createdAt), 'yyyy년 M월 d일', { locale: ko })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <button
                    onClick={() => router.push('/settings')}
                    className="px-4 py-2 bg-surface border border-border rounded-md hover:bg-surface-elevated flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>프로필 수정</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      disabled={isLoading || isBlocked}
                      className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                        isFollowing
                          ? 'bg-surface border border-border hover:bg-surface-elevated'
                          : 'bg-primary text-primary-foreground hover:opacity-90'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      <span>{isFollowing ? '팔로잉' : '팔로우'}</span>
                    </button>
                    <button
                      onClick={handleBlock}
                      disabled={isLoading}
                      className="px-4 py-2 bg-surface border border-border rounded-md hover:bg-destructive hover:text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Ban className="w-4 h-4" />
                      <span>{isBlocked ? '차단 해제' : '차단'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Level Progress */}
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Lv.{levelInfo.currentLevel}</span>
                <span className="text-muted-foreground">
                  {levelInfo.xpNeeded} XP to Lv.{levelInfo.nextLevel}
                </span>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${levelInfo.progress}%`,
                    backgroundColor: levelTier.color,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
