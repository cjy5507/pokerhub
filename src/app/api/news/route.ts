import { NextRequest, NextResponse } from 'next/server';
import { getNewsItems } from '@/lib/rss';
import type { FeedCategory } from '@/lib/rss/feeds';

export async function GET(request: NextRequest) {
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
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
