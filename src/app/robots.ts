import type { MetadataRoute } from 'next';
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://andamantravelplanner.com';
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/checkout', '/my-trips', '/profile', '/trip/edit', '/api/'] }], sitemap: `${BASE}/sitemap.xml` };
}
