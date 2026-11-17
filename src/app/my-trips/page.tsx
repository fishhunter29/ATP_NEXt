import { Suspense } from 'react';
import MyTrips from '@/views/MyTrips';
export const metadata = { title: 'My trips', robots: { index: false } };
export default function Page() { return <Suspense><MyTrips /></Suspense>; }
