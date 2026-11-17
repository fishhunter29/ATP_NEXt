'use client';
/* Planned trips: ready-made itineraries you can load and then change. Also the "Plan my trip for me" builder. */
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { commit, dispatch, useEngine } from '@/engine/client';
import { Ic, Loading } from '@/components/ui';
import { PkgCard } from './Home';

export function PlannedTrips({ fallback }: { fallback?: ReactNode }) {
  const E = useEngine(); const [n, setN] = useState(0);
  if (!E) return <>{fallback ?? <Loading />}</>;
  const list = E.PKGS.filter((p: any) => !n || p.nights === n);
  const nights = [...new Set<number>(E.PKGS.map((p: any) => p.nights))].sort((a, b) => a - b);
  return (
    <div className="wrap">
      <div className="filt"><button className="chip" aria-pressed={!n} onClick={() => setN(0)}>Any length</button>{nights.map((k) => <button key={k} className="chip" aria-pressed={n === k} onClick={() => setN(k)}>{k} nights</button>)}</div>
      <div className="chgrid">{list.map((p: any) => <PkgCard key={p.id} p={p} big />)}</div>
    </div>
  );
}

/** The live part of a planned trip's page: today's price for your dates and travellers, and the button that loads it.
    The day-by-day itinerary above it is rendered on the server (src/app/trips/[id]/page.tsx). */
export function PlannedTripBuy({ id }: { id: string }) {
  const E = useEngine(); const router = useRouter();
  if (!E) return <div className="card" style={{ minHeight: 150 }} aria-busy="true" />;
  const p = E.PKGS.find((x: any) => x.id.toLowerCase() === id.toLowerCase());
  if (!p) return null;
  const pr = E.pkgPreview(p);
  // same as v1: with plans already in the trip, ask before replacing them (the pkgload sheet); otherwise load and open the trip
  const use = () => dispatch('usepkg', { id: p.id });
  return (
    <div className="card"><span className="price" style={{ font: '700 26px var(--f-mono)' }}>{E.inr(pr.total)}</span><small className="muted">for {E.paxLabel(p)} · {E.inr(pr.pp)} a person · incl. GST · from {E.fD(pr.start)}</small>
      <button className="btn primary block" onClick={use}>Use this trip <Ic n="arrow" s={18} w={2.2} /></button>
      <p className="note">You can change dates, hotels and every plan after loading it.</p></div>
  );
}

export function Plan() {
  const E = useEngine(); const router = useRouter();
  const [n, setN] = useState(4); const [style, setStyle] = useState('classic'); const [tier, setTier] = useState('Standard');
  if (!E) return <Loading />;
  /* like v1's useGen: the trip you had is saved to My trips first, then the new one replaces it (never stacked on top) */
  const build = () => {
    const { S } = E; const start = S.win ? S.win.start : E.addD(E.baseDate(), 0); const had = S.cart.length > 0;
    E.stashCurrent(); S.cart = []; S.seq = 1; S.dismissed = {}; S.tripId = null;
    const spec = E.genSpec(n, style, tier); E.buildPkg(spec, start); S.pkg = null; S.tripName = `${spec.n || 'My trip'} · ${n} nights`; E.syncTrip(); commit();
    if (had) E.toast('Your earlier trip is saved in My trips'); router.push('/trip');
  };
  return (
    <div className="wrap">
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
