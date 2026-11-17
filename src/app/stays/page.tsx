import { Suspense } from 'react';
import { Stays } from '@/views/Lists';
export const metadata = { title: 'Hotels and resorts in the Andaman Islands', description: 'Stays on Havelock, Neil, Port Blair and the outer islands, from simple rooms to beach resorts, with Google ratings and seasonal prices.', alternates: { canonical: '/stays' } };
export default function Page() { return <Suspense><Stays /></Suspense>; }
