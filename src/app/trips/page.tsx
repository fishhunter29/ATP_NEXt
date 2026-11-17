import { PlannedTrips } from '@/views/Packages';
import { PACKAGES, TripsIndex } from '@/components/seo/Indexes';
import JsonLd from '@/components/seo/JsonLd';
import { abs, crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Andaman tour packages, planned day by day', description: `${PACKAGES.length} ready-made Andaman trips from 2 to 13 nights, every ferry checked. Load one and change anything.`, path: '/trips' });
export default function Page() {
  const list = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Andaman planned trips', itemListElement: PACKAGES.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/trips/${p.id.toLowerCase()}`), name: p.n })) };
  return (
    <>
      <div className="wrap"><div className="pg-plain"><span className="eyebrow">Planned trips</span><h1>Trips we have planned</h1><p className="muted">{PACKAGES.length} full trips. Every ferry checked. Load one and change anything.</p></div></div>
      <PlannedTrips fallback={<TripsIndex />} />
      <JsonLd data={[crumbs([['Home', '/'], ['Planned trips', '/trips']]), list]} />
    </>
  );
}
