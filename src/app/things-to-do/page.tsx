import { Suspense } from 'react';
import { ThingsToDo } from '@/views/Lists';
import { ActsIndex } from '@/components/seo/Indexes';
import JsonLd from '@/components/seo/JsonLd';
import { crumbs, pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Things to do in the Andaman Islands', description: 'Scuba, snorkelling, beaches, boat trips, history and sunsets across Havelock, Neil, Port Blair and beyond, with prices and Google ratings.', path: '/things-to-do' });
export default function Page() {
  return (
    <>
      <div className="wrap"><div className="pg-plain"><span className="eyebrow">Things to do</span><h1>Beaches, dives and days out</h1>
        <p className="muted">Scuba, snorkelling, beaches, boat trips, history and sunsets on every island, with Google ratings. Each one is timed around your ferries when you add it.</p></div></div>
      <Suspense fallback={<ActsIndex />}><ThingsToDo fallback={<ActsIndex />} /></Suspense>
      <JsonLd data={crumbs([['Home', '/'], ['Things to do', '/things-to-do']])} />
    </>
  );
}
