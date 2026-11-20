import { Suspense } from 'react';
import { Search } from '@/views/Lists';
import { ISLES, actItems, stayItems, tripItems } from '@/lib/browse';
export const metadata = { title: 'Search', robots: { index: false } };
export default function Page() {
  const groups = [
    { k: 'act', n: 'Things to do', href: '/things-to-do', items: actItems() },
    { k: 'stay', n: 'Stays', href: '/stays', items: stayItems() },
    { k: 'trip', n: 'Ready-made trips', href: '/trips', items: tripItems() },
  ];
  const isles = Object.fromEntries(ISLES.map((i) => [i.id, i.n]));
  return <Suspense><Search groups={groups} isles={isles} /></Suspense>;
}
