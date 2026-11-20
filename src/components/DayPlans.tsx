'use client';
/* Half-day and full-day plans: a few stops in the right order, sold as one plan.
   Rendered on the server from src/data/dayplans.json (Google reads it); a tap opens the day-plan sheet. */
import { dispatch, loadEngine } from '@/engine/client';
import PLANS from '@/data/dayplans.json';
import Rail from '@/components/browse/Rail';

type Plan = { id: string; z: string; ph: string; n: string; why: string; full: boolean; pp: number; stops: { id: string; n: string }[] };
const ZNAME: Record<string, string> = { PBL: 'Port Blair', HAV: 'Havelock', NEI: 'Neil', BAR: 'Baratang', RAN: 'Rangat', LON: 'Long Island', MAY: 'Mayabunder', DIG: 'Diglipur', LIT: 'Little Andaman', WAN: 'Wandoor' };
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function DayPlans({ zone, date }: { zone?: string; date?: string }) {
  const list = (PLANS as Plan[]).filter((b) => !zone || b.z === zone);
  if (!list.length) return null;
  const open = (id: string) => loadEngine().then(() => dispatch('blk', { id, date }));
  return (
    <div className="atp-dp">
      <div className="atp-hs-h"><h2>{zone ? `Day plans on ${ZNAME[zone] || zone}` : 'Half-day and full-day plans'}</h2><span className="atp-hs-d">{list.length} plans</span></div>
      <p className="atp-lead">A few stops in the right order, timed around travel and opening hours. Take the whole plan, or only the parts you like.</p>
      <Rail label="Day plans" className="atp-rail2">
        {list.map((b) => (
          <button key={b.id} type="button" className="atp-pk blkt" onClick={() => open(b.id)} aria-label={`${b.n}: see the plan`}>
            <span className="atp-pk-ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/img/t/${b.ph}.webp`} alt="" width={520} height={293} loading="lazy" decoding="async" />
              <span className="atp-pk-tag">{b.full ? 'Full day' : 'Half day'}{zone ? '' : ` · ${ZNAME[b.z] || b.z}`}</span>
            </span>
            <span className="atp-pk-b"><b>{b.n}</b>
              <span className="atp-stops">{b.stops.map((x, i) => <small key={x.id}><i>{i + 1}</i>{x.n}</small>)}</span>
              <span className="atp-pk-p"><b>{inr(b.pp)}</b><small>a person · {b.stops.length} bookings in one</small></span>
            </span>
          </button>
        ))}
      </Rail>
    </div>
  );
}
