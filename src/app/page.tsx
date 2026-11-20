/* Home. Rendered on the server from the catalogue; only the plan box and "today" wait for the phone. */
import Link from 'next/link';
import { HomeNow, HomePlan, HomeToday } from '@/views/Home';
import DayPlans from '@/components/DayPlans';
import Rail from '@/components/browse/Rail';
import { Card, inr } from '@/components/browse/cards';
import { TideIcon } from '@/components/Brand';
import { HOTELS, SAILS, zonePhoto } from '@/lib/catalogue';
import { COUNTS, ISLES, actItems, isleName, tripItems } from '@/lib/browse';
import { RECOGNITIONS } from '@/lib/company';
import data from '@/data/catalogue.json';
import { pageMeta } from '@/lib/seo';

export const metadata = { ...pageMeta({ title: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan', description: 'Plan and book an Andaman trip as one itinerary. Ferries, hotels, cabs and things to do on Havelock, Neil, Port Blair and beyond, with every connection checked before you pay.', path: '/' }), title: { absolute: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan' } };

const D = data as any;
const KINDS = [
  { href: '/ferries', k: 'boat', icon: 'boat', n: 'Ferries', sub: `${SAILS.length} sailings` },
  { href: '/stays', k: 'stay', icon: 'bed', n: 'Stays', sub: `${COUNTS.stays} places` },
  { href: '/cabs', k: 'cab', icon: 'car', n: 'Cabs', sub: `${D.routes.filter((r: any) => !r.hop).length} routes` },
  { href: '/things-to-do', k: 'sight', icon: 'sunset', n: 'Things to do', sub: `${COUNTS.acts} picks` },
];

export default function Page() {
  const acts = actItems(); const trips = tripItems().filter((t) => t.cs.includes('picks'));
  const loved = acts.slice(0, 10);
  return (
    <div className="atp-home">
      <div className="atp-htop">
      <section className="atp-hhero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/f/i179.webp" alt="Ross and Smith Islands, Diglipur, joined by a sandbar" width={1280} height={853} fetchPriority="high" decoding="async" />
        <div className="atp-hhero-b"><HomeNow /><h1>Andaman, planned to the minute.</h1><p>Ferries, stays, cabs and things to do, checked against each other before you pay.</p></div>
      </section>
      <HomePlan trips={COUNTS.trips} />
      </div>

      <section className="atp-hs">
        <h2>Book one thing</h2>
        <div className="atp-kgrid">
          {KINDS.map((x) => <Link key={x.href} className={`atp-kb k-${x.k}`} href={x.href} prefetch={false}><TideIcon n={x.icon} s={24} /><b>{x.n}</b><small>{x.sub}</small></Link>)}
        </div>
        <Link className="atp-strip" href="/charters" prefetch={false}><TideIcon n="wave" /><span><b>Hire a whole boat</b><small>Private boats, fishing and sunset cruises</small></span><TideIcon n="chev" s={18} /></Link>
      </section>

      <section className="atp-hs">
        <div className="atp-hs-h"><h2>Islands</h2><span className="atp-hs-d">{ISLES.length} to explore</span></div>
        <Rail label="Islands" className="atp-rail2">
          {ISLES.map((z) => (
            <Link key={z.id} className="atp-isl" href={`/islands/${z.id.toLowerCase()}`} prefetch={false}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/img/t/${zonePhoto(z.id)}.webp`} alt="" width={296} height={392} loading="lazy" decoding="async" />
              <span className="atp-isl-b"><b>{z.n}</b><small>{z.line}</small><small className="atp-isl-n">{acts.filter((a) => a.z === z.id).length} to do · {HOTELS.filter((h) => h.z === z.id).length} stays</small></span>
            </Link>
          ))}
        </Rail>
      </section>

      <section className="atp-hs" id="trips">
        <div className="atp-hs-h"><h2>Ready-made trips</h2><Link className="atp-btn is-text" href="/trips" prefetch={false}>All {COUNTS.trips}</Link></div>
        <p className="atp-lead">Whole trips, already checked for ferry times, closed days and check-in times. Change anything after.</p>
        <Rail label="Ready-made trips" className="atp-rail2">
          {trips.map((t) => (
            <Link key={t.id} className="atp-pk" href={t.href} prefetch={false}>
              <span className="atp-pk-ph">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.ph} alt="" width={520} height={293} loading="lazy" decoding="async" /><span className="atp-pk-tag">{t.tag}</span>
              </span>
              <span className="atp-pk-b"><b>{t.n}</b><small>{t.l2}</small><small>{t.l1.split(' · ')[1]}</small>
                <span className="atp-pk-p"><b>{inr(t.p || 0)}</b><small>a person, incl. GST · checked as one trip</small></span></span>
            </Link>
          ))}
        </Rail>
      </section>

      <section className="atp-hs">
        <div className="atp-hs-h"><h2>Most loved</h2><Link className="atp-btn is-text" href="/things-to-do" prefetch={false}>All {COUNTS.acts}</Link></div>
        <Rail label="Most loved things to do" className="atp-rail2">{loved.map((a) => <Card key={a.id} it={a} isle={isleName(a.z)} />)}</Rail>
      </section>

      <section className="atp-hs"><DayPlans /></section>
      <HomeToday />

      <section className="atp-hs">
        <h2>Why trips hold together</h2>
        <div className="atp-why3">
          <div><b>{SAILS.length}</b><span>ferry sailings from the operators’ own timetables</span></div>
          <div><b>{D.rules.length}</b><span>island rules checked every time you change anything</span></div>
          <div><b>{COUNTS.stays}</b><span>stays, with their real check-in and check-out times</span></div>
        </div>
        <p className="atp-fine">A DPIIT-recognised startup, member of TAAI and IATO.</p>
        <div className="atp-logos">{RECOGNITIONS.filter((r) => /startup|taai|iato/.test(r.file)).map((r) => (
          // eslint-disable-next-line @next/next/no-img-element
          <span key={r.file} className="atp-lg"><img src={`/img/logos/${r.file}`} alt={r.name} width={120} height={32} loading="lazy" decoding="async" /></span>
        ))}</div>
      </section>
    </div>
  );
}
