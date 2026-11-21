import AskWhatsApp from '@/components/AskWhatsApp';
import CabList, { type CabRoute, type Rental } from '@/views/CabList';
import JsonLd from '@/components/seo/JsonLd';
import { ISLES } from '@/lib/browse';
import data from '@/data/catalogue.json';
import { crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Andaman cab fares: airport, jetty and sightseeing taxis', description: 'Taxi fares in Port Blair, Havelock and Neil for airport and jetty transfers and day sightseeing, with scooter and bike rentals. Every ride can be timed to your ferry.', path: '/cabs' });

const D = data as any;
export default function Page() {
  const routes: CabRoute[] = D.routes.filter((r: any) => !r.hop).map((r: any) => ({ id: r.id, z: r.z, a: r.a, b: r.b, km: r.km || null, mins: r.mins, wait: r.wait || 0, kind: r.kind, p: Math.min(...r.prices.map((p: any) => p.ow || p.ret || Infinity)) }));
  const rentals: Rental[] = D.rentals.map((r: any) => ({ id: r.id, z: r.z, n: r.n, p: r.p, note: [r.fuel, r.dep ? `₹${r.dep.toLocaleString('en-IN')} deposit` : ''].filter(Boolean).join(' · ') }));
  const isles = ISLES.filter((i) => routes.some((r) => r.z === i.id)).sort((a, b) => Number(b.id === 'PBL') - Number(a.id === 'PBL')).map(({ id, n }) => ({ id, n }));
  return (
    <div className="atp-pg">
      <header className="atp-ph"><span className="atp-eyebrow">{routes.length} routes · {rentals.length} rentals</span><h1>Airport, jetty and sightseeing rides</h1>
        <p>Cabs run as loops from your hotel and back. Add a sight to your trip and its cab is planned with it; here you can book one ride on its own.</p></header>
      <CabList routes={routes} rentals={rentals} isles={isles} />
      <section className="atp-cs"><AskWhatsApp about="I need help with a cab or a rental in the Andamans." path="/cabs" hint="Tell us the pickup, the stops and the time. We reply with the fare." /></section>
      <JsonLd data={crumbs([['Home', '/'], ['Cabs', '/cabs']])} />
    </div>
  );
}
