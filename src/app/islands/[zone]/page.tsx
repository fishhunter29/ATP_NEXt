import Faq from '@/components/seo/Faq';
import MapFrame from '@/components/MapFrame';
import { inIsles, mapPlace } from '@/lib/maps';
import AskWhatsApp from '@/components/AskWhatsApp';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ACTS, HOTELS, ZN, ZONES, ferryRoutes, inr, slug, unslug, zonePhoto } from '@/lib/catalogue';
import { BEST_FOR, actCats, actItems, stayItems } from '@/lib/browse';
import Rail from '@/components/browse/Rail';
import { Card } from '@/components/browse/cards';
import { TideIcon } from '@/components/Brand';
import PLANS from '@/data/dayplans.json';
import GUIDES from '@/data/islandguides.json';
import JsonLd from '@/components/seo/JsonLd';
import DayPlans from '@/components/DayPlans';
import { abs, crumbs, pageMeta } from '@/lib/seo';

export function generateStaticParams() { return ZONES.map((z) => ({ zone: slug(z.id) })); }

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const { zone } = await params; const z = ZN[unslug(zone)]; if (!z) return {};
  return pageMeta({ title: `${z.name} (${z.official}): stays, ferries and things to do`, description: `Plan ${z.name} in the Andaman Islands: ${HOTELS.filter((h) => h.z === z.id).length} stays, ${ACTS.filter((a) => a.z === z.id).length} things to do, ferry times and how to get there. ${z.notes}`, path: `/islands/${zone}`, image: `/img/f/${zonePhoto(z.id)}.webp` });
}

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params; const z = ZN[unslug(zone)]; if (!z) notFound();
  const acts = actItems().filter((a) => a.z === z.id); const stays = stayItems().filter((h) => h.z === z.id);
  const cats = actCats.map((c) => ({ c, n: acts.filter((a) => a.cs.includes(c.k)).length })).filter((x) => x.n);
  const routes = ferryRoutes().filter((r) => r.to === z.id); const onward = ferryRoutes().filter((r) => r.from === z.id);
  const nights = z.minN && z.maxN ? (z.minN === z.maxN ? `${z.minN} night${z.minN > 1 ? 's' : ''}` : `${z.minN}–${z.maxN} nights`) : z.typN ? `${z.typN} nights` : 'A day trip';
  const q = `?island=${zone}`;
  const g = (GUIDES as unknown as Record<string, Guide>)[z.id];
  const turtles = ['RAN', 'MAY', 'DIG'].includes(z.id);
  const ld = { '@context': 'https://schema.org', '@type': 'TouristDestination', name: `${z.name} (${z.official})`, alternateName: z.official, description: g ? g.about[0] : z.notes, url: abs(`/islands/${zone}`), image: abs(`/img/f/${zonePhoto(z.id)}.webp`), containedInPlace: { '@type': 'Place', name: 'Andaman and Nicobar Islands, India' },
    includesAttraction: acts.slice(0, 10).map((a) => ({ '@type': 'TouristAttraction', name: a.n, url: abs(a.href) })) };
  const fastest = routes.flatMap((r) => r.list.map((s) => ({ m: (Number(s.arr.slice(0, 2)) * 60 + Number(s.arr.slice(3, 5)) - Number(s.dep.slice(0, 2)) * 60 - Number(s.dep.slice(3, 5)) + 1440) % 1440, from: ZN[r.from]?.name }))).filter((x) => x.m > 0).sort((x, y) => x.m - y.m)[0];
  const faq: [string, string][] = [
    [`How do I reach ${z.name}?`, [z.reach ? `${z.reach}.` : '', z.jetty ? `Jetty: ${z.jetty}.` : '', fastest ? `The fastest ferry from ${fastest.from} takes about ${fastest.m >= 60 ? `${Math.floor(fastest.m / 60)} h${fastest.m % 60 ? ` ${fastest.m % 60} min` : ''}` : `${fastest.m} min`}.` : ''].filter(Boolean).join(' ')],
    [`How many nights should I stay on ${z.name}?`, stays.length ? `${nights} suits most trips.${(z as any).nNote ? ` ${(z as any).nNote}.` : ''}` : `Most people visit ${z.name} as a day trip.`],
    [`What is ${z.name} best for?`, BEST_FOR[z.id] ? `${BEST_FOR[z.id]}. ${z.notes}` : z.notes],
    [`What is there to do on ${z.name}?`, acts.length ? `${acts.length} things to do are listed here: ${cats.slice(0, 5).map((x) => `${x.n} ${x.c.n.toLowerCase()}`).join(', ')}.` : ''],
    [`Is ${z.name} the same as ${z.official}?`, z.official && z.official !== z.name ? `Yes. ${z.official} is the official name; most travellers and boat operators still say ${z.name}.` : ''],
  ];
  return (
    <div className="atp-pg atp-isle">
      <section className="atp-hhero is-page">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/f/${zonePhoto(z.id)}.webp`} alt={z.name} width={1280} height={853} fetchPriority="high" decoding="async" />
        <div className="atp-hhero-b"><span className="atp-eyebrow">{z.official} · {z.region}</span><h1>{z.name}</h1></div>
      </section>
      <section className="atp-cs is-first">
        <p className="atp-lead atp-big">{z.notes} {z.reach}.</p>
        <ul className="atp-facts">
          <li><small>Best for</small><b>{BEST_FOR[z.id] || 'A quiet stop'}</b></li>
          <li><small>Stay</small><b>{stays.length ? nights : 'Day trip'}</b></li>
          <li><small>To do</small><b>{acts.length} things</b></li>
        </ul>
        {(() => { const m = mapPlace({ q: `${z.official && z.official !== z.name ? `${z.official} (${z.name})` : z.name}, Andaman and Nicobar Islands` }, 11); return <MapFrame embed={m.embed} href={m.href} title={`Map of ${z.name}`} cta={`See ${z.name} on a map`} />; })()}
        <AskWhatsApp about={`I’m planning to visit ${z.name}. Can you help me plan it?`} path={`/islands/${zone}`} hint="Ask a planner who lives here." />
      </section>
      {g && (
        <section className="atp-cs atp-guide">
          <h2>About {z.name}</h2>
          {g.about.map((t, i) => <p key={i}>{t}</p>)}
          <h3>Don’t miss</h3>
          <ul className="atp-guide-list">{g.dontMiss.map(([n, l]) => <li key={n}><b>{n}</b><span>{l}</span></li>)}</ul>
          <h3>When to go</h3>
          <p>October to May is the main season, with calm seas for ferries, diving and snorkelling. From June to September the monsoon brings rain and rough water, and some boats and water sports stop.{turtles ? ' Turtles nest on the beaches here from about December to February.' : ''}</p>
        </section>
      )}
      {routes.length > 0 && (
        <section className="atp-cs">
          <h2>Getting there</h2>
          <div className="atp-rows">{routes.map((r) => (
            <Link key={r.key} className="atp-fr" href={`/ferries/${r.key}`} prefetch={false}>
              <span className="atp-tile k-boat"><TideIcon n="boat" /></span>
              <span><b>{ZN[r.from].name} → {ZN[r.to].name}</b><small>{r.list.length} sailing{r.list.length > 1 ? 's' : ''} · first {r.list[0].dep} · last {r.list[r.list.length - 1].dep}</small></span>
              <span className="atp-fr-p"><small>from</small><b>{inr(Math.min(...r.list.map((s) => s.fare).filter(Boolean)))}</b></span>
            </Link>
          ))}</div>
          {onward.length > 0 && <><div className="atp-sec">Ferries onward</div><div className="atp-chiprow">{onward.map((r) => <Link key={r.key} className="atp-chip2" href={`/ferries/${r.key}`} prefetch={false}>to {ZN[r.to].name} <small>{r.list.length}</small></Link>)}</div></>}
        </section>
      )}
      {acts.length > 0 && (
        <section className="atp-cs">
          <div className="atp-hs-h"><h2>Things to do on {z.name}</h2><Link className="atp-btn is-text" href={`/things-to-do${q}`} prefetch={false}>All {acts.length}</Link></div>
          <div className="atp-chiprow">{cats.map(({ c, n }) => <Link key={c.k} className="atp-chip2" href={`/things-to-do${q}&cat=${c.k}`} prefetch={false}>{c.n} <small>{n}</small></Link>)}</div>
          <Rail label={`Things to do on ${z.name}`} className="atp-rail2">{acts.slice(0, 10).map((a) => <Card key={a.id} it={a} />)}</Rail>
        </section>
      )}
      <DayPlansSection zone={z.id === 'WAN' ? 'PBL' : z.id} />
      {stays.length > 0 && (
        <section className="atp-cs">
          <div className="atp-hs-h"><h2>Where to stay</h2><Link className="atp-btn is-text" href={`/stays${q}`} prefetch={false}>All {stays.length}</Link></div>
          <Rail label={`Stays on ${z.name}`} className="atp-rail2">{stays.slice(0, 10).map((h) => <Card key={h.id} it={h} />)}</Rail>
        </section>
      )}
      <section className="atp-cs">
        <h2>Getting around</h2>
        {g && <p className="atp-guide-p">{g.around}</p>}
        <Link className="atp-strip" href={`/cabs?zone=${z.id}`} prefetch={false}><TideIcon n="car" /><span><b>Cabs and scooters on {z.name}</b><small>Jetty, hotel and sightseeing rides</small></span><TideIcon n="chev" s={18} /></Link>
      </section>
      {g && g.tips.length > 0 && (
        <section className="atp-cs atp-guide">
          <h2>Good to know</h2>
          <ul className="atp-guide-tips">{g.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}
      {/* everything on the island as plain links, for search engines and for anyone who wants the whole list */}
      <nav className="atp-cs atp-index" aria-label={`Everything on ${z.name}`}>
        <h2>Everything on {z.name}</h2>
        <ul>{acts.map((a) => <li key={a.id}><a href={a.href}>{a.n}{a.l1 ? `: ${a.l1}` : ''}</a></li>)}{stays.map((h) => <li key={h.id}><a href={h.href}>{h.n}</a></li>)}</ul>
      </nav>
      <Faq items={faq} title={`${z.name}: questions people ask`} />
      <JsonLd data={[ld, crumbs([['Home', '/'], [z.name, `/islands/${zone}`]])]} />
    </div>
  );
}

type Guide = { about: string[]; dontMiss: [string, string][]; around: string; tips: string[] };

function DayPlansSection({ zone }: { zone: string }) {
  if (!(PLANS as { z: string }[]).some((p) => p.z === zone)) return null;
  return <section className="atp-cs"><DayPlans zone={zone} /></section>;
}
