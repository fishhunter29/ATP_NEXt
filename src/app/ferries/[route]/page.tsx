import Faq from '@/components/seo/Faq';
import AskWhatsApp from '@/components/AskWhatsApp';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FerryList from '@/views/FerryList';
import { ZN, ferryRoutes, inr, sailPhoto } from '@/lib/catalogue';
import JsonLd from '@/components/seo/JsonLd';
import { TideIcon } from '@/components/Brand';
import { abs, crumbs, pageMeta } from '@/lib/seo';

export function generateStaticParams() { return ferryRoutes().map((r) => ({ route: r.key })); }

export async function generateMetadata({ params }: { params: Promise<{ route: string }> }): Promise<Metadata> {
  const { route } = await params; const r = ferryRoutes().find((x) => x.key === route); if (!r) return {};
  const a = ZN[r.from].name, b = ZN[r.to].name;
  return pageMeta({ title: `${a} to ${b} ferry: timings and fares`, description: `${r.list.length} sailings from ${a} to ${b}: ${r.list.slice(0, 4).map((s) => `${s.op} ${s.dep}`).join(', ')}. Fares from ${inr(Math.min(...r.list.map((s) => s.fare || Infinity)))}. Book with your stay and transfers.`, path: `/ferries/${route}`, image: `/img/f/${sailPhoto(r.list[0].id)}.webp` });
}

export default async function Page({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params; const r = ferryRoutes().find((x) => x.key === route); if (!r) notFound();
  const a = ZN[r.from].name, b = ZN[r.to].name; const back = ferryRoutes().find((x) => x.from === r.to && x.to === r.from);
  const ld = r.list.map((s) => ({ '@context': 'https://schema.org', '@type': 'BoatTrip', name: `${s.op} ${a} to ${b} ${s.dep}`, provider: { '@type': 'Organization', name: s.op },
    departureBoatTerminal: { '@type': 'BoatTerminal', name: s.fromPt }, arrivalBoatTerminal: { '@type': 'BoatTerminal', name: s.toPt }, departureTime: s.dep, arrivalTime: s.arr,
    offers: s.fare ? { '@type': 'Offer', price: s.fare, priceCurrency: 'INR', url: abs(`/ferries/${route}`) } : undefined }));
  /* answers worked out from the timetable on this page */
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
  const durs = r.list.map((s) => (mins(s.arr) - mins(s.dep) + 1440) % 1440).filter((m) => m > 0).sort((x, y) => x - y);
  const fares = r.list.map((s) => s.fare).filter(Boolean).sort((x, y) => x - y);
  const opsAll = [...new Set(r.list.map((s) => (s.gov ? 'the government ship' : s.op.replace(/ \d$/, ''))).filter((o) => !/not named/i.test(o)))];
  const fromPts = [...new Set(r.list.map((s) => s.fromPt).filter(Boolean))]; const toPts = [...new Set(r.list.map((s) => s.toPt).filter(Boolean))];
  const reps = [...new Set(r.list.map((s) => s.rep).filter(Boolean))].sort((x, y) => x - y);
  const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] || '');
  const faq: [string, string][] = [
    [`How long is the ferry from ${a} to ${b}?`, durs.length ? (durs[0] === durs[durs.length - 1] ? `About ${dur(durs[0])}.` : `About ${dur(durs[0])} on the fastest boat and up to ${dur(durs[durs.length - 1])} on the slowest.`) : ''],
    [`How many ferries go from ${a} to ${b} in a day?`, `${r.list.length} sailing${r.list.length > 1 ? 's' : ''} in the current timetable. The first leaves at ${r.list[0].dep}${r.list.length > 1 ? ` and the last at ${r.list[r.list.length - 1].dep}` : ''}.`],
    [`How much is the ${a} to ${b} ferry ticket?`, fares.length ? `Fares start at ${inr(fares[0])} a person${fares[fares.length - 1] > fares[0] ? `; the highest starting fare on this route is ${inr(fares[fares.length - 1])}` : ''}. Higher classes cost more and are shown when you pick a sailing.` : ''],
    [`Which ferries run between ${a} and ${b}?`, opsAll.length ? `${listOf(opsAll).replace(/^t/, 'T')}.` : ''],
    [`Where does the ferry leave from, and where does it arrive?`, fromPts.length && toPts.length ? `It leaves from ${listOf(fromPts)} and arrives at ${listOf(toPts)}.` : ''],
    [`How is the ${a} to ${b} ferry ticket booked?`, 'Add the sailing to your trip and confirm. Our team books the ticket with the operator within 15 minutes of your confirmation, asks you directly which seats you would like, and sends the ticket on WhatsApp.'],
    [`How early should I reach the jetty?`, reps.length ? `Be there ${reps.length > 1 ? `${reps[0]} to ${reps[reps.length - 1]}` : reps[0]} minutes before departure, depending on the boat, with the photo ID you booked with. When you add a sailing to a trip, the cab to the jetty is timed for this.` : ''],
  ];
  return (
    <div className="atp-pg">
      <header className="atp-ph">
        <span className="atp-eyebrow">Ferry · {r.list.length} sailing{r.list.length > 1 ? 's' : ''}</span>
        <h1>{a} to {b} ferry</h1>
        <p>Be at {r.list[0].fromPt} 45 to 60 minutes before departure. Fares are a person, one way.</p>
        {back && <a className="atp-btn is-outline atp-swap" href={`/ferries/${back.key}`}><TideIcon n="swap" s={18} />{b} to {a}</a>}
      </header>
      <FerryList sails={r.list} />
      <section className="atp-cs">
        <h2>Good to know</h2>
        <p className="atp-lead">Government ship seats open about a week ahead. Private ferries sell out first in peak season (15 Dec to 15 Jan). When you add a sailing, your cabs to and from the jetty are timed around it. For now every ticket is booked by our team: within 15 minutes of your confirmation we book it with the operator, ask you which seats you would like, and send the ticket on WhatsApp.</p>
        <AskWhatsApp about={`I have a question about the ferry from ${a} to ${b}.`} path={`/ferries/${r.key}`} hint="Ask about seats, timings or which sailing fits your flight." />
        <a className="atp-strip" href={`/islands/${r.to.toLowerCase()}`}><TideIcon n="pin" /><span><b>More about {b}</b><small>Things to do, stays and day plans</small></span><TideIcon n="chev" s={18} /></a>
      </section>
      <Faq items={faq} title={`${a} to ${b} ferry: questions people ask`} />
      <JsonLd data={[...ld, crumbs([['Home', '/'], ['Ferries', '/ferries'], [`${a} to ${b}`, `/ferries/${route}`]])]} />
    </div>
  );
}
