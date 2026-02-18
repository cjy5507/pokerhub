import { db } from '@/lib/db';
import { users, posts, pokerHands, postLikes } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { desc, eq, sql, and } from 'drizzle-orm';
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
  if (rank === 1) return 'border-[#c9a227] bg-[#c9a227]/10';
  if (rank === 2) return 'border-[#a0a0a0] bg-[#a0a0a0]/10';
  if (rank === 3) return 'border-[#cd7f32] bg-[#cd7f32]/10';
  return 'border-[#333] bg-[#1e1e1e]';
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
        <h1 className="text-2xl font-bold text-[#e0e0e0] mb-4">랭킹</h1>
        <p className="text-[#a0a0a0]">데이터베이스에 연결할 수 없습니다</p>
      </div>
    );
  }

  let rankedUsers: RankedUser[] = [];

  if (activeTab === 'posts' || activeTab === 'hands' || activeTab === 'likes') {
    const allUsers = await db
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

    const usersWithCounts = await Promise.all(
      allUsers.map(async (user: any) => {
        const [postCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(and(eq(posts.authorId, user.id), eq(posts.status, 'published')));

        const [handCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(pokerHands)
          .where(eq(pokerHands.authorId, user.id));

        const [likesReceivedResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(postLikes)
          .innerJoin(posts, eq(posts.id, postLikes.postId))
          .where(eq(posts.authorId, user.id));

        return {
          ...user,
          postCount: Number(postCountResult.count),
          handCount: Number(handCountResult.count),
          likesReceived: Number(likesReceivedResult.count),
        };
      })
    );

    rankedUsers = usersWithCounts
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

    const topUsers = await db
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

    rankedUsers = await Promise.all(
      topUsers.map(async (user: any) => {
        const [postCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(and(eq(posts.authorId, user.id), eq(posts.status, 'published')));

        const [handCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(pokerHands)
          .where(eq(pokerHands.authorId, user.id));

        const [likesReceivedResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(postLikes)
          .innerJoin(posts, eq(posts.id, postLikes.postId))
          .where(eq(posts.authorId, user.id));

        return {
          ...user,
          postCount: Number(postCountResult.count),
          handCount: Number(handCountResult.count),
          likesReceived: Number(likesReceivedResult.count),
        };
      })
    );
  }

  const currentUserId = session?.userId || null;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#e0e0e0] mb-2">
          랭킹
        </h1>
        <p className="text-sm text-[#a0a0a0]">
          TOP 50 유저 랭킹을 확인하세요
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/rankings?tab=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-[#c9a227] text-black'
                : 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333] hover:text-[#e0e0e0]'
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
                isMe
                  ? 'border-[#22c55e] bg-[#22c55e]/10'
                  : getRankColor(rank)
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-10 text-center">
                {badge ? (
                  <span className="text-2xl">{badge}</span>
                ) : (
                  <span className="text-lg font-bold text-[#888]">{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-sm font-bold text-[#c9a227] overflow-hidden">
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
                  <span className="font-semibold text-[#e0e0e0] truncate">
                    {user.nickname}
                  </span>
                  {isMe && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-medium">
                      나
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#888]">
                  Lv.{user.level}
                </div>
              </div>

              {/* Stat Value */}
              <div className="flex-shrink-0 text-right">
                <div className="text-sm lg:text-base font-bold text-[#c9a227]">
                  {getStatValue(user, activeTab)}
                </div>
              </div>
            </div>
          );
        })}

        {rankedUsers.length === 0 && (
          <div className="py-12 text-center text-[#888]">
            <p className="text-sm">랭킹 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
