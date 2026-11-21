import PlanBuilder from '@/components/PlanBuilder';
import { pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Andaman trip planner: build your itinerary in three taps', description: 'Pick when, who and the pace. The planner builds a full Andaman itinerary with ferries, hotels, cabs and things to do, timed to fit, with the price including GST. Change anything after.', path: '/plan' });
export default function Page() {
  return (
    <div className="atp-pg atp-planpg">
      <header className="atp-ph"><span className="atp-eyebrow">Plan my trip for me</span><h1>Tell us three things</h1>
        <p>We build the whole trip: stays, ferries, cabs and plans, timed to fit. You can change every part after.</p></header>
      <section className="atp-cs is-first"><PlanBuilder full /></section>
    </div>
  );
}
