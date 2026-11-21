import type { Metadata } from 'next';
import AboutStory from '@/components/AboutStory';
import JsonLd from '@/components/seo/JsonLd';
import { abs, crumbs, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'About us: three friends, one set of islands',
  description: 'Andaman Travel Planner is built by three friends who live in the Andaman Islands. Why we started it, how we work with hotels, ferry operators and drivers, and what we promise you. In English and Hindi.',
  path: '/about',
  image: '/img/f/i153.webp',
});

export default function Page() {
  return (
    <>
      <AboutStory />
      <JsonLd data={[{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Andaman Travel Planner', url: abs('/about'), inLanguage: ['en-IN', 'hi-IN'], about: { '@id': abs('/#org') } }, crumbs([['Home', '/'], ['About us', '/about']])]} />
    </>
  );
}
