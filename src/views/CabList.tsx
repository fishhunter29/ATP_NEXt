'use client';
/* Cabs and scooters on one island, grouped by the kind of ride. Routes and prices come from the server;
   a tap opens the panel that adds the ride to your trip. */
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import AddPanel from '@/components/AddPanel';
import { TideIcon } from '@/components/Brand';

export type CabRoute = { id: string; z: string; a: string; b: string; km: number | null; mins: number; wait: number; kind: string; p: number };
export type Rental = { id: string; z: string; n: string; p: number; note: string };
type Isle = { id: string; n: string };
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const time = (m: number) => (m < 90 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);
const KINDS: [string, string, string][] = [
  ['airport', 'Airport', 'plane'], ['jetty', 'Jetty and ferry', 'boat'], ['drop', 'Beaches and sights', 'sunset'],
  ['daytrip', 'Day trips', 'map'], ['road', 'Long road journeys', 'car'], ['transfer', 'Hotel to hotel', 'bed'],
];

function View({ routes, rentals, isles, zone }: { routes: CabRoute[]; rentals: Rental[]; isles: Isle[]; zone: string }) {
  const [z, setZ] = useState(zone);
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState<Record<string, boolean>>({});
  const here = routes.filter((r) => r.z === z); const rent = rentals.filter((r) => r.z === z);
  const groups = KINDS.map(([k, n, icon]) => ({ k, n, icon, list: here.filter((r) => r.kind === k) })).filter((g) => g.list.length);
  const row = (id: string, kind: 'cab' | 'rent', icon: string, title: string, sub: string, p: number, unit: string) => (
    <div key={id} className="atp-frw">
      <button type="button" className="atp-fr" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
        <span className="atp-tile k-cab"><TideIcon n={icon} /></span>
        <span><b>{title}</b><small>{sub}</small></span>
        <span className="atp-fr-p"><small>from</small><b>{inr(p)}</b><small>{unit}</small></span>
      </button>
      {open === id && <div className="atp-frx"><Suspense><AddPanel kind={kind} id={id} /></Suspense></div>}
    </div>
  );
  return (
    <>
      <div className="atp-seg2" role="group" aria-label="Island">
        {isles.map((i) => <button key={i.id} type="button" aria-pressed={z === i.id} onClick={() => { setZ(i.id); setOpen(null); }}>{i.n}<small>{routes.filter((r) => r.z === i.id).length}</small></button>)}
      </div>
      {groups.length > 1 && <div className="atp-cats" role="group" aria-label="Kinds of ride">
        {groups.map((g) => <a key={g.k} className="atp-cat" href={`#cab-${g.k}`}><TideIcon n={g.icon} s={22} /><b>{g.n}</b><small>{g.list.length}</small></a>)}
        {rent.length > 0 && <a className="atp-cat" href="#cab-rent"><TideIcon n="wave" s={22} /><b>Scooters and self-drive</b><small>{rent.length}</small></a>}
      </div>}
      {groups.map((g) => { const more = g.list.length > 5 && !all[g.k]; return (
        <section key={g.k} id={`cab-${g.k}`} className="atp-cabg">
          <h2 className="atp-fgroup">{g.n}<small>{g.list.length}</small></h2>
          {(more ? g.list.slice(0, 5) : g.list).map((r) => row(r.id, 'cab', 'car', `${r.a} → ${r.b}`, `${r.km ? `${r.km} km · ` : ''}${time(r.mins)}${r.wait ? ` · cab waits ${Math.round(r.wait * 10) / 10} h` : ''}`, r.p, 'one way'))}
          {more && <button type="button" className="atp-btn is-text atp-showall" onClick={() => setAll({ ...all, [g.k]: true })}>Show all {g.list.length}</button>}
        </section>
      ); })}
      {rent.length > 0 && (
        <section id="cab-rent" className="atp-cabg">
          <h2 className="atp-fgroup">Scooters and self-drive<small>{rent.length}</small></h2>
          {rent.map((r) => row(r.id, 'rent', 'wave', r.n, r.note, r.p, 'a day'))}
        </section>
      )}
      {!groups.length && !rent.length && <p className="atp-empty">No cabs to book here yet.</p>}
    </>
  );
}

function Live(props: { routes: CabRoute[]; rentals: Rental[]; isles: Isle[] }) {
  const sp = useSearchParams(); const z = (sp.get('zone') || sp.get('island') || 'PBL').toUpperCase();
  return <View {...props} zone={props.isles.some((i) => i.id === z) ? z : 'PBL'} key={z} />;
}

export default function CabList(props: { routes: CabRoute[]; rentals: Rental[]; isles: Isle[] }) {
  return <Suspense fallback={<View {...props} zone="PBL" />}><Live {...props} /></Suspense>;
}
