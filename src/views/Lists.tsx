'use client';
/* Browse lists: things to do, stays, cabs, search. Rows open the product page, where you pick a day and add it. */
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState, type ReactNode } from 'react';
import AddPanel from '@/components/AddPanel';
import { useEngine } from '@/engine/client';
import { Art, Loading } from '@/components/ui';

const ISLES = ['all', 'PBL', 'HAV', 'NEI', 'WAN', 'BAR', 'RAN', 'LON', 'MAY', 'DIG', 'LIT'];

function IsleFilter({ E, z, set }: any) {
  return <div className="filt" role="tablist" aria-label="Island">{ISLES.filter((k) => k === 'all' || E.ZN[k]).map((k) => <button key={k} className="chip" aria-pressed={z === k} onClick={() => set(k)}>{k === 'all' ? 'All islands' : E.ZN[k].name}</button>)}</div>;
}

export function ThingsToDo({ fallback }: { fallback?: ReactNode }) {
  const E = useEngine(); const params = useSearchParams();
  const [z, setZ] = useState(params.get('zone') || 'all');
  const [fam, setFam] = useState(params.get('k') === 'scuba' ? 'Adventure' : 'all');
  if (!E) return <>{fallback ?? <Loading />}</>;
  const ADV = E.TC_ADV as RegExp;
  const all = E.D.acts.filter((a: any) => E.shown(a) && !/^ACV-(MEAL|SHOP)/.test(a.id));
  const fams = ['all', 'Adventure', 'Sightseeing', 'Boat trips', 'Beaches'];
  const list = all.filter((a: any) => (z === 'all' || a.z === z) && (fam === 'all' || (fam === 'Adventure' ? ADV.test(a.fam + ' ' + a.n) : fam === 'Beaches' ? /beach/i.test(a.n + a.fam) : fam === 'Boat trips' ? a.fam === 'Boat trips' : !ADV.test(a.fam + ' ' + a.n))))
    .sort((a: any, b: any) => (b.g?.rt || 0) * Math.log10((b.g?.n || 1) + 1) - (a.g?.rt || 0) * Math.log10((a.g?.n || 1) + 1));
  return (
    <div className="wrap">
      <IsleFilter E={E} z={z} set={setZ} />
      <div className="filt">{fams.map((f) => <button key={f} className="chip" aria-pressed={fam === f} onClick={() => setFam(f)}>{f === 'all' ? 'Everything' : f}</button>)}</div>
      <p className="note">{list.length} to choose from</p>
      <div className="lst">{list.slice(0, 80).map((a: any) => { const p = E.actUnit(a, E.baseDate()); return (
        <Link key={a.id} className="lrow" href={`/things-to-do/${a.id.toLowerCase()}`} prefetch={false}>
          <span className="art"><Art z={a.z} seed={a.id} /></span>
          <span className="lb"><b>{a.n}</b><small>{E.ZN[a.z].name} · {a.v}</small><span className="price">{p ? `from ${E.inr(p)}` : 'On request'}{a.g?.rt ? <small style={{ display: 'inline', marginLeft: 8 }}>★ {a.g.rt} Google</small> : null}</span></span>
        </Link>
      ); })}</div>
    </div>
  );
}

export function Stays({ fallback }: { fallback?: ReactNode }) {
  const E = useEngine(); const params = useSearchParams();
  const [z, setZ] = useState(params.get('zone') || 'all');
  const date = params.get('date') || '';
  if (!E) return <>{fallback ?? <Loading />}</>;
  const list = E.D.hotels.filter((h: any) => z === 'all' || h.z === z).sort((a: any, b: any) => (b.rt || 0) * Math.log10((b.rv || 1) + 1) - (a.rt || 0) * Math.log10((a.rv || 1) + 1));
  return (
    <div className="wrap">
      <IsleFilter E={E} z={z} set={setZ} />
      <p className="note">{list.length} stays · prices per night before GST</p>
      <div className="lst">{list.map((h: any) => (
        <Link key={h.id} className="lrow noimg" href={`/stays/${h.id.toLowerCase()}${date ? `?date=${date}` : ''}`} prefetch={false}>
          <span className="lb"><b>{h.n}</b><small>{E.ZN[h.z].name} · {h.t}{h.rt ? ` · ★ ${h.rt} Google` : ''}{h.rv ? ` (${h.rv.toLocaleString('en-IN')})` : ''}</small><span className="price">from {E.inr(E.hotelFrom(h, date || undefined))}</span></span>
        </Link>
      ))}</div>
    </div>
  );
}

export function Cabs({ fallback }: { fallback?: ReactNode }) {
  const E = useEngine(); const params = useSearchParams();
  const [z, setZ] = useState(params.get('zone') || 'PBL');
  const [open, setOpen] = useState<string | null>(null);
  if (!E) return <>{fallback ?? <Loading />}</>;
  const routes = E.D.routes.filter((r: any) => r.z === z && !r.hop);
  return (
    <div className="wrap">
      <IsleFilter E={E} z={z} set={setZ} />
      <div className="lst">{routes.map((r: any) => (
        <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="lrow noimg" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
            <span className="lb"><b>{r.a} → {r.b}</b><small>{r.km ? `${r.km} km · ` : ''}{r.mins} min{r.wait ? ` · waits ${Math.round(r.wait / 60 * 10) / 10} h` : ''}</small><span className="price">from {E.inr(Math.min(...r.prices.map((p: any) => p.ow || p.ret || Infinity)))}</span></span>
          </button>
          {open === r.id && <Suspense><AddPanel kind="cab" id={r.id} /></Suspense>}
        </div>
      ))}</div>
    </div>
  );
}

export function Search() {
  const E = useEngine(); const router = useRouter();
  const [q, setQ] = useState('');
  if (!E) return <Loading />;
  const s = q.trim().toLowerCase();
  const acts = s.length > 1 ? E.D.acts.filter((a: any) => E.shown(a) && (a.n + ' ' + a.v + ' ' + a.fam + ' ' + E.ZN[a.z].name).toLowerCase().includes(s)).slice(0, 30) : [];
  const stays = s.length > 1 ? E.D.hotels.filter((h: any) => (h.n + ' ' + E.ZN[h.z].name).toLowerCase().includes(s)).slice(0, 20) : [];
  return (
    <div className="wrap"><div className="pg-plain"><h1>Search</h1></div>
      <input className="srch" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search beaches, dives, hotels…" aria-label="Search" />
      <div className="lst" style={{ marginTop: 12 }}>
        {acts.map((a: any) => <button key={a.id} className="lrow" onClick={() => router.push(`/things-to-do/${a.id.toLowerCase()}`)}><span className="art"><Art z={a.z} seed={a.id} /></span><span className="lb"><b>{a.n}</b><small>{E.ZN[a.z].name} · {a.v}</small></span></button>)}
        {stays.map((h: any) => <button key={h.id} className="lrow noimg" onClick={() => router.push(`/stays/${h.id.toLowerCase()}`)}><span className="lb"><b>{h.n}</b><small>Stay · {E.ZN[h.z].name} · {h.t}</small></span></button>)}
        {s.length > 1 && !acts.length && !stays.length && <p className="note">Nothing found for “{q}”.</p>}
      </div>
    </div>
  );
}
