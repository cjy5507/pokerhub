import { db } from '@/lib/db';
import { users, posts, pokerHands, postLikes } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { desc, eq, sql, and } from 'drizzle-orm';

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

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  const { tab } = await searchParams;
  const activeTab = (tab || 'level') as 'level' | 'points' | 'posts' | 'hands' | 'likes';

  // Query users with aggregated counts
  let rankedUsers: RankedUser[] = [];

  if (!db) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Rankings - {activeTab}</h1>
        <p>Database not available</p>
      </div>
    );
  }

  if (activeTab === 'posts' || activeTab === 'hands' || activeTab === 'likes') {
    // For posts, hands, and likes, we need to aggregate data
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

    // Get counts for each user
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

    // Sort based on active tab
    rankedUsers = usersWithCounts.sort((a, b) => {
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
    }).slice(0, 50);
  } else {
    // For level and points, we can query directly with ordering
    const orderBy = activeTab === 'level' ? [desc(users.xp), desc(users.level)] : [desc(users.points)];

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

    // Get counts for each user
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Rankings - {activeTab}</h1>
      <div className="space-y-2">
        {rankedUsers.map((user, index) => (
          <div key={user.id} className="flex items-center gap-4 p-4 bg-gray-800 rounded">
            <span className="text-xl font-bold">{index + 1}</span>
            <span>{user.nickname}</span>
            <span className="ml-auto">Level {user.level} | {user.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
