'use client';
/* The parts of Home that need the phone: the plan box (your dates, your trip so far) and the islands today.
   Everything else on Home is rendered on the server (src/app/page.tsx). */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { commit, dispatch, loadEngine, useEngine } from '@/engine/client';
import { TideIcon } from '@/components/Brand';
import { istNow, sky } from '@/lib/sky';

/** Clock and sunset in the hero. Empty until the page is on the phone, so the server and the phone agree. */
export function HomeNow() {
  const [t, setT] = useState<{ clock: string; sunset: string } | null>(null);
  useEffect(() => { const tick = () => setT({ clock: istNow().clock, sunset: sky().sunset }); tick(); const id = setInterval(tick, 30000); return () => clearInterval(id); }, []);
  return <span className="atp-eyebrow">Port Blair now{t ? <> · <span className="atp-mono">{t.clock}</span> · sunset <span className="atp-mono">{t.sunset}</span></> : ''}</span>;
}

export function HomePlan({ trips }: { trips: number }) {
  const E = useEngine(); const router = useRouter(); const S = E?.S;
  const dates = async () => { await loadEngine(); dispatch('dates'); };
  const sample = async () => { const M = E || await loadEngine(); M.sampleTrip(); M.S.booked = []; M.S.scans = {}; M.S.vendorStatus = {}; commit(); router.push('/trip'); };
  const when = E && S.win && !S.datesAssumed ? `${E.fD(S.win.start)} – ${E.fD(S.win.end)}` : 'Add your dates';
  const who = E ? E.paxTxt() : '2 adults';
  /* the trip's dates are worked out from what is in it; after a reload that has not happened yet */
  if (E && S.cart.length && !S.trip) { try { E.syncTrip(); } catch {} }
  const has = !!(E && S.cart.length && S.trip);
  let fix = 0, total = '', isles = '';
  if (has) { try { fix = E!.run(S.cart).hard; total = E!.inr(E!.total()); isles = [...new Set<string>(E!.expand(S.cart).map((e: any) => e.zone).filter(Boolean))].slice(0, 4).map((z) => E!.ZN[z]?.name).filter(Boolean).join(', '); } catch {} }
  return (
    <section className="atp-hplan" aria-label="Plan a trip">
      <Link className="atp-bsearch" href="/search" prefetch={false}><TideIcon n="search" /><span>Search beaches, dives, hotels…</span></Link>
      <div className="atp-hfields">
        <button type="button" className="atp-hf" onClick={dates}><TideIcon n="cal" /><span><small>When</small><b>{when}</b></span></button>
        <button type="button" className="atp-hf" onClick={dates}><TideIcon n="users" /><span><small>Who</small><b>{who}</b></span></button>
      </div>
      <Link className="atp-btn is-action atp-wide" href="/plan" prefetch={false}>Plan my trip</Link>
      <Link className="atp-btn is-text atp-center" href="/trips" prefetch={false}>Or start from one of {trips} ready-made trips</Link>
      <ul className="atp-trust">
        <li><TideIcon n="check" s={14} />Free to plan</li><li><TideIcon n="check" s={14} />GST shown before you pay</li><li><TideIcon n="check" s={14} />UPI, cards, netbanking</li>
      </ul>
      {has ? (
        <Link className="atp-cont" href="/trip" prefetch={false}>
          <span><small className="atp-eyebrow">Your trip</small><b>{E!.fD(S.trip.start)} – {E!.fD(S.trip.end)}</b><small>{isles}</small>
            <small className={fix ? 'is-bad' : 'is-good'}>{fix ? `${fix} thing${fix > 1 ? 's' : ''} to fix` : 'Everything fits'}</small></span>
          <span className="atp-cont-p"><b>{total}</b><TideIcon n="chev" s={18} /></span>
        </Link>
      ) : (
        <button type="button" className="atp-btn is-outline atp-wide" onClick={sample}>Show me an example trip</button>
      )}
    </section>
  );
}

/** Sunrise, sunset, moon and glowing plankton for today. */
export function HomeToday() {
  const [t, setT] = useState<{ label: string; s: ReturnType<typeof sky> } | null>(null);
  useEffect(() => { setT({ label: istNow().label, s: sky() }); }, []);
  const rows: [string, string, string][] = [['sunrise', 'Sunrise', t?.s.sunrise || '–'], ['sunset', 'Sunset', t?.s.sunset || '–'], ['moon', 'Moon', t?.s.moon || '–'], ['spark', 'Glowing plankton', t?.s.glow || '–']];
  return (
    <section className="atp-hs">
      <div className="atp-hs-h"><h2>The islands today</h2><span className="atp-hs-d">{t?.label || ''}</span></div>
      <div className="atp-today">{rows.map(([ic, k, v]) => <div key={k}><span className="atp-today-i"><TideIcon n={ic} /></span><span><small>{k}</small><b>{v}</b></span></div>)}</div>
    </section>
  );
}
