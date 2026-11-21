import type { MetadataRoute } from 'next';
import { ACTS, HOTELS, ZONES, actPhoto, ferryRoutes, slug, zonePhoto } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';
import { SITE as BASE } from '@/lib/seo';


export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const u = (path: string, priority = 0.6, image = ''): MetadataRoute.Sitemap[number] => ({ url: BASE + path, lastModified: now, changeFrequency: 'weekly', priority, ...(image ? { images: [BASE + image] } : {}) });
  return [
    u('/', 1), u('/ferries', 0.9), u('/things-to-do', 0.9), u('/stays', 0.9), u('/cabs', 0.7), u('/charters', 0.8), u('/trips', 0.9), u('/plan', 0.8),
    u('/terms', 0.3), u('/refunds', 0.3), u('/privacy', 0.3),
    ...ZONES.map((z) => u(`/islands/${slug(z.id)}`, 0.8, `/img/f/${zonePhoto(z.id)}.webp`)),
    ...ferryRoutes().map((r) => u(`/ferries/${r.key}`, 0.8)),
    ...ACTS.filter((a) => !/^ACV-(MEAL|SHOP)/.test(a.id)).map((a) => u(`/things-to-do/${slug(a.id)}`, 0.6, `/img/f/${actPhoto(a.id)}.webp`)),
    ...HOTELS.map((h) => u(`/stays/${slug(h.id)}`)),
    ...(PKGS as { id: string }[]).map((p) => u(`/trips/${slug(p.id)}`, 0.7)),
  ];
}
