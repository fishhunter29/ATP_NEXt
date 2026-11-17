import { Suspense } from 'react';
import { Stays } from '@/views/Lists';
import { StaysIndex } from '@/components/seo/Indexes';
import JsonLd from '@/components/seo/JsonLd';
import { crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Hotels and resorts in the Andaman Islands', description: 'Stays on Havelock, Neil, Port Blair and the outer islands, from simple rooms to beach resorts, with Google ratings and seasonal prices.', path: '/stays' });
export default function Page() {
  return (
    <>
      <div className="wrap"><div className="pg-plain"><span className="eyebrow">Stays</span><h1>Simple rooms to beach resorts</h1>
        <p className="muted">Hotels and resorts on Havelock, Neil, Port Blair and the outer islands, with Google ratings and this season’s prices.</p></div></div>
      <Suspense fallback={<StaysIndex />}><Stays fallback={<StaysIndex />} /></Suspense>
      <JsonLd data={crumbs([['Home', '/'], ['Stays', '/stays']])} />
    </>
  );
}
