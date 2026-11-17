import { Suspense } from 'react';
import { Cabs } from '@/views/Lists';
export const metadata = { title: 'Cabs and transfers in the Andamans', description: 'Airport, jetty and sightseeing cabs in Port Blair, Havelock and Neil, timed to your ferries.', alternates: { canonical: '/cabs' } };
export default function Page() { return <Suspense><Cabs /></Suspense>; }
