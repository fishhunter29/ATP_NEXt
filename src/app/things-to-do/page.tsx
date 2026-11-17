import { Suspense } from 'react';
import { ThingsToDo } from '@/views/Lists';
export const metadata = { title: 'Things to do in the Andaman Islands', description: 'Scuba, snorkelling, beaches, boat trips, history and sunsets across Havelock, Neil, Port Blair and beyond, with prices and Google ratings.', alternates: { canonical: '/things-to-do' } };
export default function Page() { return <Suspense><ThingsToDo /></Suspense>; }
