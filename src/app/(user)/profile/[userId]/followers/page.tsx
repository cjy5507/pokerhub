import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { getFollowers } from '@/app/(user)/actions';

export const metadata: Metadata = {
  title: '팔로워 | Open Poker',
  description: '이 사용자를 팔로우하는 오픈포커 회원 목록.',
};
import { FollowButton } from '@/components/user/FollowButton';

export default async function FollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId } = await params;
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1', 10);

  const result = await getFollowers(userId, currentPage);

  if (!result.success || !result.followers) {
    return (
      <div className="min-h-screen bg-op-bg text-op-text">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-red-400">{result.error || '팔로워 목록을 불러올 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  const { followers, totalCount } = result;
  const totalPages = Math.ceil((totalCount || 0) / 20);

  return (
    <div className="min-h-screen bg-op-bg text-op-text">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/profile/${userId}`}
            className="text-op-text-secondary hover:text-op-text transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">팔로워</h1>
            <p className="text-op-text-secondary mt-1">{totalCount}명</p>
          </div>
        </div>

        {/* Followers List */}
        {followers.length === 0 ? (
          <div className="bg-op-surface border border-op-border rounded-lg p-8 text-center">
            <p className="text-op-text-secondary">아직 팔로워가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followers.map((follower) => (
              <div
                key={follower.id}
                className="bg-op-surface border border-op-border rounded-lg p-4 flex items-center justify-between hover:border-op-gold transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Link href={`/profile/${follower.id}`}>
                    <div className="w-12 h-12 rounded-full bg-op-elevated border border-op-border flex items-center justify-center overflow-hidden">
                      {follower.avatarUrl ? (
                        <img
                          src={follower.avatarUrl}
                          alt={follower.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-op-text-muted" />
                      )}
                    </div>
                  </Link>

                  {/* User Info */}
                  <div>
                    <Link
                      href={`/profile/${follower.id}`}
                      className="flex items-center gap-2 hover:text-op-gold transition-colors"
                    >
                      <span className="font-medium">{follower.nickname}</span>
                      <span className="text-xs bg-op-elevated border border-op-border px-2 py-0.5 rounded">
                        Lv.{follower.level}
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Follow Button */}
                <FollowButton
                  userId={follower.id}
                  initialIsFollowing={follower.isFollowingBack}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={`/profile/${userId}/followers?page=${currentPage - 1}`}
                className="px-4 py-2 bg-op-surface border border-op-border rounded hover:border-op-gold transition-colors"
              >
                이전
              </Link>
            )}

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Link
                    key={page}
                    href={`/profile/${userId}/followers?page=${page}`}
                    className={`px-4 py-2 rounded transition-colors ${
                      page === currentPage
                        ? 'bg-op-gold text-op-bg font-medium'
                        : 'bg-op-surface border border-op-border hover:border-op-gold'
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}
            </div>

            {currentPage < totalPages && (
              <Link
                href={`/profile/${userId}/followers?page=${currentPage + 1}`}
                className="px-4 py-2 bg-op-surface border border-op-border rounded hover:border-op-gold transition-colors"
              >
                다음
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
