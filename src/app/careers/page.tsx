import type { Metadata } from 'next';
import InfoPage from '@/components/seo/InfoPage';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Careers', description: 'Work at Andaman Travel Planner, a DPIIT-recognised startup in Sri Vijaya Puram.', path: '/careers' });

export default function Page() {
  return (
    <InfoPage path="/careers" eyebrow="Careers" title="Work with us"
      lead="We are a small team in Sri Vijaya Puram, building the simplest way to plan a trip to the Andamans."
      wa="Hi, I'd like to work with ATP." mailSubject="Careers"
      sections={[
        { h: 'Open roles', t: 'Open roles will be listed here.' },
        { h: 'Write to us', t: 'If you know the islands and want to work with us, as a trip planner, on the ground, or in writing, photography or technology, send a short note about yourself and your CV.' },
      ]} />
  );
}
