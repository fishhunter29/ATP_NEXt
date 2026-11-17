import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import AddPanel from '@/components/AddPanel';
import { ACTS, ZN, actPhoto, durTxt, inr, per, slug, unslug } from '@/lib/catalogue';

export function generateStaticParams() { return ACTS.map((a) => ({ id: slug(a.id) })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const a = ACTS.find((x) => x.id === unslug(id)); if (!a) return {};
  const z = ZN[a.z]?.name;
  return { title: `${a.n}, ${z}`, description: `${a.n} on ${z}, Andaman: ${a.v}. ${a.p ? `From ${inr(a.p)} ${per(a.b)}.` : ''} Book it inside your Andaman itinerary, timed around ferries and check-ins.`, alternates: { canonical: `/things-to-do/${id}` }, openGraph: { images: [`/img/f/${actPhoto(a.id)}.webp`] } };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const a = ACTS.find((x) => x.id === unslug(id)); if (!a) notFound();
  const z = ZN[a.z];
  const facts = [['Island', z?.name], ['How long', durTxt(a.d)], ['When', a.slot || a.t], ['Where', a.site], ['Age', a.age ? `${a.age}+` : ''], ['Season', a.sea], ['Rating', a.g?.rt ? `★ ${a.g.rt} on Google${a.g.n ? ` (${a.g.n.toLocaleString('en-IN')})` : ''}` : '']].filter(([, v]) => v);
  const ld = { '@context': 'https://schema.org', '@type': 'TouristTrip', name: a.n, description: a.v, touristType: a.fam, offers: a.p ? { '@type': 'Offer', price: a.p, priceCurrency: 'INR' } : undefined, itinerary: { '@type': 'Place', name: `${a.site || z?.name}, Andaman and Nicobar Islands` } };
  return (
    <>
      <section className="pg-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/f/${actPhoto(a.id)}.webp`} alt={`${a.n}, ${z?.name}`} />
        <div className="wrap"><span className="eyebrow">{a.fam} · {z?.name}</span><h1>{a.n}</h1><p>{a.v}</p></div>
      </section>
      <div className="wrap"><div className="pg-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="facts">{facts.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
          {a.note && <p>{a.note}</p>}
          {a.cond && <p className="note">Runs when: {a.cond}. Sea and weather permitting; we confirm the slot before you pay.</p>}
          <p className="note">{a.p ? `From ${inr(a.p)} ${per(a.b)}, before GST.` : 'Price on request.'} Your plan places it where it fits: after ferries land, inside opening hours and in daylight.</p>
          <p><a className="link" href={`/islands/${slug(a.z)}`}>More on {z?.name} →</a></p>
        </div>
        <aside><Suspense><AddPanel kind="act" id={a.id} /></Suspense></aside>
      </div></div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
