import type { Metadata } from 'next';
import Legal, { legalTitle } from '@/components/seo/Legal';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: legalTitle('refunds'), description: 'Refunds and cancellation at Andaman Travel Planner: free cancellation windows, ferry operator rules, government fees and how refunds are paid.', path: '/refunds' });

export default function Page() { return <Legal k="refunds" />; }
