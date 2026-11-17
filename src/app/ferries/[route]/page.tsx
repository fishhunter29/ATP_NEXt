import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FerryList from '@/views/FerryList';
import { ZN, ferryRoutes, inr } from '@/lib/catalogue';

export function generateStaticParams() { return ferryRoutes().map((r) => ({ route: r.key })); }

export async function generateMetadata({ params }: { params: Promise<{ route: string }> }): Promise<Metadata> {
  const { route } = await params; const r = ferryRoutes().find((x) => x.key === route); if (!r) return {};
  const a = ZN[r.from].name, b = ZN[r.to].name;
  return { title: `${a} to ${b} ferry: timings and fares`, description: `${r.list.length} sailings from ${a} to ${b}: ${r.list.slice(0, 4).map((s) => `${s.op} ${s.dep}`).join(', ')}. Fares from ${inr(Math.min(...r.list.map((s) => s.fare || Infinity)))}. Book with your stay and transfers.`, alternates: { canonical: `/ferries/${route}` } };
}

export default async function Page({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params; const r = ferryRoutes().find((x) => x.key === route); if (!r) notFound();
  return (
    <div className="wrap">
      <div className="pg-plain"><span className="eyebrow">Ferry</span><h1>{ZN[r.from].name} → {ZN[r.to].name}</h1><p className="muted">{r.list.length} sailings. Report 45–60 minutes before departure at {r.list[0].fromPt}.</p></div>
      <FerryList ids={r.list.map((s) => s.id)} />
    </div>
  );
}
