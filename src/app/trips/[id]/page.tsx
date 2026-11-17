import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlannedTripBuy } from '@/views/Packages';
import { PACKAGES, paxTxt, routeTxt } from '@/components/seo/Indexes';
import JsonLd from '@/components/seo/JsonLd';
import { ZN, inr, slug, zonePhoto } from '@/lib/catalogue';
import { abs, crumbs, pageMeta } from '@/lib/seo';

const find = (id: string) => PACKAGES.find((p) => p.id.toLowerCase() === id.toLowerCase());
export function generateStaticParams() { return PACKAGES.map((p) => ({ id: slug(p.id) })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const p = find(id); if (!p) return {};
  return pageMeta({ title: `${p.n}: ${p.nights}-night Andaman trip`, description: `${p.nights} nights, ${p.nights + 1} days: ${routeTxt(p)}. ${p.hl.join('. ')}. About ${inr(p.total)} for ${paxTxt(p)}, every ferry checked. Load it and change anything.`, path: `/trips/${slug(p.id)}`, image: `/img/f/${zonePhoto(p.route[1]?.[0] || p.route[0][0])}.webp` });
}

const ICON: Record<string, string> = { ferry: '⛴', stay: '🛏', cab: '🚕', act: '★', rent: '🛵' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const p = find(id); if (!p) notFound();
  const path = `/trips/${slug(p.id)}`;
  const ld = { '@context': 'https://schema.org', '@type': 'TouristTrip', name: p.n, description: `${p.nights} nights: ${routeTxt(p)}. ${p.hl.join('. ')}.`, url: abs(path), touristType: p.tag || undefined, provider: { '@id': abs('/#org') },
    offers: { '@type': 'Offer', price: p.total, priceCurrency: 'INR', url: abs(path), description: `For ${paxTxt(p)}, including GST` },
    itinerary: { '@type': 'ItemList', itemListElement: p.route.map(([z, n], i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'TouristDestination', name: `${ZN[z]?.name} (${n} night${n > 1 ? 's' : ''})`, url: abs(`/islands/${z.toLowerCase()}`) } })) } };
  return (
    <div className="wrap">
      <div className="pg-plain"><span className="eyebrow">{p.nights} nights · {p.nights + 1} days{p.tag ? ` · ${p.tag}` : ''}</span><h1>{p.n}</h1>
        <p className="muted">{p.route.map(([z, n], i) => <span key={i}>{i > 0 && ' → '}<a className="link" href={`/islands/${z.toLowerCase()}`}>{ZN[z]?.name}</a> {n}N</span>)}</p></div>
      <div className="pg-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.hl.map((h) => <div key={h}>✓ {h}</div>)}
          <h2 style={{ fontSize: 20, marginTop: 8 }}>Day by day</h2>
          {p.days.map((items, i) => (
            <div key={i} className="card"><b>Day {i + 1}</b>
              {items.map((it, k) => <div key={k} style={{ display: 'flex', gap: 8, fontSize: 14 }}><span className="mono" style={{ minWidth: 44 }}>{it.t}</span><span aria-hidden="true">{ICON[it.kind] || '·'}</span><span>{it.kind === 'act' ? <a className="link" href={`/things-to-do/${it.ref.toLowerCase()}`}>{it.title}</a> : it.kind === 'stay' ? <a className="link" href={`/stays/${it.ref.toLowerCase()}`}>{it.title}</a> : it.title}{it.sub && <small className="muted"> · {it.sub}</small>}</span></div>)}
            </div>
          ))}
          <p className="note">Shown for {paxTxt(p)}, {p.bookings} bookings. Add your dates and flights and every day is moved to fit them. The last night is in Port Blair, so a rough sea never makes you miss your flight.</p>
        </div>
        <aside><PlannedTripBuy id={p.id} /></aside>
      </div>
      <JsonLd data={[ld, crumbs([['Home', '/'], ['Planned trips', '/trips'], [p.n, path]])]} />
    </div>
  );
}
