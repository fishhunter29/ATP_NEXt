import BrowsePage from '@/components/browse/BrowsePage';
import JsonLd from '@/components/seo/JsonLd';
import { tripCats, tripItems } from '@/lib/browse';
import { abs, crumbs, pageMeta } from '@/lib/seo';
const N = tripItems().length;
export const metadata = pageMeta({ title: 'Andaman tour packages, planned day by day', description: `${N} ready-made Andaman trips from 2 to 13 nights, every ferry checked. Load one and change anything.`, path: '/trips' });
export default function Page() {
  const items = tripItems();
  const list = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Andaman planned trips', itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(p.href), name: p.n })) };
  return (
    <BrowsePage kind="trip" items={items} cats={tripCats} isles={[]} eyebrow={`${items.length} ready-made trips`} title="Whole trips, already checked"
      lead="Ferry times, closed days and check-in times all fit. Prices are a person, including GST. Use one as it is, or change anything after.">
      {/* every trip as a plain link, so each one is one step from this page for search engines */}
      <nav className="atp-cs atp-index" aria-label="All ready-made trips"><h2>All {items.length} trips</h2><ul>{items.map((p) => <li key={p.id}><a href={p.href}>{p.n}</a></li>)}</ul></nav>
      <JsonLd data={[crumbs([['Home', '/'], ['Planned trips', '/trips']]), list]} />
    </BrowsePage>
  );
}
