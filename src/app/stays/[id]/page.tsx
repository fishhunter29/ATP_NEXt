import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import AddPanel from '@/components/AddPanel';
import { HOTELS, ZN, hotelFrom, inr, slug, unslug, zonePhoto } from '@/lib/catalogue';
import JsonLd from '@/components/seo/JsonLd';
import { HotelGallery, hotelCover } from '@/components/HotelPhoto';
import { abs, crumbs, pageMeta } from '@/lib/seo';

export function generateStaticParams() { return HOTELS.map((h) => ({ id: slug(h.id) })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const h = HOTELS.find((x) => x.id === unslug(id)); if (!h) return {};
  /* link previews use the hotel's own cover photo when it has sent one, otherwise the island's photo */
  return pageMeta({ title: `${h.n}, ${ZN[h.z]?.name}`, description: `${h.n}: ${h.t} stay on ${ZN[h.z]?.name}, Andaman${h.rt ? `, rated ${h.rt} on Google` : ''}. Rooms from ${inr(hotelFrom(h))} a night. Book it with your ferries and transfers in one plan.`, path: `/stays/${id}`, image: hotelCover(h.id) || `/img/f/${zonePhoto(h.z)}.webp` });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const h = HOTELS.find((x) => x.id === unslug(id)); if (!h) notFound();
  const z = ZN[h.z];
  /* Google ratings are shown on the page but not marked up: Google does not allow ratings taken from another site in review markup */
  const ld = { '@context': 'https://schema.org', '@type': 'LodgingBusiness', name: h.n, url: abs(`/stays/${id}`), address: { '@type': 'PostalAddress', addressLocality: z?.name, addressRegion: 'Andaman and Nicobar Islands', addressCountry: 'IN' }, containedInPlace: { '@type': 'Place', name: `${z?.name}, Andaman and Nicobar Islands` }, priceRange: `${inr(hotelFrom(h))}+ a night`, ...(hotelCover(h.id) ? { image: abs(hotelCover(h.id) as string) } : {}), checkinTime: '12:00', checkoutTime: '10:00' };
  return (
    <>
      <div className="wrap pg-plain"><span className="eyebrow">{h.t} stay · {z?.name}</span><h1>{h.n}</h1>{h.rt && <span className="muted">★ {h.rt} on Google{h.rv ? ` · ${h.rv.toLocaleString('en-IN')} reviews` : ''}</span>}</div>
      <div className="wrap"><div className="pg-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <HotelGallery id={h.id} name={h.n} />
          <div className="facts">
            <div><small>Island</small><b>{z?.name}</b></div><div><small>Type</small><b>{h.t}</b></div><div><small>From</small><b>{inr(hotelFrom(h))} / night</b></div><div><small>Check-in</small><b>12:00 · out 10:00</b></div>
          </div>
          <div className="card"><h3 style={{ fontSize: 17 }}>Rooms</h3>
            {h.rooms.map((r) => <div key={r.n} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{r.n} <small className="muted">· {r.mp} · up to {r.ma}</small></span><b className="mono">{inr(r.s_hi || r.s_ln)}</b></div>)}
          </div>
          <p className="note">Prices change with the season (peak 15 Dec–15 Jan). Arriving early? Your plan asks the hotel for early check-in.</p>
          <p><a className="link" href={`/islands/${slug(h.z)}`}>More on {z?.name} →</a></p>
        </div>
        <aside><Suspense><AddPanel kind="stay" id={h.id} /></Suspense></aside>
      </div></div>
      <JsonLd data={[ld, crumbs([['Home', '/'], ['Stays', '/stays'], [z?.name || 'Island', `/islands/${slug(h.z)}`], [h.n, `/stays/${id}`]])]} />
    </>
  );
}
