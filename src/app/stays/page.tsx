import BrowsePage from '@/components/browse/BrowsePage';
import JsonLd from '@/components/seo/JsonLd';
import { ISLES, stayCats, stayItems } from '@/lib/browse';
import { crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Hotels and resorts in the Andaman Islands', description: 'Stays on Havelock, Neil, Port Blair and the outer islands, from simple rooms to beach resorts, with Google ratings and seasonal prices.', path: '/stays' });
export default function Page() {
  const items = stayItems();
  return (
    <BrowsePage kind="stay" items={items} cats={stayCats} isles={ISLES} eyebrow={`${items.length} stays`} title="Simple rooms to beach resorts"
      lead="Prices are a night, before GST, at this season’s rate. Hotels that have sent us their own photos come first. Ratings are from Google.">
      <JsonLd data={crumbs([['Home', '/'], ['Stays', '/stays']])} />
    </BrowsePage>
  );
}
