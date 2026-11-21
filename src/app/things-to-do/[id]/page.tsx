import MapFrame from '@/components/MapFrame';
import { inIsles, mapPlace } from '@/lib/maps';
import AskWhatsApp from '@/components/AskWhatsApp';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import AddPanel from '@/components/AddPanel';
import { ACTS, ZN, actPhoto, durTxt, inr, per, slug, unslug } from '@/lib/catalogue';
import { actCat, isleName, moreLike } from '@/lib/browse';
import Rail from '@/components/browse/Rail';
import { Card, Rate } from '@/components/browse/cards';
import { TideIcon } from '@/components/Brand';
import INC from '@/data/included.json';
import JsonLd from '@/components/seo/JsonLd';
import { abs, crumbs, pageMeta } from '@/lib/seo';

export function generateStaticParams() { return ACTS.map((a) => ({ id: slug(a.id) })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const a = ACTS.find((x) => x.id === unslug(id)); if (!a) return {};
  const z = ZN[a.z]?.name;
  return pageMeta({ title: `${a.n}, ${z}: price and timings`, description: `${a.n} on ${z}, Andaman: ${a.v}. ${a.p ? `From ${inr(a.p)} ${per(a.b)}.` : ''} Book it inside your Andaman itinerary, timed around ferries and check-ins.`, path: `/things-to-do/${id}`, image: `/img/f/${actPhoto(a.id)}.webp` });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const a = ACTS.find((x) => x.id === unslug(id)); if (!a) notFound();
  const z = ZN[a.z];
  const facts = [['Island', z?.name], ['How long', durTxt(a.d)], ['When', a.slot || a.t], ['Where', a.site], ['Age', a.age ? `${a.age}+` : ''], ['Season', a.sea], ['Rating', a.g?.rt ? `★ ${a.g.rt} on Google${a.g.n ? ` (${a.g.n.toLocaleString('en-IN')})` : ''}` : '']].filter(([, v]) => v);
  const ld = { '@context': 'https://schema.org', '@type': 'TouristTrip', name: a.n, description: a.v, url: abs(`/things-to-do/${id}`), image: abs(`/img/f/${actPhoto(a.id)}.webp`), touristType: a.fam, provider: { '@id': abs('/#org') }, offers: a.p ? { '@type': 'Offer', price: a.p, priceCurrency: 'INR', url: abs(`/things-to-do/${id}`), availability: 'https://schema.org/InStock' } : undefined, itinerary: { '@type': 'Place', name: `${a.site || z?.name}, Andaman and Nicobar Islands` } };
  const cat = actCat(a); const fi = (INC as Record<string, { inc: string[]; not: string[]; bring: string[] }>)[a.fam];
  const hours = a.open && a.close ? `Open ${a.open} to ${a.close}` : '';
  const meta = [durTxt(a.d) && ['clock', durTxt(a.d)], (hours || a.slot) && ['cal', hours || `${a.slot}${a.t ? ` · from ${a.t}` : ''}`], a.age && ['kid', `Age ${a.age}+`], a.sea && ['sunrise', a.sea], a.cond && ['wave', a.cond]].filter(Boolean) as [string, string][];
  const like = moreLike(a); const more = like.items;
  return (
    <div className="atp-pg atp-detail">
      <div className="atp-dmain">
        <div className="atp-dhero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/img/f/${actPhoto(a.id)}.webp`} alt={`${a.n}, ${z?.name}`} width={1280} height={853} fetchPriority="high" decoding="async" />
        </div>
        <section className="atp-cs is-first">
          <span className="atp-eyebrow"><a href={`/things-to-do?island=${slug(a.z)}${cat ? `&cat=${cat.k}` : ''}`}>{cat?.n || a.fam}</a> · <a href={`/islands/${slug(a.z)}`}>{z?.name}</a></span>
          <h1 className="atp-h1">{a.n}</h1>
          <p className="atp-lead">{a.v}</p>
          {a.g?.rt ? <p className="atp-rateline"><Rate rt={a.g.rt} rv={a.g.rv ?? null} /><small>on Google{a.site ? ` · ${a.site}` : ''}</small></p> : null}
          <div className="atp-meta">{meta.map(([ic, t]) => <span key={t}><TideIcon n={ic} s={16} />{t}</span>)}</div>
        </section>
        <section className="atp-cs atp-dbuy" aria-label="Add to your trip"><Suspense><AddPanel kind="act" id={a.id} /></Suspense>
          <p className="atp-fine">{a.p ? `From ${inr(a.p)} ${per(a.b)}, before GST.` : a.p === 0 ? 'Free to visit.' : 'Price on request.'} When you add it, the time is checked against your ferries, cabs and stay. The trip total adds GST and a convenience fee, both shown before you pay.</p>
          <AskWhatsApp about={`I have a question about “${a.n}” on ${z?.name || 'the islands'}.`} path={`/things-to-do/${id}`} /></section>
        {a.steps && a.steps.length > 0 && <section className="atp-cs"><h2>How the day goes</h2><ol className="atp-steps2">{a.steps.map(([t, x], i) => <li key={i}><b>{t}</b>{x}</li>)}</ol></section>}
        {fi && fi.inc.length > 0 && (
          <section className="atp-cs"><h2>Included</h2>
            <ul className="atp-ul is-ok">{fi.inc.map((x) => <li key={x}><TideIcon n="check" s={18} /><span>{x}</span></li>)}</ul>
            {fi.not.length > 0 && <><div className="atp-sec">Not included</div><ul className="atp-ul is-no">{fi.not.map((x) => <li key={x}><TideIcon n="x" s={18} /><span>{x}</span></li>)}</ul></>}
            {fi.bring.length > 0 && <><div className="atp-sec">Bring</div><ul className="atp-ul">{fi.bring.map((x) => <li key={x}><TideIcon n="check" s={18} /><span>{x}</span></li>)}</ul></>}
          </section>
        )}
        {a.g && a.g.k && z && (() => { const m = mapPlace({ q: inIsles(a.g!.k, z.name), pid: a.g!.pid }); return <section className="atp-cs"><h2>Where it is</h2><MapFrame embed={m.embed} href={m.href} title={`${a.g!.k}, ${z.name}`} /></section>; })()}
        {(a.note || a.cond) && <section className="atp-cs"><h2>Good to know</h2>{a.note && <p className="atp-lead">{a.note}</p>}{a.cond && <p className="atp-lead">Runs when: {a.cond}. Sea and weather permitting; we confirm the slot before you pay.</p>}</section>}
        {more.length > 2 && <section className="atp-cs"><div className="atp-hs-h"><h2>{like.mixed ? 'More like this' : `More like this on ${z?.name}`}</h2>{like.mixed && <span className="atp-hs-d">{z?.name} first, then other islands</span>}</div><Rail label="More like this" className="atp-rail2">{more.map((x) => <Card key={x.id} it={x} isle={like.mixed ? isleName(x.z) : undefined} />)}</Rail></section>}
      </div>
      <JsonLd data={[ld, crumbs([['Home', '/'], ['Things to do', '/things-to-do'], [z?.name || 'Island', `/islands/${slug(a.z)}`], [a.n, `/things-to-do/${id}`]])]} />
    </div>
  );
}
