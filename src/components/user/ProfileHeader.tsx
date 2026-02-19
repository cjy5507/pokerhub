'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserCircle, Settings, UserPlus, UserMinus, Ban } from 'lucide-react';
import { toggleFollow, toggleBlock } from '@/app/(user)/actions';

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
    joinedAtLabel: string;
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
      {/* Banner — hidden on mobile, visible on sm+ */}
      <div className="hidden sm:block h-48 lg:h-64 bg-surface-elevated relative overflow-hidden">
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
      <div className="max-w-[1560px] mx-auto px-3 sm:px-4">
        {/* Mobile: compact card layout */}
        <div className="relative sm:-mt-16 lg:-mt-20">
          {/* Main row: avatar + info + action */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:items-end sm:gap-4 lg:gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-14 h-14 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full border-[3px] sm:border-4 border-background overflow-hidden bg-surface"
                style={{ borderColor: levelTier.color }}
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.nickname}
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle className="w-8 h-8 sm:w-24 sm:h-24 text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* Level Badge — only on sm+ */}
              <div
                className="hidden sm:flex absolute -bottom-2 -right-2 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: levelTier.color }}
              >
                Lv.{user.level}
              </div>
            </div>

            {/* Center: Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[15px] sm:text-2xl lg:text-3xl font-bold truncate">{user.nickname}</h1>
                <span
                  className="sm:hidden text-[10px] font-bold text-white px-1.5 py-px rounded-full flex-shrink-0"
                  style={{ backgroundColor: levelTier.color }}
                >
                  Lv.{user.level}
                </span>
                {user.customTitle && (
                  <span className="hidden sm:inline px-2 py-0.5 bg-gold text-white text-xs rounded-md whitespace-nowrap">
                    {user.customTitle}
                  </span>
                )}
              </div>
              {user.customTitle && (
                <span className="sm:hidden inline-block px-1.5 py-px bg-gold text-white text-[10px] rounded mt-0.5">
                  {user.customTitle}
                </span>
              )}
              <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 truncate">
                가입일 {user.joinedAtLabel}
              </p>
            </div>

            {/* Action button — compact on mobile */}
            <div className="flex-shrink-0">
              {isOwnProfile ? (
                <button
                  onClick={() => router.push('/settings')}
                  className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-surface border border-border rounded-md hover:bg-surface-elevated flex items-center gap-1.5 text-[12px] sm:text-sm sm:min-h-[44px]"
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>수정</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={handleFollow}
                    disabled={isLoading || isBlocked}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-md flex items-center gap-1 text-[12px] sm:text-sm sm:min-h-[44px] ${
                      isFollowing
                        ? 'bg-surface border border-border hover:bg-surface-elevated'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{isFollowing ? '팔로잉' : '팔로우'}</span>
                  </button>
                  <button
                    onClick={handleBlock}
                    disabled={isLoading}
                    className="p-1.5 sm:px-3 sm:py-2.5 bg-surface border border-border rounded-md hover:bg-destructive hover:text-white text-[12px] sm:text-sm sm:min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline ml-1">{isBlocked ? '차단해제' : '차단'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bio — if exists */}
          {user.bio && (
            <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 max-w-2xl">{user.bio}</p>
          )}

          {/* Level Progress — thin bar */}
          <div className="mt-2 sm:mt-3">
            <div className="flex items-center justify-between text-[11px] sm:text-sm text-muted-foreground mb-0.5">
              <span className="font-medium">Lv.{levelInfo.currentLevel}</span>
              <span>다음 레벨까지 {levelInfo.xpNeeded} XP</span>
            </div>
            <div className="h-1 sm:h-1.5 bg-surface rounded-full overflow-hidden">
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
  );
}
