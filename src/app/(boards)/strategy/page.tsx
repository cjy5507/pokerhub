import { db } from '@/lib/db';
import { posts, boards, users, tags, postTags } from '@/lib/db/schema';
import { eq, and, desc, sql, count, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { StrategyClient } from './StrategyClient';

export const metadata = {
  title: '전략 허브 - Open Poker',
  description: '포커 전략, 교육 콘텐츠, 프리플랍/포스트플랍 전략을 한눈에',
};

// Strategy category definitions mapped to tag keywords
const CATEGORY_TAG_MAP: Record<string, string[]> = {
  preflop: ['프리플랍', 'preflop', '프리플롭'],
  postflop: ['포스트플랍', 'postflop', '포스트플롭'],
  tournament: ['토너먼트', 'tournament', 'MTT', 'SNG'],
  cash: ['캐시게임', 'cash game', '캐시', 'ring game'],
  beginner: ['초보자', 'beginner', '입문', '기초'],
};

interface StrategyPost {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  author: {
    id: string;
    nickname: string;
    level: number;
    avatarUrl: string | null;
  };
  tags: string[];
}

export default async function StrategyHubPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageParam } = await searchParams;
  const session = await getSession();
  const currentPage = parseInt(pageParam || '1', 10);
  const limit = 12;

  if (!db) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-op-surface rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-op-text mb-4">데이터베이스 연결 필요</h1>
          <p className="text-op-text-secondary">
            전략 허브를 불러올 수 없습니다. 데이터베이스 연결을 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  // Find the strategy board
  const strategyBoard = await db.query.boards.findFirst({
    where: eq(boards.type, 'strategy'),
  });

  if (!strategyBoard) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-op-surface rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-op-text mb-4">전략 허브</h1>
          <p className="text-op-text-secondary">
            전략 게시판이 아직 생성되지 않았습니다.
          </p>
        </div>
      </div>
    );
  }

  // Build base conditions
  const baseConditions = [
    eq(posts.boardId, strategyBoard.id),
    eq(posts.status, 'published'),
  ];

  // If a category filter is active, find matching tag IDs
  let filteredPostIds: string[] | null = null;
  if (category && category !== 'all' && CATEGORY_TAG_MAP[category]) {
    const tagKeywords = CATEGORY_TAG_MAP[category];

    // Find tags matching the category keywords
    const matchingTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(
        sql`(${tags.nameKo} = ANY(${tagKeywords}) OR ${tags.nameEn} = ANY(${tagKeywords}))`
      );

    if (matchingTags.length > 0) {
      const tagIds = matchingTags.map((t: any) => t.id);
      const matchingPostTags = await db
        .select({ postId: postTags.postId })
        .from(postTags)
        .where(inArray(postTags.tagId, tagIds));

      filteredPostIds = matchingPostTags.map((pt: any) => pt.postId);
    } else {
      // No matching tags found -- return empty for this category
      filteredPostIds = [];
    }
  }

  // Fetch strategy posts
  const offset = (currentPage - 1) * limit;

  let conditions = [...baseConditions];
  if (filteredPostIds !== null) {
    if (filteredPostIds.length === 0) {
      // No posts match the filter
      const popularPosts = await fetchPopularPosts(strategyBoard.id);
      return (
        <StrategyClient
          posts={[]}
          popularPosts={popularPosts}
          currentCategory={category || 'all'}
          pagination={{ page: 1, total: 0, totalPages: 0 }}
          isLoggedIn={!!session}
          boardSlug={strategyBoard.slug}
        />
      );
    }
    conditions.push(inArray(posts.id, filteredPostIds));
  }

  const strategyPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      viewCount: posts.viewCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        nickname: users.nickname,
        level: users.level,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.isPinned), desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [{ count: totalCount }] = await db
    .select({ count: count() })
    .from(posts)
    .where(and(...conditions));

  // Fetch tags for each post
  const postIds = strategyPosts.map((p: any) => p.id);
  let postTagsMap: Record<string, string[]> = {};

  if (postIds.length > 0) {
    const tagResults = await db
      .select({
        postId: postTags.postId,
        tagName: tags.nameKo,
      })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(inArray(postTags.postId, postIds));

    for (const row of tagResults) {
      if (!postTagsMap[row.postId]) {
        postTagsMap[row.postId] = [];
      }
      postTagsMap[row.postId].push(row.tagName);
    }
  }

  // Combine posts with tags
  const postsWithTags: StrategyPost[] = strategyPosts.map((p: any) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    viewCount: p.viewCount,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    createdAt: p.createdAt,
    author: {
      id: p.author?.id || '',
      nickname: p.author?.nickname || '알 수 없음',
      level: p.author?.level || 1,
      avatarUrl: p.author?.avatarUrl || null,
    },
    tags: postTagsMap[p.id] || [],
  }));

  // Fetch popular posts (top 5 by likes)
  const popularPosts = await fetchPopularPosts(strategyBoard.id);

  return (
    <StrategyClient
      posts={postsWithTags}
      popularPosts={popularPosts}
      currentCategory={category || 'all'}
      pagination={{
        page: currentPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }}
      isLoggedIn={!!session}
      boardSlug={strategyBoard.slug}
    />
  );
}

async function fetchPopularPosts(boardId: string) {
  if (!db) return [];

  const popular = await db
    .select({
      id: posts.id,
      title: posts.title,
      likeCount: posts.likeCount,
      viewCount: posts.viewCount,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        nickname: users.nickname,
        level: users.level,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.boardId, boardId), eq(posts.status, 'published')))
    .orderBy(desc(posts.likeCount), desc(posts.viewCount))
    .limit(5);

  return popular.map((p: any) => ({
    id: p.id,
    title: p.title,
    likeCount: p.likeCount,
    viewCount: p.viewCount,
    commentCount: p.commentCount,
    createdAt: p.createdAt,
    author: {
      id: p.author?.id || '',
      nickname: p.author?.nickname || '알 수 없음',
      level: p.author?.level || 1,
    },
  }));
}
