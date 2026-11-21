import type { MetadataRoute } from 'next';
import { SITE as BASE } from '@/lib/seo';

/* Personal pages stay out of every index. Everything else is open to search engines and to the crawlers that feed
   AI assistants; they are named so that a later rule for "*" never shuts them out by accident. */
const PRIVATE = ['/checkout', '/my-trips', '/profile', '/trip/edit', '/trip/shared', '/api/'];
const AI = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot', 'Meta-ExternalAgent', 'Amazonbot', 'DuckAssistBot'];
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE }, { userAgent: AI, allow: '/', disallow: PRIVATE }], sitemap: `${BASE}/sitemap.xml`, host: BASE };
}
