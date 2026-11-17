import type { Metadata } from 'next';
import { ZN, ferryRoutes } from '@/lib/catalogue';

export const metadata: Metadata = { title: 'Andaman ferry timings and fares', description: 'Every ferry between Port Blair, Havelock (Swaraj Dweep), Neil (Shaheed Dweep) and the outer islands: private boats and government ships, with times, classes and fares.', alternates: { canonical: '/ferries' } };

export default function Page() {
  const routes = ferryRoutes();
  return (
    <div className="wrap"><div className="pg-plain"><span className="eyebrow">Ferries</span><h1>Ferry timings and fares</h1><p className="muted">Private ferries (Makruzz, Nautika, Green Ocean, ITT Majestic) and government ships. Pick a route to see each sailing and add it to your trip.</p></div>
      <div className="linklist">{routes.map((r) => <a key={r.key} href={`/ferries/${r.key}`}><b>{ZN[r.from].name} → {ZN[r.to].name}</b><small>{r.list.length} sailing{r.list.length > 1 ? 's' : ''} · from {r.list[0].dep}</small></a>)}</div>
    </div>
  );
}
