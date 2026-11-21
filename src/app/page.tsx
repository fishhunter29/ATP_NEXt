/* Home. Rendered on the server from the catalogue; only the plan box and "today" wait for the phone. */
import AskWhatsApp from '@/components/AskWhatsApp';
import Link from 'next/link';
import { HomeNow, HomePlan, HomeToday } from '@/views/Home';
import DayPlans from '@/components/DayPlans';
import Rail from '@/components/browse/Rail';
import { Card, inr } from '@/components/browse/cards';
import { TideIcon } from '@/components/Brand';
import { HOTELS, SAILS, zonePhoto } from '@/lib/catalogue';
import { COUNTS, ISLES, actItems, isleName, signatureItems, tripItems } from '@/lib/browse';
import { RECOGNITIONS } from '@/lib/company';
import Promises from '@/components/Promises';
import data from '@/data/catalogue.json';
import { pageMeta } from '@/lib/seo';
import Faq from '@/components/seo/Faq';
import { COMPANY } from '@/lib/company';
import { ZONES, ferryRoutes } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';

export const metadata = { ...pageMeta({ title: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan', description: 'Plan and book an Andaman trip as one itinerary. Ferries, hotels, cabs and things to do on Havelock, Neil, Port Blair and beyond, with every connection checked before you pay.', path: '/' }), title: { absolute: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan' } };

const D = data as any;
const KINDS = [
  { href: '/ferries', k: 'boat', tour: 'ferries', icon: 'boat', n: 'Ferries', sub: `${SAILS.length} sailings` },
  { href: '/stays', k: 'stay', icon: 'bed', n: 'Stays', sub: `${COUNTS.stays} places` },
  { href: '/cabs', k: 'cab', tour: 'cabs', icon: 'car', n: 'Cabs', sub: `${D.routes.filter((r: any) => !r.hop).length} routes` },
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

      <section className="atp-promband" aria-label="Our promise">
        <span className="atp-eyebrow">Our promise</span>
        <h2>You choose the trip. We confirm it in 30 minutes.</h2>
        <p>Send us the trip you built, or any single stay, ferry, cab or activity. We check it with the partner and reply on WhatsApp. You pay only when everything is confirmed.</p>
        <Promises dark />
      </section>
      </div>

      <section className="atp-hs">
        <h2>Book one thing</h2>
        <div className="atp-kgrid">
          {KINDS.map((x) => <Link key={x.href} className={`atp-kb k-${x.k}`} href={x.href} prefetch={false} data-tour={(x as { tour?: string }).tour}><TideIcon n={x.icon} s={24} /><b>{x.n}</b><small>{x.sub}</small></Link>)}
        </div>
        <Link className="atp-boat" href="/charters" prefetch={false}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/f/i149.webp" alt="A private boat on open blue water, seen from above" width={1280} height={720} loading="lazy" decoding="async" />
          <span className="atp-boat-b"><span><small>Private charters</small><b>Hire a whole boat</b><span>Game fishing, sunset cruises and island hops, for your group alone</span></span>
            <span className="atp-boat-go" aria-hidden="true"><TideIcon n="arrow" /></span></span>
        </Link>
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

      <section className="atp-hs" id="signature">
        <div className="atp-hs-h"><h2>Signature experiences</h2><span className="atp-hs-d">Only in the Andamans</span></div>
        <Rail label="Signature experiences" className="atp-rail2">{signatureItems().map((a) => <Card key={a.id} it={a} isle={isleName(a.z)} />)}</Rail>
      </section>

      <section className="atp-hs" id="trips" data-tour="trips">
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
                <span className="atp-pk-p"><b>{inr(t.p || 0)}</b><small>a person, incl. GST and fee · checked as one trip</small></span></span>
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
        <AskWhatsApp about="I’d like help planning an Andaman trip." label="Talk to a planner on WhatsApp" hint="We live in Port Blair. Ask anything before you book." />
        <p className="atp-fine">A DPIIT-recognised startup, member of TAAI and IATO.</p>
        <div className="atp-logos">{RECOGNITIONS.filter((r) => /startup|taai|iato/.test(r.file)).map((r) => (
          // eslint-disable-next-line @next/next/no-img-element
          <span key={r.file} className="atp-lg"><img src={`/img/logos/${r.file}`} alt={r.name} width={120} height={32} loading="lazy" decoding="async" /></span>
        ))}</div>
      </section>

      {/* the questions people ask before an Andaman trip, answered from the same data the site runs on */}
      <div className="atp-hs atp-homefaq"><Faq title="Planning an Andaman trip: questions people ask" items={homeFaq()} /></div>
    </div>
  );
}

function homeFaq(): [string, string][] {
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
  const R = ferryRoutes(); const leg = (k: string) => { const r = R.find((x) => x.key === k); if (!r) return ''; const d = r.list.map((x) => (mins(x.arr) - mins(x.dep) + 1440) % 1440).filter((m) => m > 0).sort((a, b) => a - b); return `${r.list.length} sailings a day, about ${dur(d[0])}`; };
  const nights = (PKGS as { nights: number }[]).map((p) => p.nights); const top = [...new Set(nights)].map((n) => [n, nights.filter((x) => x === n).length]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n).sort((a, b) => a - b);
  const Z = Object.fromEntries(ZONES.map((z) => [z.id, z])); const stay = (id: string) => { const z = Z[id]; return z && z.minN && z.maxN ? (z.minN === z.maxN ? `${z.minN}` : `${z.minN} to ${z.maxN}`) : ''; };
  return [
    ['How do I book an Andaman trip with Andaman Travel Planner?', 'Build your trip on the site, or pick a ready-made one, and send it for confirmation. We confirm every stay, ferry, cab and activity with the partner within 30 minutes on WhatsApp. You pay once, only after everything is confirmed.'],
    ['When is peak season in the Andamans?', 'Peak season is 15 December to 15 January. Private ferries sell out first in these weeks, so fix the ferries before anything else. High season runs from October to mid-May, and the rainy season from mid-May to the end of September.'],
    ['How many days do I need for the Andamans?', `Most of our ${nights.length} ready-made trips are ${top.join(', ')} nights. A first trip usually has ${stay('PBL')} nights in Port Blair, ${stay('HAV')} on Havelock and ${stay('NEI')} on Neil, with the last night in Port Blair before the flight home.`],
    ['How do I travel between Port Blair, Havelock and Neil?', `By ferry. Port Blair to Havelock has ${leg('pbl-hav')}; Havelock to Neil has ${leg('hav-nei')}; Neil to Port Blair has ${leg('nei-pbl')}. Our team books the tickets and asks you which seats you would like.`],
    ['Is this the best price for an Andaman trip?', 'We are based in Port Blair and deal with every hotel, boat operator and driver ourselves, with no middleman from the mainland in between, so we give you the best price available in India. Prices on the site are before GST; the trip total shows GST and our convenience fee before you pay.'],
    ['Will someone call me to sell a package?', 'No. You choose the trip; we confirm it. If something is full, we tell you the closest option and its price on WhatsApp, and you decide.'],
    ['How do I reach you?', `On WhatsApp at ${COMPANY.whatsapp}, or by email at ${COMPANY.email}. Every page has an "Ask on WhatsApp" button with the question already written.`],
  ];
}
