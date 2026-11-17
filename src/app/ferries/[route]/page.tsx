import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FerryList from '@/views/FerryList';
import { ZN, ferryRoutes, inr, sailPhoto } from '@/lib/catalogue';
import JsonLd from '@/components/seo/JsonLd';
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
    <div className="wrap">
      <div className="pg-plain"><span className="eyebrow">Ferry</span><h1>{a} to {b} ferry</h1><p className="muted">{r.list.length} sailings. Report 45–60 minutes before departure at {r.list[0].fromPt}.</p></div>
      <FerryList sails={r.list} />
      <p className="note" style={{ marginTop: 14 }}>Fares are per person, one way. Government ship seats open about a week ahead; private ferries sell out first in peak season (15 Dec–15 Jan).{back && <> Coming back? See <a className="link" href={`/ferries/${back.key}`}>{b} to {a} ferries</a>.</>} More about <a className="link" href={`/islands/${r.to.toLowerCase()}`}>{b}</a>.</p>
      <JsonLd data={[...ld, crumbs([['Home', '/'], ['Ferries', '/ferries'], [`${a} to ${b}`, `/ferries/${route}`]])]} />
    </div>
  );
}
