import type { Metadata } from 'next';
import InfoPage from '@/components/seo/InfoPage';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Partner with us', description: 'Hotels, boat operators, drivers and activity centres in the Andaman Islands: work with Andaman Travel Planner.', path: '/partners' });

export default function Page() {
  return (
    <InfoPage path="/partners" eyebrow="Partner with us" title="Work with us, directly"
      lead="We deal with every hotel, boat and driver ourselves, with no middleman from the mainland. If you run a business on the islands, we would like to hear from you."
      wa="Hi, I run a business in the Andamans and would like to partner with ATP." mailSubject="Partnership"
      sections={[
        { h: 'Who we work with', t: '', items: [
          ['Hotels, resorts and homestays', 'Your local rates, shown fairly, and guests confirmed with you before they pay.'],
          ['Ferry and boat operators', 'Tickets and charters, booked under your own rules.'],
          ['Drivers and cab owners', 'Airport, jetty and sightseeing rides, planned as loops from the hotel.'],
          ['Dive centres and activity providers', 'Dives, water sports, treks and tours, timed with the rest of the trip.'],
        ] },
        { h: 'How it works', t: 'Tell us about your business and send a few photos. We visit, agree the rates and terms with you, and then list you on the site.' },
      ]} />
  );
}
