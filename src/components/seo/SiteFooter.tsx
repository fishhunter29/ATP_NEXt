/* Site-wide footer, rendered on the server: an index of the islands, ferry routes, planned trips and lists,
   so every Google-facing page is a link or two from any other. */
import { ZONES, ferryRoutes, slug } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';
import { Logo } from '@/components/Brand';
import { COMPANY, DPIIT_LINE, RECOGNITIONS } from '@/lib/company';

const TOP_ROUTES = ['pbl-hav', 'hav-pbl', 'pbl-nei', 'nei-pbl', 'hav-nei', 'nei-hav'];

export default function SiteFooter() {
  const R = ferryRoutes(); const ZN = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
  const routes = TOP_ROUTES.map((k) => R.find((r) => r.key === k)).filter(Boolean) as ReturnType<typeof ferryRoutes>;
  const trips = (PKGS as any[]).filter((p) => /^P\d/.test(p.id)).slice(0, 8);
  return (
    <footer className="foot sitefoot wrap" aria-label="Site">
      <div className="sf-brand">
        <span className="atp-brandl"><Logo /><span className="atp-brandn"><b>Andaman Travel Planner</b></span></span>
        <span className="sf-dpiit">{DPIIT_LINE}</span>
        <span>Ferries, stays, transfers and experiences across the Andaman Islands, booked as one itinerary.</span>
      </div>
      <nav className="sf-cols" aria-label="Browse">
        <div><b>Islands</b>{ZONES.map((z) => <a key={z.id} href={`/islands/${slug(z.id)}`}>{z.name}</a>)}</div>
        <div><b>Ferries</b>{routes.map((r) => <a key={r.key} href={`/ferries/${r.key}`}>{ZN[r.from]} to {ZN[r.to]}</a>)}<a href="/ferries">All ferry routes</a></div>
        <div><b>Planned trips</b>{trips.map((p) => <a key={p.id} href={`/trips/${slug(p.id)}`}>{p.n}</a>)}<a href="/trips">All {(PKGS as any[]).length} trips</a></div>
        <div><b>Plan</b><a href="/things-to-do">Things to do</a><a href="/stays">Stays</a><a href="/cabs">Cabs and scooters</a><a href="/charters">Boat charters</a><a href="/plan">Build my itinerary</a></div>
      </nav>
      <div className="sf-trust">
        <b className="sf-h">Recognitions and memberships</b>
        <div className="sf-logos">{RECOGNITIONS.map((r) => (
          // eslint-disable-next-line @next/next/no-img-element
          <span key={r.file} className="sf-lg"><img src={`/img/logos/${r.file}`} alt={r.name} width={160} height={44} loading="lazy" decoding="async" /></span>
        ))}</div>
        <address className="sf-co">
          <b>{COMPANY.name}</b>
          <span>CIN {COMPANY.cin}</span>
          <span>GSTIN {COMPANY.gstin}</span>
          <span>{DPIIT_LINE}</span>
          <span>Registered office: {COMPANY.address}</span>
          <span>Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></span>
        </address>
        <nav className="sf-pol" aria-label="Terms and policies"><a href="/terms">Booking terms</a><a href="/refunds">Refunds and cancellation</a><a href="/privacy">Privacy</a></nav>
      </div>
      <span className="sf-legal">© 2026 {COMPANY.name} · Prices in ₹, GST shown before you pay.</span>
    </footer>
  );
}
