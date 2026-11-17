import type { MetadataRoute } from 'next';
import { ACTS, HOTELS, ZONES, ferryRoutes, slug } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';
import { SITE as BASE } from '@/lib/seo';


export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const u = (path: string, priority = 0.6): MetadataRoute.Sitemap[number] => ({ url: BASE + path, lastModified: now, changeFrequency: 'weekly', priority });
  return [
    u('/', 1), u('/ferries', 0.9), u('/things-to-do', 0.9), u('/stays', 0.9), u('/cabs', 0.7), u('/charters', 0.8), u('/trips', 0.9), u('/plan', 0.8),
    ...ZONES.map((z) => u(`/islands/${slug(z.id)}`, 0.8)),
    ...ferryRoutes().map((r) => u(`/ferries/${r.key}`, 0.8)),
    ...ACTS.filter((a) => !/^ACV-(MEAL|SHOP)/.test(a.id)).map((a) => u(`/things-to-do/${slug(a.id)}`)),
    ...HOTELS.map((h) => u(`/stays/${slug(h.id)}`)),
    ...(PKGS as { id: string }[]).map((p) => u(`/trips/${slug(p.id)}`, 0.7)),
  ];
}
