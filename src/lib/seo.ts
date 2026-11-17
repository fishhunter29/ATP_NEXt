/* Shared bits for Google-facing pages: the site address, page metadata and schema.org helpers. */
import type { Metadata } from 'next';

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://andamantravelplanner.com').replace(/\/$/, '');
export const SITE_NAME = 'Andaman Travel Planner';
export const abs = (path: string) => SITE + (path.startsWith('/') ? path : '/' + path);

/** Title, description, canonical and social cards for one page, all pointing at the same address. */
export function pageMeta(o: { title: string; description: string; path: string; image?: string; noindex?: boolean }): Metadata {
  const images = [o.image || '/img/f/i179.webp'];
  return {
    title: o.title, description: o.description,
    alternates: { canonical: o.path },
    openGraph: { title: o.title, description: o.description, url: o.path, siteName: SITE_NAME, type: 'website', locale: 'en_IN', images },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** "Home › Islands › Havelock" for Google's breadcrumb trail. */
export function crumbs(list: [string, string][]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) };
}
