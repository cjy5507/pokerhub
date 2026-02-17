import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { users, userFollows, userBlocks, posts, pokerHands } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getXPForNextLevel, getLevelTier } from '@/lib/gamification/levels';
import { getUserBadges } from '@/lib/gamification/badges';
import { ProfileHeader } from '@/components/user/ProfileHeader';
import { ProfileStats } from '@/components/user/ProfileStats';
import { ProfileTabs } from '@/components/user/ProfileTabs';
import { BadgeList } from '@/components/user/BadgeList';
import { CooldownRewardWidget } from '@/components/games/CooldownRewardWidget';

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession();
  const { userId } = await params;

  if (!db) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#1a1a1a] rounded-lg p-8 border border-[#333]">
          <h2 className="text-xl font-bold text-[#e0e0e0] mb-4">데이터베이스 연결 필요</h2>
          <p className="text-[#a0a0a0] mb-2">데이터를 불러올 수 없습니다.</p>
          <p className="text-sm text-[#666]">.env 파일의 DATABASE_URL 설정을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  // Get user profile
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    notFound();
  }

  // Get level info
  const levelInfo = getXPForNextLevel(user.xp);
  const levelTier = getLevelTier(user.level);

  // Get follower/following counts
  const [followerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollows)
    .where(eq(userFollows.followingId, userId));

  const [followingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollows)
    .where(eq(userFollows.followerId, userId));

  // Get post count
  const [postCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(
      eq(posts.authorId, userId),
      eq(posts.status, 'published')
    ));

  // Get poker hand count
  const [handCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pokerHands)
    .where(eq(pokerHands.authorId, userId));

  // Check relationship with current user
  let isFollowing = false;
  let isBlocked = false;
  let isOwnProfile = false;

  if (session) {
    isOwnProfile = session.userId === userId;

    if (!isOwnProfile) {
      // Check if following
      const [follow] = await db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, session.userId),
            eq(userFollows.followingId, userId)
          )
        )
        .limit(1);
      isFollowing = !!follow;

      // Check if blocked
      const [block] = await db
        .select()
        .from(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerId, session.userId),
            eq(userBlocks.blockedId, userId)
          )
        )
        .limit(1);
      isBlocked = !!block;
    }
  }

  // Get recent posts
  const recentPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      createdAt: posts.createdAt,
      viewCount: posts.viewCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
    })
    .from(posts)
    .where(and(
      eq(posts.authorId, userId),
      eq(posts.status, 'published')
    ))
    .orderBy(desc(posts.createdAt))
    .limit(10);

  // Get recent poker hands
  const recentHands = await db
    .select({
      id: pokerHands.id,
      gameType: pokerHands.gameType,
      stakes: pokerHands.stakes,
      result: pokerHands.result,
      createdAt: pokerHands.createdAt,
      likeCount: pokerHands.likeCount,
      commentCount: pokerHands.commentCount,
    })
    .from(pokerHands)
    .where(eq(pokerHands.authorId, userId))
    .orderBy(desc(pokerHands.createdAt))
    .limit(10);

  // Get user badges
  const userBadges = await getUserBadges(userId);

  return (
    <div className="min-h-screen">
      <ProfileHeader
        user={{
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          level: user.level,
          xp: user.xp,
          points: user.points,
          customTitle: user.customTitle,
          createdAt: user.createdAt,
        }}
        levelInfo={levelInfo}
        levelTier={levelTier}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        isBlocked={isBlocked}
      />

      <div className="max-w-[1560px] mx-auto px-4 py-8">
        {isOwnProfile && (
          <div className="mb-6">
            <CooldownRewardWidget />
          </div>
        )}

        <ProfileStats
          userId={userId}
          stats={{
            followers: Number(followerCount.count),
            following: Number(followingCount.count),
            posts: Number(postCount.count),
            hands: Number(handCount.count),
          }}
        />

        <BadgeList badges={userBadges} />

        <ProfileTabs
          userId={userId}
          recentPosts={recentPosts}
          recentHands={recentHands}
        />
      </div>
    </div>
  );
}
