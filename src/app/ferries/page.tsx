import AskWhatsApp from '@/components/AskWhatsApp';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ZN, ferryRoutes, inr } from '@/lib/catalogue';
import { ISLES } from '@/lib/browse';
import { TideIcon } from '@/components/Brand';
import JsonLd from '@/components/seo/JsonLd';
import { crumbs, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Andaman ferry timings and fares', description: 'Every ferry between Port Blair, Havelock (Swaraj Dweep), Neil (Shaheed Dweep) and the outer islands: private boats and government ships, with times, classes and fares.', path: '/ferries', image: '/img/f/i153.webp' });

const MAIN = ['pbl-hav', 'hav-nei', 'nei-pbl', 'hav-pbl', 'pbl-nei', 'nei-hav'];

export default function Page() {
  const routes = ferryRoutes(); const order = ISLES.map((i) => i.id);
  const main = MAIN.map((k) => routes.find((r) => r.key === k)).filter(Boolean) as typeof routes;
  const rest = routes.filter((r) => !MAIN.includes(r.key)).sort((a, b) => order.indexOf(a.from) - order.indexOf(b.from) || order.indexOf(a.to) - order.indexOf(b.to));
  const from = (r: (typeof routes)[number]) => Math.min(...r.list.map((s) => s.fare).filter(Boolean));
  const ops = (r: (typeof routes)[number]) => [...new Set(r.list.map((s) => (s.gov ? 'Government ship' : s.op)).filter((o) => !/not named/i.test(o)))].slice(0, 4).join(', ');
  return (
    <div className="atp-pg">
      <header className="atp-ph"><span className="atp-eyebrow">{routes.reduce((n, r) => n + r.list.length, 0)} sailings · {routes.length} routes</span><h1>Ferry timings and fares</h1>
        <p>Private ferries and government ships, from the operators’ own timetables. Pick a route to see every sailing and add it to your trip.</p></header>
      <section className="atp-cs is-first">
        <h2>The main triangle</h2>
        <div className="atp-routes">
          {main.map((r) => (
            <Link key={r.key} className="atp-route" href={`/ferries/${r.key}`} prefetch={false}>
              <span className="atp-route-h"><span className="atp-zone"><i style={{ background: `var(--z-${r.from})` }} />{ZN[r.from].name}</span><TideIcon n="arrow" s={16} /><span className="atp-zone"><i style={{ background: `var(--z-${r.to})` }} />{ZN[r.to].name}</span>
                <span className="atp-fr-p"><small>from</small><b>{inr(from(r))}</b></span></span>
              <small><b>{r.list.length} sailing{r.list.length > 1 ? 's' : ''} a day</b> · first <span className="atp-mono">{r.list[0].dep}</span> · last <span className="atp-mono">{r.list[r.list.length - 1].dep}</span></small>
              <small>{ops(r)}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="atp-cs">
        <h2>Outer islands</h2>
        <div className="atp-rows">
          {rest.map((r) => (
            <Link key={r.key} className="atp-fr" href={`/ferries/${r.key}`} prefetch={false}>
              <span className="atp-tile k-boat"><TideIcon n="boat" /></span>
              <span><b>{ZN[r.from].name} → {ZN[r.to].name}</b><small>{r.list.length} sailing{r.list.length > 1 ? 's' : ''} · from {r.list[0].dep} · {ops(r)}</small></span>
              <span className="atp-fr-p"><b>{inr(from(r))}</b></span>
            </Link>
          ))}
        </div>
      </section>
      <section className="atp-cs"><AskWhatsApp about="I have a question about ferries between the islands." path="/ferries" hint="Ask about seats, timings or which sailing fits your flight." /></section>
      <JsonLd data={crumbs([['Home', '/'], ['Ferries', '/ferries']])} />
    </div>
  );
}
