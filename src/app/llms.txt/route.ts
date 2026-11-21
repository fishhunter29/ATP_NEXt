/* /llms.txt: a plain summary of the site for AI assistants and search tools that read it, built from the catalogue
   so the numbers and timetables are the same ones the pages show. Facts only; nothing here is written by hand
   except how booking works and who we are. */
import { ACTS, HOTELS, SAILS, ZONES, ferryRoutes, slug } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';
import { COMPANY } from '@/lib/company';
import { BEST_FOR, COUNTS } from '@/lib/browse';
import { SITE, SITE_NAME } from '@/lib/seo';

export const dynamic = 'force-static';

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function GET() {
  const ZN = Object.fromEntries(ZONES.map((z) => [z.id, z]));
  const routes = ferryRoutes(); const main = ['pbl-hav', 'hav-pbl', 'pbl-nei', 'nei-pbl', 'hav-nei', 'nei-hav'].map((k) => routes.find((r) => r.key === k)).filter(Boolean) as typeof routes;
  const pk = PKGS as { id: string; n: string; nights: number; total: number; pax: number[] }[];
  const nights = pk.map((p) => p.nights).sort((a, b) => a - b); const common = [...new Set(nights)].map((n) => [n, nights.filter((x) => x === n).length]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n).sort((a, b) => a - b);
  const L: string[] = [];
  L.push(`# ${SITE_NAME}`, '', `> ${COMPANY.name} plans and books Andaman Islands trips as one itinerary: stays, ferries, cabs and things to do, each checked against the others. Based in ${COMPANY.locality}. DPIIT Recognised Startup ${COMPANY.dpiit}.`, '');
  L.push('## How booking works', '',
    '- Build a trip on the site, or pick a ready-made one, and send it for confirmation. Nothing is paid on the site.',
    '- The team confirms every stay, ferry, cab and activity with the partner within 30 minutes, on WhatsApp.',
    '- The traveller pays once, after everything is confirmed. Tickets and vouchers follow on WhatsApp.',
    '- Ferry tickets are booked by the team, who ask the traveller which seats they would like.',
    '- The company is in Port Blair and deals with hotels, boat operators and drivers itself, with no middleman from the mainland.',
    `- Contact: WhatsApp ${COMPANY.whatsapp}, email ${COMPANY.email}.`, '');
  L.push('## Seasons', '', '- Peak season: 15 December to 15 January. Private ferries sell out first, so ferries are the first thing to fix.', '- High season: 1 October to 14 December and 16 January to 15 May.', '- Rainy season: 16 May to 30 September. Seas are rougher and some boat trips do not run.', '');
  L.push('## What is on the site', '',
    `- [Things to do](${SITE}/things-to-do): ${COUNTS.acts} activities and sights with prices and timings.`,
    `- [Stays](${SITE}/stays): ${COUNTS.stays} hotels and resorts.`,
    `- [Ferry timings and fares](${SITE}/ferries): ${SAILS.length} sailings on ${routes.length} routes, from the operators' timetables.`,
    `- [Cabs](${SITE}/cabs): airport, jetty and sightseeing fares.`,
    `- [Ready-made trips](${SITE}/trips): ${pk.length} itineraries from ${nights[0]} to ${nights[nights.length - 1]} nights; the most common are ${common.join(', ')} nights.`,
    `- [Plan my trip](${SITE}/plan): builds a full itinerary from the dates, the travellers and the pace.`, '');
  L.push('## Ferries between the main islands', '');
  main.forEach((r) => { const d = r.list.map((s) => (mins(s.arr) - mins(s.dep) + 1440) % 1440).filter((m) => m > 0).sort((a, b) => a - b); const f = r.list.map((s) => s.fare).filter(Boolean).sort((a, b) => a - b);
    L.push(`- [${ZN[r.from].name} to ${ZN[r.to].name}](${SITE}/ferries/${r.key}): ${r.list.length} sailings a day, first ${r.list[0].dep}, last ${r.list[r.list.length - 1].dep}${d.length ? `, about ${dur(d[0])}` : ''}${f.length ? `, from ${inr(f[0])} a person` : ''}.`); });
  L.push('', '## Islands', '');
  ZONES.forEach((z) => { const n = z.minN && z.maxN ? (z.minN === z.maxN ? `${z.minN} night${z.minN > 1 ? 's' : ''}` : `${z.minN} to ${z.maxN} nights`) : 'a day trip';
    L.push(`- [${z.name}${z.official && z.official !== z.name ? ` (${z.official})` : ''}](${SITE}/islands/${slug(z.id)}): ${BEST_FOR[z.id] ? BEST_FOR[z.id] + '. ' : ''}Usual stay: ${n}. ${ACTS.filter((a) => a.z === z.id).length} things to do, ${HOTELS.filter((h) => h.z === z.id).length} stays.`); });
  L.push('', '## Company', '', `- ${COMPANY.name}, CIN ${COMPANY.cin}, GSTIN ${COMPANY.gstin}.`, `- Registered office: ${COMPANY.address}.`, `- [Booking terms](${SITE}/terms), [Refunds and cancellation](${SITE}/refunds), [Privacy](${SITE}/privacy).`, '');
  return new Response(L.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
