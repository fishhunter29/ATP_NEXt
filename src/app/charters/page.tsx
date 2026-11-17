import Charters from '@/views/Charters';
import JsonLd from '@/components/seo/JsonLd';
import { crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Boat charters in the Andamans', description: 'Private boats, speedboat transfers, game fishing, sunset and dinner cruises and Barren Island volcano trips, with capacity and per-person prices.', path: '/charters', image: '/img/f/i120.webp' });
const HERO = (
  <div className="chhero">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img alt="" src="/img/f/i120.webp" />
    <div className="wrap"><span className="eyebrow">Boat charters</span><h1>The sea, on your clock</h1><p>Whole boats, private speedboats, fishing and sunset cruises. Pick a boat, we fit it into your trip.</p></div>
  </div>
);
export default function Page() { return <><Charters fallback={HERO} /><JsonLd data={crumbs([['Home', '/'], ['Boat charters', '/charters']])} /></>; }
