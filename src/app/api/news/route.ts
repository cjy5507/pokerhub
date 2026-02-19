import { NextRequest, NextResponse } from 'next/server';
import { getNewsItems } from '@/lib/rss';
import type { FeedCategory } from '@/lib/rss/feeds';

// --- In-memory rate limiter: 30 requests per IP per minute ---
// NOTE: On Vercel serverless, this Map resets per cold start. For production-grade
// rate limiting, migrate to Vercel KV or Upstash Redis.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const newsRateLimitMap = new Map<string, RateLimitEntry>();
const NEWS_RATE_LIMIT_MAX = 30;
const NEWS_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkNewsRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = newsRateLimitMap.get(ip);

  if (entry && now > entry.resetAt) {
    newsRateLimitMap.delete(ip);
  }

  const current = newsRateLimitMap.get(ip);
  if (!current) {
    newsRateLimitMap.set(ip, { count: 1, resetAt: now + NEWS_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= NEWS_RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  return true;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!checkNewsRateLimit(ip)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const category = (searchParams.get('category') || 'all') as FeedCategory;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  try {
    const { items, total } = await getNewsItems({ category, page, limit });
    return NextResponse.json({
      items,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json(
      { error: '뉴스를 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
