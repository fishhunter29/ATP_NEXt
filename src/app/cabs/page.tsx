import { Suspense } from 'react';
import { Cabs } from '@/views/Lists';
import JsonLd from '@/components/seo/JsonLd';
import { crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Cabs and transfers in the Andamans', description: 'Airport, jetty and sightseeing cabs in Port Blair, Havelock and Neil, timed to your ferries.', path: '/cabs' });
export default function Page() {
  return (
    <>
      <div className="wrap"><div className="pg-plain"><span className="eyebrow">Cabs &amp; scooters</span><h1>Airport, jetty and sightseeing rides</h1>
        <p className="muted">Airport and jetty transfers and sightseeing cabs in Port Blair, Havelock and Neil, plus scooters, timed to your ferries and check-ins.</p></div></div>
      <Suspense><Cabs /></Suspense>
      <JsonLd data={crumbs([['Home', '/'], ['Cabs', '/cabs']])} />
    </>
  );
}
