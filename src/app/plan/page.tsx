import { Plan } from '@/views/Packages';
import { pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Plan my Andaman trip', description: 'Tell us how many nights, the kind of trip and the stays you like. We build the whole Andaman itinerary: ferries, hotels, cabs and things to do, all timed.', path: '/plan' });
export default function Page() {
  return (
    <>
      <div className="wrap"><div className="pg-plain"><span className="eyebrow">Plan my trip for me</span><h1>Tell us three things</h1><p className="muted">We build the whole trip: ferries, stays, cabs and things to do, all timed. Then change anything.</p></div></div>
      <Plan />
    </>
  );
}
