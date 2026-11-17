/* Site-wide footer, rendered on the server: an index of the islands, ferry routes, planned trips and lists,
   so every Google-facing page is a link or two from any other. */
import { ZONES, ferryRoutes, slug } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';

const TOP_ROUTES = ['pbl-hav', 'hav-pbl', 'pbl-nei', 'nei-pbl', 'hav-nei', 'nei-hav'];

export default function SiteFooter() {
  const R = ferryRoutes(); const ZN = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
  const routes = TOP_ROUTES.map((k) => R.find((r) => r.key === k)).filter(Boolean) as ReturnType<typeof ferryRoutes>;
  const trips = (PKGS as any[]).filter((p) => /^P\d/.test(p.id)).slice(0, 8);
  return (
    <footer className="foot sitefoot wrap" aria-label="Site">
      <div className="sf-brand">
        <span className="brand"><span>Andaman<small>Travel Planner</small></span></span>
        <span>Ferries, stays, transfers and experiences across the Andaman Islands, booked as one itinerary.</span>
      </div>
      <nav className="sf-cols" aria-label="Browse">
        <div><b>Islands</b>{ZONES.map((z) => <a key={z.id} href={`/islands/${slug(z.id)}`}>{z.name}</a>)}</div>
        <div><b>Ferries</b>{routes.map((r) => <a key={r.key} href={`/ferries/${r.key}`}>{ZN[r.from]} to {ZN[r.to]}</a>)}<a href="/ferries">All ferry routes</a></div>
        <div><b>Planned trips</b>{trips.map((p) => <a key={p.id} href={`/trips/${slug(p.id)}`}>{p.n}</a>)}<a href="/trips">All {(PKGS as any[]).length} trips</a></div>
        <div><b>Plan</b><a href="/things-to-do">Things to do</a><a href="/stays">Stays</a><a href="/cabs">Cabs and scooters</a><a href="/charters">Boat charters</a><a href="/plan">Build my itinerary</a></div>
      </nav>
      <span className="sf-legal">© 2026 Andaman Travel Planner Private Limited · Sri Vijaya Puram (Port Blair)</span>
    </footer>
  );
}
