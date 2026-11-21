import type { Metadata } from 'next';
import InfoPage from '@/components/seo/InfoPage';
import { COMPANY } from '@/lib/company';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Contact us', description: 'Reach Andaman Travel Planner on WhatsApp or email, every day from 8 am to 9 pm. Office in Sri Vijaya Puram (Port Blair).', path: '/contact' });

export default function Page() {
  return (
    <InfoPage path="/contact" eyebrow="Contact us" schemaType="ContactPage" title="Talk to a planner who lives here"
      lead="WhatsApp is the quickest way to reach us. A planner in Sri Vijaya Puram replies, usually within 30 minutes."
      wa="Hi, I have a question about an Andaman trip."
      sections={[
        { h: 'Hours', t: 'Every day, 8 am to 9 pm (India time). Messages that come in later are answered first thing the next morning.' },
        { h: 'For travellers', t: '', items: [
          ['Planning a trip', 'Send us your plan from the site, or tell us your dates and who is travelling.'],
          ['Already booked', 'Message us with your booking code for changes, cancellations or help on the ground.'],
          ['Details for your booking', 'If we need ID or other details for a permit or a ticket, we ask for them here, on WhatsApp.'],
        ] },
        { h: 'Our office', t: COMPANY.address },
      ]} />
  );
}
