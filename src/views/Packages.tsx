'use client';
/* Planned trips: ready-made itineraries you can load and then change. Also the "Plan my trip for me" builder. */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { commit, useEngine } from '@/engine/client';
import { Ic, Loading } from '@/components/ui';
import { PkgCard } from './Home';

export function PlannedTrips() {
  const E = useEngine(); const [n, setN] = useState(0);
  if (!E) return <Loading />;
  const list = E.PKGS.filter((p: any) => !n || p.nights === n);
  const nights = [...new Set<number>(E.PKGS.map((p: any) => p.nights))].sort((a, b) => a - b);
  return (
    <div className="wrap"><div className="pg-plain"><span className="eyebrow">Planned trips</span><h1>Trips we have planned</h1><p className="muted">{E.PKGS.length} full trips. Every ferry checked. Load one and change anything.</p></div>
      <div className="filt"><button className="chip" aria-pressed={!n} onClick={() => setN(0)}>Any length</button>{nights.map((k) => <button key={k} className="chip" aria-pressed={n === k} onClick={() => setN(k)}>{k} nights</button>)}</div>
      <div className="chgrid">{list.map((p: any) => <PkgCard key={p.id} p={p} big />)}</div>
    </div>
  );
}

export function PlannedTrip({ id }: { id: string }) {
  const E = useEngine(); const router = useRouter();
  if (!E) return <Loading />;
  const p = E.PKGS.find((x: any) => x.id.toLowerCase() === id.toLowerCase());
  if (!p) return <div className="wrap"><div className="empty"><h2>Trip not found</h2></div></div>;
  const pr = E.pkgPreview(p);
  const use = () => { E.buildPkg(p, pr.start); E.S.pkg = null; E.syncTrip(); commit(); router.push('/trip'); };
  const byDay: Record<string, any[]> = {}; pr.items.forEach((it: any) => { (byDay[it.date] = byDay[it.date] || []).push(it); });
  return (
    <div className="wrap"><div className="pg-plain"><span className="eyebrow">{p.nights} nights · {p.nights + 1} days · {p.tag}</span><h1>{E.S.lang === 'hi' ? p.hi : p.n}</h1>
      <p className="muted">{E.route(p).map(([z, n]: any) => `${E.ZN[z].name} ${n}N`).join(' → ')}</p></div>
      <div className="pg-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.hl.map((h: string) => <div key={h}><Ic n="check" s={14} w={2.6} /> {h}</div>)}
          {Object.entries(byDay).sort().map(([d, items], i) => (
            <div key={d} className="card"><b>Day {i + 1} · {E.fD(d)}</b>{items.slice().sort((a: any, b: any) => String(a.t || '').localeCompare(String(b.t || ''))).map((it: any) => { const I = E.info(it); return <div key={it.uid} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}><span>{it.t ? <span className="mono">{it.t} </span> : null}{I.title}</span><span className="mono">{I.price != null ? E.inr(I.price) : ''}</span></div>; })}</div>
          ))}
        </div>
        <aside><div className="card"><span className="price" style={{ font: '700 26px var(--f-mono)' }}>{E.inr(pr.total)}</span><small className="muted">for {E.paxLabel(p)} · {E.inr(pr.pp)} a person · incl. GST</small>
          <button className="btn primary block" onClick={use}>Use this trip <Ic n="arrow" s={18} w={2.2} /></button>
          <p className="note">You can change dates, hotels and every plan after loading it.</p></div></aside>
      </div>
    </div>
  );
}

export function Plan() {
  const E = useEngine(); const router = useRouter();
  const [n, setN] = useState(4); const [style, setStyle] = useState('classic'); const [tier, setTier] = useState('Standard');
  if (!E) return <Loading />;
  const build = () => { const start = E.S.win ? E.S.win.start : E.addD(E.baseDate(), 0); E.buildPkg(E.genSpec(n, style, tier), start); E.S.pkg = null; E.syncTrip(); commit(); router.push('/trip'); };
  return (
    <div className="wrap"><div className="pg-plain"><span className="eyebrow">Plan my trip for me</span><h1>Tell us three things</h1><p className="muted">We build the whole trip: ferries, stays, cabs and things to do, all timed. Then change anything.</p></div>
      <div className="card" style={{ gap: 14 }}>
        <div className="eyebrow">How many nights?</div>
        <div className="chips">{[2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => <button key={k} className="chip" aria-pressed={n === k} onClick={() => setN(k)}>{k}</button>)}</div>
        <div className="eyebrow">What kind of trip?</div>
        <div className="lst">{E.GSTYLES.map((g: any) => <button key={g.k} className="lrow noimg" aria-pressed={style === g.k} style={style === g.k ? { borderColor: 'var(--brand)' } : undefined} onClick={() => setStyle(g.k)}><span className="lb"><b>{g.n}</b><small>{g.d}</small></span></button>)}</div>
        <div className="eyebrow">Stays</div>
        <div className="chips">{['Budget', 'Standard', 'Premium', 'Luxury'].map((k) => <button key={k} className="chip" aria-pressed={tier === k} onClick={() => setTier(k)}>{k}</button>)}</div>
        <button className="btn primary block" onClick={build}>Build my trip <Ic n="arrow" s={18} w={2.2} /></button>
      </div>
    </div>
  );
}
