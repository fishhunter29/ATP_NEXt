'use client';
/* The sailings on one route, grouped by time of day. Times and fares come from the server (they are in the page
   Google reads); a tap opens the panel that adds the sailing to your trip. */
import { Suspense, useState } from 'react';
import AddPanel from '@/components/AddPanel';
import { TideIcon } from '@/components/Brand';

type Sailing = { id: string; op: string; to: string; dep: string; arr: string; gov: boolean; fare: number; cls: string; fromPt: string };
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const mins = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);
const dur = (s: Sailing) => { const m = (mins(s.arr) - mins(s.dep) + 1440) % 1440; return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`; };
const BANDS: [string, string, (m: number) => boolean][] = [['all', 'All day', () => true], ['am', 'Morning', (m) => m < 600], ['mid', 'Midday', (m) => m >= 600 && m < 780], ['pm', 'Afternoon', (m) => m >= 780]];

export default function FerryList({ sails }: { sails: Sailing[] }) {
  const [band, setBand] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const groups = BANDS.slice(1).map(([k, n, ok]) => ({ k, n, list: sails.filter((s) => ok(mins(s.dep))) })).filter((g) => g.list.length && (band === 'all' || band === g.k));
  return (
    <>
      <div className="atp-seg2" role="group" aria-label="Time of day">
        {BANDS.map(([k, n, ok]) => { const c = sails.filter((s) => ok(mins(s.dep))).length; return c ? <button key={k} type="button" aria-pressed={band === k} onClick={() => setBand(k)}>{n}<small>{c}</small></button> : null; })}
      </div>
      {groups.map((g) => (
        <section key={g.k}>
          <h2 className="atp-fgroup">{g.n}</h2>
          {g.list.map((s) => (
            <div key={s.id} className="atp-frw">
              <button type="button" className="atp-fr" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                <span className={`atp-tile${s.gov ? '' : ' k-boat'}`}><TideIcon n="boat" /></span>
                <span>
                  <b className="atp-fr-t">{s.dep}<i>→</i>{s.arr}</b>
                  <small><b>{s.gov ? 'Government ship' : s.op}</b> · {dur(s)} · from {s.fromPt}</small>
                  <small>{s.cls}</small>
                </span>
                <span className="atp-fr-p"><b>{inr(s.fare)}</b><small>a person</small></span>
              </button>
              {open === s.id && <div className="atp-frx"><Suspense><AddPanel kind="ferry" id={s.id} /></Suspense></div>}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
