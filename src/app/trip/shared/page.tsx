import { Suspense } from 'react';
import SharedTrip from '@/views/SharedTrip';
export const metadata = { title: 'A shared Andaman plan', robots: { index: false } };
export default function Page() { return <Suspense><SharedTrip /></Suspense>; }
