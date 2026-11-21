/* Site-wide footer, rendered on the server. A full-width charcoal band that closes every page:
   1. a last call to plan (WhatsApp and Plan my trip);
   2. the brand, the four promises and how to reach us;
   3. an index of the islands, ferry routes, ready-made trips and the planner, so every Google-facing page is a link
      or two from any other (on phones the lists fold, but they are all in the HTML);
   4. recognitions on one light strip; 5. the company's legal details and the policies.
   The link columns: Company, Help and Plan first, then the island, ferry and trip indexes. */
import { ZONES, ferryRoutes, slug } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';
import { TideIcon, WaIcon } from '@/components/Brand';
import FootOpen from '@/components/seo/FootOpen';
import { COMPANY, DPIIT_LINE, RECOGNITIONS } from '@/lib/company';
import { TourLink } from '@/components/ProductTour';
import { PROMISES } from '@/components/Promises';
import { waLink } from '@/lib/whatsapp';

const TOP_ROUTES = ['pbl-hav', 'hav-pbl', 'pbl-nei', 'nei-pbl', 'hav-nei', 'nei-hav'];

function Col({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="af-col" open={open}>
      <summary><span>{title}</span><TideIcon n="chev" s={16} /></summary>
      <div className="af-links">{children}</div>
    </details>
  );
}

export default function SiteFooter() {
  const R = ferryRoutes(); const ZN = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
  const routes = TOP_ROUTES.map((k) => R.find((r) => r.key === k)).filter(Boolean) as ReturnType<typeof ferryRoutes>;
  const trips = (PKGS as any[]).filter((p) => /^P\d/.test(p.id)).slice(0, 7);
  const wa = waLink('Hi, I’d like help planning an Andaman trip.');
  return (
    <footer className="atp-foot sitefoot" aria-label="Site">
      <div className="af-in">
        <section className="af-cta" aria-label="Plan with us">
          <div>
            <span className="af-eyebrow">Planned in Port Blair</span>
            <h2>Your Andaman trip, confirmed in 30 minutes.</h2>
            <p>Tell us what you have in mind. A planner who lives here checks every ferry, stay and cab, and replies on WhatsApp.</p>
          </div>
          <div className="af-cta-b">
            <a className="af-btn is-wa atp-wa" href={wa} target="_blank" rel="noopener"><WaIcon s={22} /><span><b>Chat on WhatsApp</b><small>{COMPANY.whatsapp}</small></span></a>
            <a className="af-btn is-plan" href="/plan">Plan my trip<TideIcon n="arrow" s={18} /></a>
          </div>
        </section>

        <div className="af-main">
          <div className="af-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a className="af-lock" href="/"><img src="/brand/atp-logo.svg" alt="ATP" width={96} height={96} loading="lazy" decoding="async" /><span><b>Andaman Travel Planner</b><small>Sri Vijaya Puram · Andaman Islands</small></span></a>
            <p>Ferries, stays, cabs and things to do across the Andaman Islands, planned and booked as one trip.</p>
            <ul className="af-prom">{PROMISES.map((p) => <li key={p.k}><TideIcon n="check" s={14} />{p.b}</li>)}</ul>
            <ul className="af-contact">
              <li><TideIcon n="pin" s={16} /><span>{COMPANY.locality}, Andaman &amp; Nicobar Islands</span></li>
              <li><TideIcon n="mail" s={16} /><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></li>
              <li><TideIcon n="clock" s={16} /><span>Every day, 8 am to 9 pm</span></li>
            </ul>
          </div>
          <nav className="af-cols" aria-label="Browse">
            <Col title="Company">
              <a href="/about">About us</a><a href="/contact">Contact us</a><a href="/partners">Partner with us</a><a href="/careers">Careers</a><a href="/media">Media</a>
            </Col>
            <Col title="Help">
              <a href="/contact">Help and support</a><a href="/refunds">Cancellations and refunds</a><a href="/terms">Booking terms</a><a href="/privacy">Privacy policy</a><TourLink />
            </Col>
            <Col title="Plan">
              <a href="/plan">Build my itinerary</a><a href="/things-to-do">Things to do</a><a href="/stays">Stays</a><a href="/cabs">Cabs and scooters</a><a href="/charters">Boat charters</a>
            </Col>
            <Col title="Islands">{ZONES.map((z) => <a key={z.id} href={`/islands/${slug(z.id)}`}>{z.name}</a>)}</Col>
            <Col title="Ferries">{routes.map((r) => <a key={r.key} href={`/ferries/${r.key}`}>{ZN[r.from]} to {ZN[r.to]}</a>)}<a className="is-all" href="/ferries">All ferry routes</a></Col>
            <Col title="Ready-made trips">{trips.map((p) => <a key={p.id} href={`/trips/${slug(p.id)}`}>{p.n}</a>)}<a className="is-all" href="/trips">All {(PKGS as any[]).length} trips</a></Col>
          </nav>
          <FootOpen />
        </div>

        <div className="af-trust">
          <span className="af-eyebrow">Recognised by</span>
          <div className="af-logos">{RECOGNITIONS.map((r) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={r.file} src={`/img/logos/${r.file}`} alt={r.name} width={160} height={44} loading="lazy" decoding="async" />
          ))}</div>
        </div>

        <div className="af-legal">
          <address>
            <b>{COMPANY.name}</b>
            <span>{DPIIT_LINE} · CIN {COMPANY.cin} · GSTIN {COMPANY.gstin}</span>
            <span>Registered office: {COMPANY.address}</span>
          </address>
          <nav aria-label="Terms and policies"><a href="/terms">Booking terms</a><a href="/refunds">Refunds</a><a href="/privacy">Privacy</a><a href="/sitemap.xml">Sitemap</a></nav>
          <span className="af-copy">© 2026 {COMPANY.name}. Prices in ₹; GST and every fee shown before you confirm.</span>
        </div>
      </div>
    </footer>
  );
}
