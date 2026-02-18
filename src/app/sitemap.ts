import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pokerhub-eight.vercel.app';

  const staticRoutes = [
    '', '/news', '/strategy', '/market', '/shop',
    '/hands', '/poker', '/rankings', '/missions', '/attendance',
    '/threads', '/chat', '/search', '/login', '/register',
    '/terms', '/privacy', '/contact', '/lottery', '/roulette',
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: route === '' ? 1 : route === '/news' ? 0.9 : 0.7,
  }));
}
