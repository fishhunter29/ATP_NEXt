import type { MetadataRoute } from 'next';
import { SITE as BASE } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/checkout', '/my-trips', '/profile', '/trip/edit', '/api/'] }], sitemap: `${BASE}/sitemap.xml` };
}
