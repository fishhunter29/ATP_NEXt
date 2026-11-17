import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ACTS, HOTELS, ZN, ZONES, actPhoto, ferryRoutes, hotelFrom, inr, slug, unslug, zonePhoto } from '@/lib/catalogue';
import JsonLd from '@/components/seo/JsonLd';
import DayPlans from '@/components/DayPlans';
import PhotoArt from '@/components/seo/PhotoArt';
import { abs, crumbs, pageMeta } from '@/lib/seo';

export function generateStaticParams() { return ZONES.map((z) => ({ zone: slug(z.id) })); }

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const { zone } = await params; const z = ZN[unslug(zone)]; if (!z) return {};
  return pageMeta({ title: `${z.name} (${z.official}): stays, ferries and things to do`, description: `Plan ${z.name} in the Andaman Islands: ${HOTELS.filter((h) => h.z === z.id).length} stays, ${ACTS.filter((a) => a.z === z.id).length} things to do, ferry times and how to get there. ${z.notes}`, path: `/islands/${zone}`, image: `/img/f/${zonePhoto(z.id)}.webp` });
}

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params; const z = ZN[unslug(zone)]; if (!z) notFound();
  const acts = ACTS.filter((a) => a.z === z.id && !/^ACV-(MEAL|SHOP)/.test(a.id)).sort((a, b) => (b.g?.rt || 0) - (a.g?.rt || 0));
  const stays = HOTELS.filter((h) => h.z === z.id).sort((a, b) => (b.rt || 0) - (a.rt || 0));
  const routes = ferryRoutes().filter((r) => r.from === z.id || r.to === z.id);
  const ld = { '@context': 'https://schema.org', '@type': 'TouristDestination', name: `${z.name} (${z.official})`, alternateName: z.official, description: z.notes, url: abs(`/islands/${zone}`), image: abs(`/img/f/${zonePhoto(z.id)}.webp`), containedInPlace: { '@type': 'Place', name: 'Andaman and Nicobar Islands, India' },
    includesAttraction: acts.slice(0, 10).map((a) => ({ '@type': 'TouristAttraction', name: a.n, url: abs(`/things-to-do/${slug(a.id)}`) })) };
  return (
    <>
      <section className="pg-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/f/${zonePhoto(z.id)}.webp`} alt={z.name} />
        <div className="wrap"><span className="eyebrow">{z.region} · {z.official}</span><h1>{z.name}</h1><p>{z.notes} {z.reach}.</p></div>
      </section>
      <div className="wrap">
        {routes.length > 0 && <div className="sec"><div className="sechd"><h2>Ferries</h2></div><div className="linklist">{routes.map((r) => <a key={r.key} href={`/ferries/${r.key}`}><b>{ZN[r.from].name} → {ZN[r.to].name}</b><small>{r.list.length} sailings</small></a>)}</div></div>}
        <DayPlans zone={z.id === 'WAN' ? 'PBL' : z.id} />
        <div className="sec"><div className="sechd"><h2>Things to do on {z.name}</h2><span className="sub">{acts.length} to choose from</span></div>
          <div className="lst">{acts.slice(0, 40).map((a) => (
            <a key={a.id} className="lrow" href={`/things-to-do/${slug(a.id)}`} style={{ textDecoration: 'none' }}>
              <span className="art"><PhotoArt id={actPhoto(a.id)} /></span>
              <span className="lb"><b>{a.n}</b><small>{a.v}</small><span className="price">{a.p ? `from ${inr(a.p)}` : 'On request'}{a.g?.rt ? <small style={{ display: 'inline', marginLeft: 8 }}>★ {a.g.rt} Google</small> : null}</span></span>
            </a>
          ))}</div></div>
        <div className="sec"><div className="sechd"><h2>Where to stay</h2><span className="sub">{stays.length} stays</span></div>
          <div className="linklist">{stays.map((h) => <a key={h.id} href={`/stays/${slug(h.id)}`}><b>{h.n}</b><small>{h.t}{h.rt ? ` · ★ ${h.rt} Google` : ''} · from {inr(hotelFrom(h))}</small></a>)}</div></div>
      </div>
      <JsonLd data={[ld, crumbs([['Home', '/'], [z.name, `/islands/${zone}`]])]} />
    </>
  );
}
