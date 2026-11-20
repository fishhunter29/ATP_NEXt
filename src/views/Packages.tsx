'use client';
/* The live part of a ready-made trip's page, and the "Plan my trip for me" builder. The list of trips is the browse screen. */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { commit, dispatch, useEngine } from '@/engine/client';
import { Ic, Loading } from '@/components/ui';

/** The live part of a planned trip's page: today's price for your dates and travellers, and the button that loads it.
    The day-by-day itinerary above it is rendered on the server (src/app/trips/[id]/page.tsx). */
export function PlannedTripBuy({ id }: { id: string }) {
  const E = useEngine(); const router = useRouter();
  if (!E) return <div className="atp-buy" style={{ minHeight: 132 }} aria-busy="true" />;
  const p = E.PKGS.find((x: any) => x.id.toLowerCase() === id.toLowerCase());
  if (!p) return null;
  const pr = E.pkgPreview(p);
  // same as v1: with plans already in the trip, ask before replacing them (the pkgload sheet); otherwise load and open the trip
  const use = () => dispatch('usepkg', { id: p.id });
  return (
    <div className="atp-buy">
      <span className="atp-total"><b>{E.inr(pr.pp)}</b><small>a person · {E.inr(pr.total)} for {E.paxLabel(p)} · incl. GST · from {E.fD(pr.start)}</small></span>
      <button className="atp-btn is-action" onClick={use}>Use this trip</button>
      <p className="atp-fine">You can change dates, hotels and every plan after loading it.</p>
    </div>
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
