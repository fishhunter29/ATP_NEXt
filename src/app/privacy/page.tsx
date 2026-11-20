import type { Metadata } from 'next';
import Legal, { legalTitle } from '@/components/seo/Legal';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: legalTitle('privacy'), description: 'What Andaman Travel Planner collects, why, who it is shared with, and how to ask for a copy of your data or have it deleted.', path: '/privacy' });

export default function Page() { return <Legal k="privacy" />; }
