import { Suspense } from 'react';
import EditItem from '@/views/EditItem';
export const metadata = { title: 'Change a booking', robots: { index: false } };
export default function Page() { return <Suspense><EditItem /></Suspense>; }
