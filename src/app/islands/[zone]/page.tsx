import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ACTS, HOTELS, ZN, ZONES, ferryRoutes, inr, slug, unslug, zonePhoto } from '@/lib/catalogue';
import { BEST_FOR, actCats, actItems, stayItems } from '@/lib/browse';
import Rail from '@/components/browse/Rail';
import { Card } from '@/components/browse/cards';
import { TideIcon } from '@/components/Brand';
import PLANS from '@/data/dayplans.json';
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
  const ld = { '@context': 'https://schema.org', '@type': 'TouristDestination', name: `${z.name} (${z.official})`, alternateName: z.official, description: z.notes, url: abs(`/islands/${zone}`), image: abs(`/img/f/${zonePhoto(z.id)}.webp`), containedInPlace: { '@type': 'Place', name: 'Andaman and Nicobar Islands, India' },
    includesAttraction: acts.slice(0, 10).map((a) => ({ '@type': 'TouristAttraction', name: a.n, url: abs(a.href) })) };
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
      </section>
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
        <Link className="atp-strip" href={`/cabs?zone=${z.id}`} prefetch={false}><TideIcon n="car" /><span><b>Cabs and scooters on {z.name}</b><small>Jetty, hotel and sightseeing rides</small></span><TideIcon n="chev" s={18} /></Link>
      </section>
      {/* everything on the island as plain links, for search engines and for anyone who wants the whole list */}
      <nav className="atp-cs atp-index" aria-label={`Everything on ${z.name}`}>
        <h2>Everything on {z.name}</h2>
        <ul>{acts.map((a) => <li key={a.id}><a href={a.href}>{a.n}{a.l1 ? `: ${a.l1}` : ''}</a></li>)}{stays.map((h) => <li key={h.id}><a href={h.href}>{h.n}</a></li>)}</ul>
      </nav>
      <JsonLd data={[ld, crumbs([['Home', '/'], [z.name, `/islands/${zone}`]])]} />
    </div>
  );
}

function DayPlansSection({ zone }: { zone: string }) {
  if (!(PLANS as { z: string }[]).some((p) => p.z === zone)) return null;
  return <section className="atp-cs"><DayPlans zone={zone} /></section>;
}
