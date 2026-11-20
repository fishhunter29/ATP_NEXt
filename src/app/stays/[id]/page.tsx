import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import AddPanel from '@/components/AddPanel';
import { HOTELS, ZN, hotelFrom, inr, slug, unslug, zonePhoto } from '@/lib/catalogue';
import JsonLd from '@/components/seo/JsonLd';
import { HotelGallery, hotelCover } from '@/components/HotelPhoto';
import { stayItems } from '@/lib/browse';
import Rail from '@/components/browse/Rail';
import { Card, Rate } from '@/components/browse/cards';
import { TideIcon } from '@/components/Brand';

const MEAL: Record<string, string> = { CP: 'With breakfast', MAP: 'Breakfast and dinner', AP: 'All meals', EP: 'Room only' };
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
  const more = stayItems().filter((x) => x.z === h.z && x.id !== h.id && x.cs.includes(h.t)).slice(0, 8);
  return (
    <div className="atp-pg atp-detail">
      <div className="atp-dmain">
        <HotelGallery id={h.id} name={h.n} />
        <section className="atp-cs is-first">
          <span className="atp-eyebrow"><a href={`/stays?island=${slug(h.z)}&cat=${h.t}`}>{h.t} stay</a> · <a href={`/islands/${slug(h.z)}`}>{z?.name}</a></span>
          <h1 className="atp-h1">{h.n}</h1>
          {h.rt ? <p className="atp-rateline"><Rate rt={h.rt} rv={h.rv} /><small>on Google</small></p> : null}
          <div className="atp-meta">{h.a && <span><TideIcon n="pin" s={16} />{h.a}</span>}<span><TideIcon n="clock" s={16} />Check-in 12:00 · out 10:00</span><span><TideIcon n="bed" s={16} />{h.rooms.length} room type{h.rooms.length > 1 ? 's' : ''}</span></div>
        </section>
        <section className="atp-cs atp-dbuy" aria-label="Add to your trip"><Suspense><AddPanel kind="stay" id={h.id} /></Suspense>
          <p className="atp-fine">Prices change with the season (peak 15 Dec to 15 Jan). Your cabs to and from the jetty follow this hotel automatically.</p></section>
        <section className="atp-cs"><h2>Rooms</h2>
          <ul className="atp-rooms">{h.rooms.map((r) => <li key={r.n}><span><b>{r.n}</b><small>{MEAL[r.mp] || r.mp} · sleeps {r.ma}</small></span><span className="atp-fr-p"><b>{inr(r.s_hi || r.s_ln)}</b><small>a night</small></span></li>)}</ul>
          <p className="atp-fine">Arriving early? Your plan asks the hotel for early check-in.</p></section>
        {more.length > 2 && <section className="atp-cs"><div className="atp-hs-h"><h2>More {h.t.toLowerCase()} stays on {z?.name}</h2></div><Rail label="Similar stays" className="atp-rail2">{more.map((x) => <Card key={x.id} it={x} notag />)}</Rail></section>}
      </div>
      <JsonLd data={[ld, crumbs([['Home', '/'], ['Stays', '/stays'], [z?.name || 'Island', `/islands/${slug(h.z)}`], [h.n, `/stays/${id}`]])]} />
    </div>
  );
}
