import type { Metadata } from 'next';
import Legal, { legalTitle } from '@/components/seo/Legal';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: legalTitle('terms'), description: 'How booking with Andaman Travel Planner works: who you book with, prices and GST, confirmation, traveller ID, changes and bad weather.', path: '/terms' });

export default function Page() { return <Legal k="terms" />; }
