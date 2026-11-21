import type { Metadata } from 'next';
import InfoPage from '@/components/seo/InfoPage';
import { COMPANY, DPIIT_LINE } from '@/lib/company';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Media', description: 'Media enquiries, company facts and the ATP logo.', path: '/media' });

export default function Page() {
  return (
    <InfoPage path="/media" eyebrow="Media" title="Media enquiries"
      lead="For interviews, information about the company or photos, write to us and we will reply quickly."
      wa="Hi, I'm writing about a media enquiry." mailSubject="Media enquiry"
      sections={[
        { h: 'Company facts', t: '', items: [
          ['Name', COMPANY.name],
          ['Recognition', DPIIT_LINE],
          ['Based in', 'Sri Vijaya Puram (Port Blair), Andaman and Nicobar Islands'],
          ['What we do', 'Ferries, stays, cabs and things to do across the Andaman Islands, planned and confirmed as one trip.'],
        ] },
        { h: 'Logo', t: 'Please use the logo as it is, on a light background.', link: ['/brand/atp-logo.svg', 'Download the ATP logo (SVG)'] },
      ]} />
  );
}
