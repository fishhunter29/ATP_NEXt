import BrowsePage from '@/components/browse/BrowsePage';
import JsonLd from '@/components/seo/JsonLd';
import { ISLES, actCats, actItems } from '@/lib/browse';
import { crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Things to do in the Andaman Islands', description: 'Scuba, snorkelling, beaches, boat trips, history and sunsets across Havelock, Neil, Port Blair and beyond, with prices and Google ratings.', path: '/things-to-do' });
export default function Page() {
  const items = actItems();
  return (
    <BrowsePage kind="act" items={items} cats={actCats} isles={ISLES} eyebrow={`${items.length} things to do`} title="Beaches, dives and days out"
      lead="Pick an island or a kind of day. Each one is timed around your ferries when you add it. Ratings are from Google.">
      <JsonLd data={crumbs([['Home', '/'], ['Things to do', '/things-to-do']])} />
    </BrowsePage>
  );
}
