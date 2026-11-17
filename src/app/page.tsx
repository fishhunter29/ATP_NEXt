import Home from '@/views/Home';
import { pageMeta } from '@/lib/seo';
export const metadata = { ...pageMeta({ title: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan', description: 'Plan and book an Andaman trip as one itinerary. Ferries, hotels, cabs and things to do on Havelock, Neil, Port Blair and beyond, with every connection checked before you pay.', path: '/' }), title: { absolute: 'Andaman Travel Planner: ferries, stays, cabs and things to do in one plan' } };
export default function Page() { return <Home />; }
