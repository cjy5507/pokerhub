import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '랭킹 | Open Poker',
  description: '포커 커뮤니티 랭킹을 확인하세요.',
};

import { db } from '@/lib/db';
import { users, posts, pokerHands, postLikes } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { desc, eq, sql, and, inArray } from 'drizzle-orm';
import Link from 'next/link';

interface RankedUser {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  points: number;
  postCount: number;
  handCount: number;
  likesReceived: number;
}

type UserRow = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  points: number;
};

type CountRow = { authorId: string; count: number };

type TabKey = 'level' | 'points' | 'posts' | 'hands' | 'likes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'level', label: '레벨' },
  { key: 'points', label: '포인트' },
  { key: 'posts', label: '게시글' },
  { key: 'hands', label: '핸드' },
  { key: 'likes', label: '좋아요' },
];

function getRankBadge(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function getRankColor(rank: number): string {
  if (rank === 1) return 'border-op-gold bg-op-gold/10';
  if (rank === 2) return 'border-op-silver bg-op-silver/10';
  if (rank === 3) return 'border-op-bronze bg-op-bronze/10';
  return 'border-op-border bg-op-surface';
}

function getStatValue(user: RankedUser, tab: TabKey): string {
  switch (tab) {
    case 'level':
      return `Lv.${user.level} (${user.xp.toLocaleString()} XP)`;
    case 'points':
      return `${user.points.toLocaleString()} P`;
    case 'posts':
      return `${user.postCount}개`;
    case 'hands':
      return `${user.handCount}개`;
    case 'likes':
      return `${user.likesReceived}개`;
  }
}

function buildMaps(
  postCounts: CountRow[],
  handCounts: CountRow[],
  likesCounts: CountRow[],
) {
  return {
    postCountMap: new Map(postCounts.map((r) => [r.authorId, r.count])),
    handCountMap: new Map(handCounts.map((r) => [r.authorId, r.count])),
    likesCountMap: new Map(likesCounts.map((r) => [r.authorId, r.count])),
  };
}

function mergeUserCounts(
  userRows: UserRow[],
  postCountMap: Map<string, number>,
  handCountMap: Map<string, number>,
  likesCountMap: Map<string, number>,
): RankedUser[] {
  return userRows.map((user) => ({
    ...user,
    postCount: postCountMap.get(user.id) ?? 0,
    handCount: handCountMap.get(user.id) ?? 0,
    likesReceived: likesCountMap.get(user.id) ?? 0,
  }));
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  const { tab } = await searchParams;
  const activeTab = (tab && TABS.some((t) => t.key === tab) ? tab : 'level') as TabKey;

  if (!db) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-op-text mb-4">랭킹</h1>
        <p className="text-op-text-secondary">데이터베이스에 연결할 수 없습니다</p>
      </div>
    );
  }

  let rankedUsers: RankedUser[] = [];

  if (activeTab === 'posts' || activeTab === 'hands' || activeTab === 'likes') {
    // 4 parallel queries instead of N*3 — one user fetch + three GROUP BY aggregations
    const allUsers: UserRow[] = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        level: users.level,
        xp: users.xp,
        points: users.points,
      })
      .from(users)
      .where(eq(users.status, 'active'))
      .limit(1000);

    const [postCounts, handCounts, likesCounts]: [CountRow[], CountRow[], CountRow[]] =
      await Promise.all([
        db
          .select({
            authorId: posts.authorId,
            count: sql<number>`cast(count(*) as int)`,
          })
          .from(posts)
          .where(eq(posts.status, 'published'))
          .groupBy(posts.authorId),

        db
          .select({
            authorId: pokerHands.authorId,
            count: sql<number>`cast(count(*) as int)`,
          })
          .from(pokerHands)
          .groupBy(pokerHands.authorId),

        db
          .select({
            authorId: posts.authorId,
            count: sql<number>`cast(count(*) as int)`,
          })
          .from(postLikes)
          .innerJoin(posts, eq(posts.id, postLikes.postId))
          .groupBy(posts.authorId),
      ]);

    const { postCountMap, handCountMap, likesCountMap } = buildMaps(
      postCounts,
      handCounts,
      likesCounts,
    );

    rankedUsers = mergeUserCounts(allUsers, postCountMap, handCountMap, likesCountMap)
      .sort((a, b) => {
        switch (activeTab) {
          case 'posts':
            return b.postCount - a.postCount || b.xp - a.xp;
          case 'hands':
            return b.handCount - a.handCount || b.xp - a.xp;
          case 'likes':
            return b.likesReceived - a.likesReceived || b.xp - a.xp;
          default:
            return 0;
        }
      })
      .slice(0, 50);
  } else {
    const orderBy =
      activeTab === 'level'
        ? [desc(users.level), desc(users.xp)]
        : [desc(users.points)];

    // Fetch top 50 first, then 3 parallel aggregations scoped to those user IDs (4 queries total)
    const topUsers: UserRow[] = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        level: users.level,
        xp: users.xp,
        points: users.points,
      })
      .from(users)
      .where(eq(users.status, 'active'))
      .orderBy(...orderBy)
      .limit(50);

    const userIds = topUsers.map((u) => u.id);

    if (userIds.length === 0) {
      rankedUsers = [];
    } else {
      const [postCounts, handCounts, likesCounts]: [CountRow[], CountRow[], CountRow[]] =
        await Promise.all([
          db
            .select({
              authorId: posts.authorId,
              count: sql<number>`cast(count(*) as int)`,
            })
            .from(posts)
            .where(and(eq(posts.status, 'published'), inArray(posts.authorId, userIds)))
            .groupBy(posts.authorId),

          db
            .select({
              authorId: pokerHands.authorId,
              count: sql<number>`cast(count(*) as int)`,
            })
            .from(pokerHands)
            .where(inArray(pokerHands.authorId, userIds))
            .groupBy(pokerHands.authorId),

          db
            .select({
              authorId: posts.authorId,
              count: sql<number>`cast(count(*) as int)`,
            })
            .from(postLikes)
            .innerJoin(posts, eq(posts.id, postLikes.postId))
            .where(inArray(posts.authorId, userIds))
            .groupBy(posts.authorId),
        ]);

      const { postCountMap, handCountMap, likesCountMap } = buildMaps(
        postCounts,
        handCounts,
        likesCounts,
      );

      rankedUsers = mergeUserCounts(topUsers, postCountMap, handCountMap, likesCountMap);
    }
  }

  const currentUserId = session?.userId || null;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 pb-20 lg:pb-0 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-op-text mb-2">랭킹</h1>
        <p className="text-sm text-op-text-secondary">TOP 50 유저 랭킹을 확인하세요</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/rankings?tab=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-op-gold text-black'
                : 'bg-op-elevated text-op-text-secondary hover:bg-op-border hover:text-op-text'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Ranking List */}
      <div className="space-y-2">
        {rankedUsers.map((user, index) => {
          const rank = index + 1;
          const badge = getRankBadge(rank);
          const isMe = user.id === currentUserId;

          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-lg border transition-colors ${
                isMe ? 'border-op-success bg-op-success/10' : getRankColor(rank)
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-10 text-center">
                {badge ? (
                  <span className="text-2xl">{badge}</span>
                ) : (
                  <span className="text-lg font-bold text-op-text-muted">{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-op-border flex items-center justify-center text-sm font-bold text-op-gold overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.nickname.charAt(0).toUpperCase()
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-op-text truncate">{user.nickname}</span>
                  {isMe && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-op-success/20 text-op-success font-medium">
                      나
                    </span>
                  )}
                </div>
                <div className="text-xs text-op-text-muted">Lv.{user.level}</div>
              </div>

              {/* Stat Value */}
              <div className="flex-shrink-0 text-right">
                <div className="text-sm lg:text-base font-bold text-op-gold">
                  {getStatValue(user, activeTab)}
                </div>
              </div>
            </div>
          );
        })}

        {rankedUsers.length === 0 && (
          <div className="py-12 text-center text-op-text-muted">
            <p className="text-sm">랭킹 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
