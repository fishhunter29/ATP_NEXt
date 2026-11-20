import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FerryList from '@/views/FerryList';
import { ZN, ferryRoutes, inr, sailPhoto } from '@/lib/catalogue';
import JsonLd from '@/components/seo/JsonLd';
import { TideIcon } from '@/components/Brand';
import { abs, crumbs, pageMeta } from '@/lib/seo';

export function generateStaticParams() { return ferryRoutes().map((r) => ({ route: r.key })); }

export async function generateMetadata({ params }: { params: Promise<{ route: string }> }): Promise<Metadata> {
  const { route } = await params; const r = ferryRoutes().find((x) => x.key === route); if (!r) return {};
  const a = ZN[r.from].name, b = ZN[r.to].name;
  return pageMeta({ title: `${a} to ${b} ferry: timings and fares`, description: `${r.list.length} sailings from ${a} to ${b}: ${r.list.slice(0, 4).map((s) => `${s.op} ${s.dep}`).join(', ')}. Fares from ${inr(Math.min(...r.list.map((s) => s.fare || Infinity)))}. Book with your stay and transfers.`, path: `/ferries/${route}`, image: `/img/f/${sailPhoto(r.list[0].id)}.webp` });
}

export default async function Page({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params; const r = ferryRoutes().find((x) => x.key === route); if (!r) notFound();
  const a = ZN[r.from].name, b = ZN[r.to].name; const back = ferryRoutes().find((x) => x.from === r.to && x.to === r.from);
  const ld = r.list.map((s) => ({ '@context': 'https://schema.org', '@type': 'BoatTrip', name: `${s.op} ${a} to ${b} ${s.dep}`, provider: { '@type': 'Organization', name: s.op },
    departureBoatTerminal: { '@type': 'BoatTerminal', name: s.fromPt }, arrivalBoatTerminal: { '@type': 'BoatTerminal', name: s.toPt }, departureTime: s.dep, arrivalTime: s.arr,
    offers: s.fare ? { '@type': 'Offer', price: s.fare, priceCurrency: 'INR', url: abs(`/ferries/${route}`) } : undefined }));
  return (
    <div className="atp-pg">
      <header className="atp-ph">
        <span className="atp-eyebrow">Ferry · {r.list.length} sailing{r.list.length > 1 ? 's' : ''}</span>
        <h1>{a} to {b} ferry</h1>
        <p>Be at {r.list[0].fromPt} 45 to 60 minutes before departure. Fares are a person, one way.</p>
        {back && <a className="atp-btn is-outline atp-swap" href={`/ferries/${back.key}`}><TideIcon n="swap" s={18} />{b} to {a}</a>}
      </header>
      <FerryList sails={r.list} />
      <section className="atp-cs">
        <h2>Good to know</h2>
        <p className="atp-lead">Government ship seats open about a week ahead. Private ferries sell out first in peak season (15 Dec to 15 Jan). When you add a sailing, your cabs to and from the jetty are timed around it.</p>
        <a className="atp-strip" href={`/islands/${r.to.toLowerCase()}`}><TideIcon n="pin" /><span><b>More about {b}</b><small>Things to do, stays and day plans</small></span><TideIcon n="chev" s={18} /></a>
      </section>
      <JsonLd data={[...ld, crumbs([['Home', '/'], ['Ferries', '/ferries'], [`${a} to ${b}`, `/ferries/${route}`]])]} />
    </div>
  );
}
