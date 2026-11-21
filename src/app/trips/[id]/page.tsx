import AskWhatsApp from '@/components/AskWhatsApp';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlannedTripBuy } from '@/views/Packages';
import { PACKAGES, paxTxt, routeTxt } from '@/components/seo/Indexes';
import JsonLd from '@/components/seo/JsonLd';
import { ZN, inr, slug, zonePhoto } from '@/lib/catalogue';
import { tripItems } from '@/lib/browse';
import { TideIcon } from '@/components/Brand';
import { abs, crumbs, pageMeta } from '@/lib/seo';

const find = (id: string) => PACKAGES.find((p) => p.id.toLowerCase() === id.toLowerCase());
export function generateStaticParams() { return PACKAGES.map((p) => ({ id: slug(p.id) })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const p = find(id); if (!p) return {};
  return pageMeta({ title: `${p.n}: ${p.nights}-night Andaman trip`, description: `${p.nights} nights, ${p.nights + 1} days: ${routeTxt(p)}. ${p.hl.join('. ')}. About ${inr(p.total)} for ${paxTxt(p)}, every ferry checked. Load it and change anything.`, path: `/trips/${slug(p.id)}`, image: `/img/f/${zonePhoto(p.route[1]?.[0] || p.route[0][0])}.webp` });
}

const KIND: Record<string, [string, string]> = { ferry: ['k-boat', 'boat'], stay: ['k-stay', 'bed'], cab: ['k-cab', 'car'], act: ['k-sight', 'sunset'], rent: ['k-cab', 'wave'] };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const p = find(id); if (!p) notFound();
  const path = `/trips/${slug(p.id)}`;
  const ld = { '@context': 'https://schema.org', '@type': 'TouristTrip', name: p.n, description: `${p.nights} nights: ${routeTxt(p)}. ${p.hl.join('. ')}.`, url: abs(path), touristType: p.tag || undefined, provider: { '@id': abs('/#org') },
    offers: { '@type': 'Offer', price: p.total, priceCurrency: 'INR', url: abs(path), description: `For ${paxTxt(p)}, including GST` },
    itinerary: { '@type': 'ItemList', itemListElement: p.route.map(([z, n], i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'TouristDestination', name: `${ZN[z]?.name} (${n} night${n > 1 ? 's' : ''})`, url: abs(`/islands/${z.toLowerCase()}`) } })) } };
  const item = tripItems().find((t) => t.id === p.id);
  const count = (k: string) => p.days.flat().filter((x) => x.kind === k).length;
  const counts = [[count('stay'), 'stay'], [count('ferry'), 'ferry', 'ferries'], [count('cab'), 'cab ride'], [count('act'), 'thing to do', 'things to do']].filter(([n]) => n).map(([n, one, many]) => `${n} ${n === 1 ? one : many || one + 's'}`).join(' · ');
  return (
    <div className="atp-pg atp-detail">
      <div className="atp-dmain">
        <div className="atp-dhero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={(item?.ph || `/img/t/${zonePhoto('HAV')}.webp`).replace('/img/t/', '/img/f/')} alt="" width={1280} height={853} fetchPriority="high" decoding="async" />
          {item?.tag && <span className="atp-pk-tag">{item.tag}</span>}
        </div>
        <section className="atp-cs is-first">
          <span className="atp-eyebrow">{p.nights + 1} days · {p.nights} nights · for {paxTxt(p)} · {p.tier} stays</span>
          <h1 className="atp-h1">{p.n}</h1>
          <p className="atp-route2">{p.route.map(([z, n], i) => <span key={i}>{i > 0 && <i>→</i>}<a href={`/islands/${z.toLowerCase()}`}><em style={{ background: `var(--z-${z})` }} />{ZN[z]?.name} <small>{n}N</small></a></span>)}</p>
          <ul className="atp-ul is-ok">{p.hl.map((h) => <li key={h}><TideIcon n="check" s={18} /><span>{h}</span></li>)}</ul>
          <div className="atp-fits"><span className="atp-tile k-ok"><TideIcon n="check" /></span><div><b>Checked as one trip</b><span>{p.bookings} bookings, 0 clashes: ferry times, opening days and check-in times all fit. {counts}.</span></div></div>
        </section>
        <section className="atp-cs atp-dbuy" aria-label="Use this trip"><PlannedTripBuy id={p.id} />
          <AskWhatsApp about={`I’m interested in the trip “${p.n}” (${p.nights} nights: ${routeTxt(p)}).`} path={path} hint="Ask us to change it for your dates, group or budget." withTrip={false} /></section>
        <section className="atp-cs"><h2>Day by day</h2>
          {p.days.map((items, i) => { const zs = [...new Set(items.map((x) => x.zone).filter(Boolean))]; const zl = zs[zs.length - 1]; return (
            <div key={i}>
              <div className="atp-dd-h"><b>Day {i + 1}</b>{zl && <span className="atp-zone"><i style={{ background: `var(--z-${zl})` }} />{zs.map((z) => ZN[z]?.name).join(' → ')}</span>}</div>
              <ul className="atp-dd">{items.map((it, k) => { const [cls, ic] = KIND[it.kind] || ['', 'pin']; const href = it.kind === 'act' ? `/things-to-do/${it.ref.toLowerCase()}` : it.kind === 'stay' ? `/stays/${it.ref.toLowerCase()}` : null; return (
                <li key={k}><span className="atp-t atp-mono">{it.t}</span><span className={`atp-tile ${cls}`}><TideIcon n={ic} s={18} /></span>
                  <span>{href ? <a href={href}><b>{it.title}</b></a> : <b>{it.title}</b>}{it.sub && <small>{it.sub}</small>}</span></li>
              ); })}</ul>
            </div>
          ); })}
        </section>
        <section className="atp-cs"><h2>Before you use it</h2>
          <div className="atp-pol"><TideIcon n="cal" /><span><b>Your dates and people</b><small>We rebuild it for your dates and group, then check it again. Prices follow.</small></span></div>
          <div className="atp-pol"><TideIcon n="plane" /><span><b>Your flights</b><small>Add them and the first and last day move to fit. The last night is in Port Blair, so a rough sea never makes you miss your flight.</small></span></div>
          <div className="atp-pol"><TideIcon n="plus" /><span><b>Change anything</b><small>Swap a stay, add a day, drop an activity. It becomes your trip.</small></span></div>
        </section>
      </div>
      <JsonLd data={[ld, crumbs([['Home', '/'], ['Planned trips', '/trips'], [p.n, path]])]} />
    </div>
  );
}
