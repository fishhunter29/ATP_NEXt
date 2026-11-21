'use client';
/* Plan my trip in three taps: when, who, pace. The engine then builds the whole trip (stays, ferries, cabs, plans)
   and opens it. Home shows the three; /plan adds the kind of trip and the class of stay. A month is a guess at the
   dates, and the Trip page says so until real dates are set. */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { commit, dispatch, loadEngine, showToast, useEngine } from '@/engine/client';
import { TideIcon } from '@/components/Brand';

const WHO: [string, string, string, { adults: number; kids: number }][] = [
  ['couple', 'Two of us', 'users', { adults: 2, kids: 0 }],
  ['family', 'Family', 'kid', { adults: 2, kids: 2 }],
  ['friends', 'Friends', 'users', { adults: 4, kids: 0 }],
  ['solo', 'Just me', 'user', { adults: 1, kids: 0 }],
];
const PACE: [string, string, string][] = [['relaxed', 'Relaxed', 'Free time every day'], ['balanced', 'Balanced', 'One plan a day'], ['packed', 'Packed', 'See as much as we can']];
const TIERS = ['Budget', 'Standard', 'Premium', 'Luxury'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const season = (m: number) => (m === 11 || m === 0 ? 'Peak' : m >= 5 && m <= 8 ? 'Rainy' : '');
const pad = (n: number) => String(n).padStart(2, '0');

export default function PlanBuilder({ full = false }: { full?: boolean }) {
  const E = useEngine(); const router = useRouter();
  const [when, setWhen] = useState<string | null>(null);
  const [nights, setNights] = useState(5);
  const [who, setWho] = useState<string | null>(null);
  const [pace, setPace] = useState<string | null>(null);
  const [style, setStyle] = useState('classic'); const [tier, setTier] = useState('Standard');
  const [busy, setBusy] = useState(false);
  const S = E?.S;
  /* the months ahead; the first choice is the traveller's own dates when they have set them */
  const own = E && S.win && !S.datesAssumed ? S.win.start : '';
  const months: { k: string; n: string; tag: string }[] = [];
  if (E) { const t = E.pDate(E.TODAY); for (let i = 0; i < 8; i++) { const m = (t.getUTCMonth() + i) % 12, y = t.getUTCFullYear() + Math.floor((t.getUTCMonth() + i) / 12);
    /* a Saturday in the second week; this month, a week from today */
    let d = i === 0 ? E.addD(E.TODAY, 7) : `${y}-${pad(m + 1)}-08`; if (i > 0) while (E.pDate(d).getUTCDay() !== 6) d = E.addD(d, 1);
    if (i === 0 && E.pDate(d).getUTCMonth() !== m) continue;
    months.push({ k: d, n: MON[m] + (y !== t.getUTCFullYear() && m === 0 ? ` ${String(y).slice(2)}` : ''), tag: season(m) }); } }
  const whenK = when || own || (months[1] || months[0] || { k: '' }).k;
  const paxNow = E ? `${S.pax.adults}-${S.pax.kids}` : '2-0';
  const whoK = who || (WHO.find((w) => `${w[3].adults}-${w[3].kids}` === paxNow) || ['other'])[0];
  const paceK = pace || (E && S.pace) || 'balanced';

  const build = async () => {
    const M: any = E || await loadEngine(); const T = M.S; setBusy(true);
    const had = T.cart.length > 0; M.stashCurrent();
    const w = WHO.find((x) => x[0] === whoK); if (w) T.pax = { adults: w[3].adults, kids: w[3].kids, infants: 0, ages: w[3].kids ? [9, 6].slice(0, w[3].kids) : [] };
    const start = whenK || M.addD(M.baseDate(), 0);
    if (!(own && whenK === own)) { T.win = { start, end: M.addD(start, nights) }; T.datesAssumed = true; }
    T.pace = paceK; T.cart = []; T.seq = 1; T.dismissed = {}; T.tripId = null;
    const spec = M.genSpec(nights, style, tier); M.buildPkg(spec, start); T.pkg = null; T.tripName = `${spec.n || 'My trip'} · ${nights} nights`;
    M.syncTrip(); if (paceK === 'packed') { try { M.fillEmptyDays(); M.syncTrip(); } catch {} }
    commit(); if (had) showToast('Your earlier trip is saved in My trips'); router.push('/trip');
  };

  const chip = (on: boolean, label: string, onClick: () => void, sub = '', icon = '') => (
    <button key={label} type="button" className="atp-pchip" role="radio" aria-checked={on} onClick={onClick}>{icon && <TideIcon n={icon} s={18} />}<span><b>{label}</b>{sub && <small>{sub}</small>}</span></button>
  );
  return (
    <div className={`atp-plan${full ? ' is-full' : ''}`}>
      <div className="atp-pstep">
        <div className="atp-pstep-h"><span className="atp-pn">1</span><b id="pb-when">When</b>
          <span className="atp-pnights" role="group" aria-label="Nights"><button type="button" aria-label="One night less" disabled={nights <= 2} onClick={() => setNights(nights - 1)}>−</button><span aria-live="polite">{nights} nights</span><button type="button" aria-label="One night more" disabled={nights >= 10} onClick={() => setNights(nights + 1)}>+</button></span></div>
        <div className="atp-pchips" role="radiogroup" aria-labelledby="pb-when">
          {own && chip(whenK === own, E!.fD(own).replace(/ \d{4}$/, ''), () => setWhen(own), 'Your dates')}
          {months.length ? months.map((m) => chip(whenK === m.k, m.n, () => setWhen(m.k), m.tag)) : ['', '', '', '', ''].map((_, i) => <span key={i} className="atp-pchip is-ghost" />)}
          <button type="button" className="atp-pchip is-more" onClick={async () => { await loadEngine(); dispatch('dates'); }}><TideIcon n="cal" s={18} /><span><b>Exact dates</b></span></button>
        </div>
      </div>
      <div className="atp-pstep">
        <div className="atp-pstep-h"><span className="atp-pn">2</span><b id="pb-who">Who</b>{whoK === 'other' && E && <span className="atp-pnote">{E.paxTxt()}</span>}</div>
        <div className="atp-pchips" role="radiogroup" aria-labelledby="pb-who">
          {WHO.map(([k, n, ic, p]) => chip(whoK === k, n, () => setWho(k), p.kids ? `${p.adults} adults, ${p.kids} children` : p.adults > 1 ? `${p.adults} adults` : '1 adult', ic))}
          <button type="button" className="atp-pchip is-more" onClick={async () => { await loadEngine(); setWho(null); dispatch('dates'); }}><TideIcon n="plus" s={18} /><span><b>Other</b></span></button>
        </div>
      </div>
      <div className="atp-pstep">
        <div className="atp-pstep-h"><span className="atp-pn">3</span><b id="pb-pace">Pace</b></div>
        <div className="atp-pchips is-3" role="radiogroup" aria-labelledby="pb-pace">{PACE.map(([k, n, d]) => chip(paceK === k, n, () => setPace(k), d))}</div>
      </div>
      {full && E && (
        <>
          <div className="atp-pstep">
            <div className="atp-pstep-h"><b id="pb-kind">The kind of trip</b></div>
            <div className="atp-pkinds" role="radiogroup" aria-labelledby="pb-kind">{E.GSTYLES.map((g: any) => <button key={g.k} type="button" role="radio" aria-checked={style === g.k} onClick={() => setStyle(g.k)}><span className="atp-rd" /><span><b>{g.n}</b><small>{g.d}</small></span></button>)}</div>
          </div>
          <div className="atp-pstep">
            <div className="atp-pstep-h"><b id="pb-tier">Stays</b></div>
            <div className="atp-pchips is-4" role="radiogroup" aria-labelledby="pb-tier">{TIERS.map((k) => chip(tier === k, k, () => setTier(k)))}</div>
          </div>
        </>
      )}
      <button type="button" className="atp-btn is-action atp-wide" onClick={build} disabled={busy} aria-busy={busy}>{busy ? 'Building your trip…' : 'Build my trip'}<TideIcon n="arrow" s={18} /></button>
      <p className="atp-fine atp-center">Stays, ferries, cabs and plans, timed to fit. Free, and you can change everything after.</p>
    </div>
  );
}
