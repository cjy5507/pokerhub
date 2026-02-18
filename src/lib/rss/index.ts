import Parser from 'rss-parser';
import { POKER_FEEDS, type FeedSource, type FeedCategory } from './feeds';
import { translateTexts } from './translate';

export interface NewsItem {
  id: string;
  title: string;
  titleKo: string;
  link: string;
  description: string;
  descriptionKo: string;
  pubDate: string;
  source: string;
  category: FeedSource['category'];
  lang: FeedSource['lang'];
}

interface CacheEntry {
  items: NewsItem[];
  fetchedAt: number;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CacheEntry>();

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'OpenPoker/1.0 RSS Reader',
  },
});

async function fetchFeed(source: FeedSource): Promise<NewsItem[]> {
  const cached = cache.get(source.url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.items;
  }

  try {
    const feed = await parser.parseURL(source.url);
    const items: NewsItem[] = (feed.items || []).map((item, index) => {
      const title = item.title || 'Untitled';
      const description = stripHtml(item.contentSnippet || item.content || item.summary || '').slice(0, 200);
      return {
        id: `${source.name}-${item.guid || item.link || index}`,
        title,
        titleKo: title,
        link: item.link || '',
        description,
        descriptionKo: description,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        category: source.category,
        lang: source.lang,
      };
    });

    cache.set(source.url, { items, fetchedAt: Date.now() });
    return items;
  } catch (error) {
    console.error(`Failed to fetch RSS feed from ${source.name}:`, error);
    // Return stale cache if available
    if (cached) return cached.items;
    return [];
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function getNewsItems(options?: {
  category?: FeedCategory;
  page?: number;
  limit?: number;
}): Promise<{ items: NewsItem[]; total: number }> {
  const { category = 'all', page = 1, limit = 20 } = options || {};

  const feedsToFetch =
    category === 'all'
      ? POKER_FEEDS
      : POKER_FEEDS.filter((f) => f.category === category);

  const results = await Promise.allSettled(feedsToFetch.map(fetchFeed));

  let allItems: NewsItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  // Sort by date, newest first
  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const total = allItems.length;
  const offset = (page - 1) * limit;
  const items = allItems.slice(offset, offset + limit);

  // Translate only the current page of English items
  const englishItems = items.filter((item) => item.lang === 'en');
  if (englishItems.length > 0) {
    const titles = englishItems.map((item) => item.title);
    const descriptions = englishItems.map((item) => item.description);

    const [translatedTitles, translatedDescriptions] = await Promise.all([
      translateTexts(titles),
      translateTexts(descriptions),
    ]);

    for (let i = 0; i < englishItems.length; i++) {
      englishItems[i].titleKo = translatedTitles[i];
      englishItems[i].descriptionKo = translatedDescriptions[i];
    }
  }

  return { items, total };
}
