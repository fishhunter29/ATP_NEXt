/* What we promise every traveller, in one place so the words are the same wherever they appear.
   `compact` is the one-line version for tight spots (under a price, in the footer). */
import { TideIcon } from '@/components/Brand';

export const PROMISES: { k: string; icon: string; b: string; s: string }[] = [
  { k: 'fast', icon: 'clock', b: 'Confirmed in 30 minutes', s: 'Every stay, ferry, cab and activity, checked with the partner.' },
  { k: 'price', icon: 'wallet', b: 'The best price in India', s: 'We are in Port Blair and deal with every hotel, boat and driver ourselves. No middleman from the mainland.' },
  { k: 'calm', icon: 'check', b: 'No sales calls', s: 'You chose the trip. We confirm it, nothing more.' },
  { k: 'care', icon: 'chat', b: 'With you all the way', s: 'Any question, before, during and after the trip, is one message away.' },
];

export default function Promises({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  if (compact) return <ul className="atp-prom is-compact">{PROMISES.map((p) => <li key={p.k}><TideIcon n="check" s={14} />{p.b}</li>)}</ul>;
  return (
    <ul className={`atp-prom${dark ? ' is-dark' : ''}`}>
      {PROMISES.map((p) => <li key={p.k}><span className="atp-prom-i"><TideIcon n={p.icon} /></span><span><b>{p.b}</b><small>{p.s}</small></span></li>)}
    </ul>
  );
}
