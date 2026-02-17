export interface FeedSource {
  url: string;
  name: string;
  category: 'news' | 'tournament' | 'strategy';
  lang: 'en' | 'ko';
}

export const POKER_FEEDS: FeedSource[] = [
  // International poker news
  {
    url: 'https://www.pokernews.com/news/rss.xml',
    name: 'PokerNews',
    category: 'news',
    lang: 'en',
  },
  {
    url: 'https://www.cardplayer.com/rss/poker-news',
    name: 'CardPlayer',
    category: 'news',
    lang: 'en',
  },
  // Tournament feeds
  {
    url: 'https://www.pokernews.com/tournament/rss.xml',
    name: 'PokerNews Tournaments',
    category: 'tournament',
    lang: 'en',
  },
  // Strategy
  {
    url: 'https://upswingpoker.com/feed/',
    name: 'Upswing Poker',
    category: 'strategy',
    lang: 'en',
  },
];

export const FEED_CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'news', label: '뉴스' },
  { key: 'tournament', label: '대회정보' },
  { key: 'strategy', label: '전략' },
] as const;

export type FeedCategory = (typeof FEED_CATEGORIES)[number]['key'];

export const SOURCE_COLORS: Record<string, string> = {
  PokerNews: '#e53e3e',
  CardPlayer: '#3182ce',
  'PokerNews Tournaments': '#d69e2e',
  'Upswing Poker': '#38a169',
};
