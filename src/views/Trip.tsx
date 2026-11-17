'use client';
/* The trip: header (dates, flights, where you sleep, health), then each day as a photo banner and a timeline of cards.
   Card designs follow the canvas "Trip, final": cab ride slip, kraft ferry pass, boat tag, stay key card, photo cards. */
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { commit, dispatch, useEngine, type Engine } from '@/engine/client';
import { Art, Ic, Loading, Raw } from '@/components/ui';

type Row = { at: number; key: string; node: ReactNode };

export default function Trip() {
  const E = useEngine();
  const router = useRouter();
  if (!E) return <Loading />;
  const { S } = E;
  if (!S.cart.length && !S.win) return <EmptyTrip E={E} />;

  E.__resetIdeas();
  const R = E.run(S.cart); const evs = E.expand(S.cart); const pos = E.makePos(evs); const N = E.nDays();
  const fi = E.flightIn(), fo = E.flightOut();
  const hardN = R.hard; const req = E.onReq(); const total = E.total();

  // where you sleep each night
  const segs: any[] = [];
  for (let n = 0; n < N - 1; n++) {
    const st = E.nightStay(evs, n); const z = st ? st.zone : null; const uid = st ? st.it.uid : null; const L = segs[segs.length - 1];
    if (L && L.z === z && L.uid === uid) L.n++;
    else segs.push({ z, n: 1, uid, d: E.addD(S.trip.start, n), at: (() => { const p = pos(E.abs(n, 1380)); return p === 'transit' ? 'PBL' : p; })() });
  }
  const dayZone = (n: number) => { const z0 = pos(E.abs(n, 720)), zE = pos(E.abs(n, 1380)); return z0 === 'transit' ? (zE === 'transit' ? 'PBL' : zE) : z0; };
  const dmeta = Array.from({ length: N }, (_, n) => ({ zz: dayZone(n), bad: evs.some((e: any) => E.dayOf(e.s) === n && (R.by[e.it.uid] || []).some((a: any) => a.sev === 'hard')) }));
  const goCheckout = () => router.push('/checkout');
  const fixAll = () => dispatch('fixmenu');

  return (
    <>
      <div className="tp wrap">
        <aside className="tp-side" aria-label="Trip summary">
          <div className="triphd">
            <div className="r1">
              <div><span className="eyebrow">{N} days · {Math.max(0, N - 1)} nights</span><h1>{E.fD(S.trip.start)} – {E.fD(S.trip.end)}</h1><div className="muted" style={{ fontSize: 14 }}>{E.paxTxt()}</div></div>
              <button className="btn ghost sm" onClick={() => dispatch('dates')}>Change</button>
            </div>
            <div className="flights">
              {[[fi, 'Arrive', fi && `${fi.arr} · ${fi.no}`, fi && `${fi.fr.split(' (')[0]} → Port Blair`], [fo, 'Fly home', fo && `${fo.dep} · ${fo.no}`, fo && `Port Blair → ${fo.to.split(' (')[0]}`]].map(([f, k, b, sub]: any, i) => (
                <button key={k} className={`fl${f ? '' : ' add'}`} onClick={() => dispatch('dates')}>
                  <span className="fi" style={i ? { transform: 'scaleX(-1)' } : undefined}><Ic n="plane" s={18} /></span>
                  <span><small>{k}{f ? ' · ' + E.fD(f.date) : ''}</small><b>{f ? b : 'Add your flight'}</b><small>{f ? sub : i ? 'We keep your last day clear' : 'We plan day 1 around it'}</small></span>
                </button>
              ))}
            </div>
            {segs.length > 0 && (
              <div className="strip" role="list" aria-label="Where you sleep each night">
                {segs.map((s, i) => s.z ? (
                  <button key={i} role="listitem" style={{ flex: s.n, ['--zc' as any]: E.ZC(s.z) }} onClick={() => dispatch('edit', { uid: s.uid })} aria-label={`${E.ZN[s.z].name}, ${s.n} nights, change`}>
                    <span className="sp-ph"><Art z={s.z} icon="beach" seed={'STRIP:' + s.z + i} /></span><b>{E.ZN[s.z].name}</b><small>{s.n}N</small>
                  </button>
                ) : (
                  <button key={i} role="listitem" className="gap" style={{ flex: s.n }} onClick={() => router.push(`/stays?zone=${s.at}&date=${s.d}`)}><b><Ic n="plus" s={14} w={2.6} /> Add stay</b><small>{s.n}N</small></button>
                ))}
              </div>
            )}
            {(S.datesAssumed || !S.win) && !(S._nudgeOff || {}).trip && (
              <div className="nudge slim" role="note"><Ic n="cal" s={16} /><span>{S.datesAssumed ? 'Dates are a guess' : `${E.fD(S.trip.start)} – ${E.fD(S.trip.end)}, are these your dates?`}</span>
                <button className="link" onClick={() => dispatch('dates')}>Set dates</button>
                <button className="x" aria-label="Not now" onClick={() => dispatch('nudgeoff', { k: 'trip' })}><Ic n="x" s={14} w={2.4} /></button></div>
            )}
            {!S.cart.length ? (
              <div className="health none"><span className="hi"><Ic n="trip" s={18} /></span><span><b>Nothing here yet</b>Start with a ferry or a place to stay.</span></div>
            ) : hardN ? (
              <button className="health bad" onClick={fixAll}><span className="hi"><Ic n="alert" s={18} w={2.2} /></span><span><b>{hardN} thing{hardN > 1 ? 's' : ''} that {hardN > 1 ? 'do' : 'does'} not fit to sort out</b>We can fix it for you, and show you every change.</span><span className="go">Fix <Ic n="arrow" s={16} w={2.4} /></span></button>
            ) : (
              <div className="health ok"><span className="hi"><Ic n="check" s={18} w={2.6} /></span><span><b>It all fits</b>Every ferry, check-in and plan lines up.</span></div>
            )}
            {S.cart.length > 0 && (
              <>
                <div className="lx-pace" role="radiogroup" aria-label="Pace"><span>Pace</span>
                  {[['relaxed', 'Relaxed', 'One half-day plan a day'], ['balanced', 'Balanced', 'A plan for each free day'], ['packed', 'Packed', 'Fill every free window']].map(([k, l, h]) => (
                    <button key={k} aria-pressed={(S.pace || 'balanced') === k} title={h} onClick={() => dispatch('pace', { k })}>{l}</button>
                  ))}
                </div>
                <div className="lx-tools">
                  <button className="btn ghost sm" onClick={() => dispatch('trsave')}><Ic n="check" s={15} w={2.4} /> {S.tripId ? 'Save changes' : 'Save itinerary'}</button>
                  <button className="btn ghost sm" onClick={() => router.push('/my-trips')}>My trips{S.trips.length ? ` (${S.trips.length})` : ''}</button>
                  <button className="btn ghost sm" onClick={() => router.push('/plan')}>Other options</button>
                  <a className="btn ghost sm" href={`https://wa.me/?text=${encodeURIComponent(E.shareText())}`} target="_blank" rel="noopener"><Ic n="chat" s={15} /> Share on WhatsApp</a>
                </div>
                <div className="lx-tools"><button className="btn ghost sm" onClick={() => dispatch('mealsall')}><Ic n="cup" s={15} /> Add lunch and dinner to every day</button></div>
              </>
            )}
            <div className="sumrow">
              {R.soft > 0 && <span className="tag warn">{R.soft} suggestion{R.soft > 1 ? 's' : ''}</span>}
              {S.cart.length > 0 && <span className="tag">{S.cart.length} item{S.cart.length === 1 ? '' : 's'}</span>}
              {req > 0 && <span className="tag">{req} rate on request</span>}
            </div>
            <div className="tp-buy">
              <button className="tot" onClick={() => dispatch('breakdown')} aria-label="See the price breakdown"><b>{E.inr(total)}</b><small>{req ? `+ ${req} on request · ` : ''}incl. GST · breakdown</small></button>
              {!S.cart.length ? <button className="btn primary block" disabled>Checkout</button> : hardN ? <button className="btn primary block" onClick={fixAll}><Ic n="spark" s={18} /> Fix it for me</button> : <button className="btn primary block" onClick={goCheckout}>Checkout <Ic n="arrow" s={18} w={2.2} /></button>}
            </div>
          </div>
        </aside>
        <div className="tp-main">
          {N > 1 && (
            <nav className="daynav" aria-label="Jump to a day">
              {dmeta.map((m, n) => <a key={n} href={`#day${n + 1}`} className={m.bad ? 'bad' : ''} style={{ ['--zc' as any]: E.ZC(m.zz) }}><i />Day {n + 1}<span className="faint" style={{ fontWeight: 600 }}>{(E.ZSHORT || {})[m.zz] || E.ZN[m.zz].name}</span></a>)}
            </nav>
          )}
          {Array.from({ length: N }, (_, n) => <Day key={n} E={E} n={n} N={N} R={R} evs={evs} zz={dmeta[n].zz} fi={fi} fo={fo} />)}
          <div className="pad"><p className="note" style={{ paddingBlock: '12px 0' }}>Everything is in day and time order. Reporting times and the travel in between are already counted.</p></div>
        </div>
      </div>
      <div className="cta wrap abovenav">
        <button className="tot bd" onClick={() => dispatch('breakdown')} aria-label="See the price breakdown"><b>{E.inr(total)} <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}><Ic n="back" s={14} w={2.4} /></span></b><small>{req ? `+ ${req} on request · incl. GST` : 'incl. GST'} · breakdown</small></button>
        {!S.cart.length ? <button className="btn primary" disabled>Checkout</button> : hardN ? <button className="btn primary" onClick={fixAll}>Fix {hardN}</button> : <button className="btn primary" onClick={goCheckout}>Checkout</button>}
      </div>
    </>
  );
}

function EmptyTrip({ E }: { E: Engine }) {
  const router = useRouter();
  return (
    <div className="wrap"><div className="empty">
      <span className="art"><Art z="HAV" icon="trip" seed="empty" /></span>
      <h2>Your trip is empty</h2>
      <p>Add a ferry, a room or something to do. We lay it out day by day and tell you straight away if something does not fit.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn primary" onClick={() => router.push('/')}>Start exploring</button>
        <button className="btn ghost" onClick={() => { E.sampleTrip(); E.S.booked = []; commit(); }}>Show me an example trip</button>
      </div>
    </div></div>
  );
}

function Day({ E, n, N, R, evs, zz, fi, fo }: { E: Engine; n: number; N: number; R: any; evs: any[]; zz: string; fi: any; fo: any }) {
  const router = useRouter();
  const { S } = E; const date = E.addD(S.trip.start, n); const nat = E.NAT[date];
  const rows: Row[] = [];
  if (fi && E.dayIdx(fi.date) === n) rows.push({ at: E.tm(fi.arr), key: 'fi', node: <Anchor E={E} time={fi.arr} b="Land at Port Blair" s={`${fi.no} ${fi.al} from ${fi.fr}`} alerts={R.anchors.in} /> });
  evs.filter((e) => E.dayOf(e.s) === n && e.kind !== 'stay').forEach((e) => rows.push({ at: e.s % 1440, key: e.it.uid + ':' + (e.part || 0), node: <Ev E={E} e={e} R={R} /> }));
  evs.filter((e) => e.kind === 'stay' && E.dayIdx(e.it.date) === n).forEach((e) => {
    const arr = evs.filter((x) => E.dayOf(x.e) === n && x.e <= E.abs(n, 1080) && ((x.kind === 'ferry' && x.to === e.zone) || (x.kind === 'veh' && x.move === e.zone) || (x.kind === 'veh' && /Airport|Jetty|Wharf/.test(x.I.title.split(' → ')[0]) && x.zone === e.zone))).map((x) => x.e % 1440).sort((a, b) => b - a)[0];
    const fiA = fi && E.dayIdx(fi.date) === n && e.zone === 'PBL' ? E.tm(fi.arr) + 30 : null;
    e.ciAt = Math.max(E.CHECKIN, arr || fiA || E.CHECKIN);
    rows.push({ at: e.ciAt, key: e.it.uid, node: <Ev E={E} e={e} R={R} /> });
  });
  evs.filter((e) => e.kind === 'stay' && E.dayIdx(e.it.date) + e.it.nights === n).forEach((e) => {
    const lv = evs.filter((x) => E.dayOf(x.s) === n && (x.kind === 'ferry' || (x.kind === 'veh' && x.zone === e.zone))).sort((a, b) => a.s - b.s)[0];
    const lvAt = lv ? (lv.s % 1440) - (lv.kind === 'ferry' ? lv.rep : 0) : null;
    const at = lvAt != null && lvAt < E.CHECKOUT ? lvAt - 1 : E.CHECKOUT;
    const late = lvAt != null && lvAt > E.CHECKOUT + E.GRACE;
    rows.push({ at, key: 'co' + e.it.uid, node: (
      <div className="ev"><span className="et">{E.hm(at)}</span><span className="er"><span className="nd" style={{ background: 'var(--faint)' }}><Ic n="bed" s={12} /></span></span>
        <span className="ec"><div className="anchor">Check out{at < E.CHECKOUT ? ' before you leave' : ` by ${E.hm(E.CHECKOUT)} (free till ${E.hm(E.CHECKOUT + E.GRACE)})`}{e.it.late ? ' · late check-out requested' : late ? ' · bags can stay at the hotel' : ''} · <b>{e.I.title}</b></div></span></div>
    ) });
  });
  (R.day[n] || []).filter((a: any) => a.kind === 'gap').forEach((a: any, i: number) => rows.push({ at: (a.at % 1440) + 0.5, key: 'gap' + i, node: <Gap E={E} a={a} date={date} /> }));
  if (fo && E.dayIdx(fo.date) === n) rows.push({ at: E.tm(fo.dep), key: 'fo', node: <Anchor E={E} time={fo.dep} b="Fly out of Port Blair" s={`${fo.no} ${fo.al} to ${fo.to}`} alerts={R.anchors.out} /> });
  rows.sort((a, b) => a.at - b.at);
  const st = E.nightStay(evs, n); const miss = (R.day[n] || []).find((a: any) => a.kind === 'night');
  const load = E.dayLoad ? E.dayLoad(date) : null;
  const meals: string[] = E.dayMeals(date);
  const zm = zz === 'WAN' ? 'PBL' : zz;
  const mealOpts = S.cart.length ? ['bf', 'lunch', 'dinner', 'shop'].filter((k) => !meals.includes(k) && (E.ACT[E.MEALK[k].id + zm] || k !== 'shop')) : [];

  return (
    <section className="day" id={`day${n + 1}`} aria-label={`Day ${n + 1}`} data-date={date}>
      <div className="dayhd tc-dh">
        <span className="dh-ph"><Art z={zz} icon="beach" seed={'DAYHD:' + zz + ':' + date} big /></span>
        <span className="dn" style={{ ['--zc' as any]: E.ZC(zz) }}><small>Day</small><b>{n + 1}</b></span>
        <div style={{ flex: 1, minWidth: 0 }}><h3>{E.fD(date)} · {E.ZN[zz].name}</h3>
          <p>{nat && <><span><Ic n="sunrise" s={14} /> {nat.sr}</span><span><Ic n="sunset" s={14} /> {nat.ss}</span></>}{E.season(date) === 'pk' && <span>Peak season</span>}</p></div>
        <button className="iconbtn" aria-label={`Add to day ${n + 1}`} onClick={() => router.push(`/islands/${zz.toLowerCase()}?date=${date}`)}><Ic n="plus" s={20} /></button>
        {load && <div className="lx-load"><span className="lx-load-b"><i style={{ width: `${Math.min(100, load.pct || 0)}%` }} /></span><b>{load.label}</b></div>}
      </div>
      {mealOpts.length > 0 && (
        <div className="lx-meals"><small>ADD</small>
          {mealOpts.map((k) => <button key={k} className="lx-chip sm" data-k={k} onClick={() => E.addMeal(k, date)}><Ic n={k === 'shop' ? 'store' : 'cup'} s={14} /> {E.MEALK[k].n}</button>)}
        </div>
      )}
      {rows.length ? rows.map((r) => <div key={r.key} style={{ display: 'contents' }}>{r.node}</div>) : <div className="anchor" style={{ paddingLeft: 54 }}>Nothing planned yet.</div>}
      {n < N - 1 && (st ? (
        <div className="night"><Ic n="moon" s={15} /><span>Night at <b>{st.I.title}</b> · night {n - E.dayIdx(st.it.date) + 1} of {st.it.nights}</span></div>
      ) : miss ? (
        <div className="night missing"><Ic n="moon" s={15} /><span style={{ flex: 1 }}><b style={{ color: 'var(--warn)' }}>{miss.title}</b></span>
          <button className="btn sm" onClick={() => router.push(`/stays?zone=${miss.zone}&date=${date}`)}>Find a stay</button></div>
      ) : null)}
    </section>
  );
}

function Anchor({ E, time, b, s, alerts }: { E: Engine; time: string; b: string; s: string; alerts: any[] }) {
  return (
    <div className="ev"><span className="et">{time}</span><span className="er"><span className="nd" style={{ background: 'var(--ink)' }}><Ic n="plane" s={12} /></span></span>
      <span className="ec"><div className="anchor"><b>{b}</b>&nbsp;· {s}</div>{alerts.map((a, i) => <Alert key={i} E={E} a={a} />)}</span></div>
  );
}

function Alert({ E, a }: { E: Engine; a: any }) {
  const k = a.sev === 'hard' ? ['x', 'Does not fit'] : a.sev === 'soft' ? ['bulb', 'Tip'] : ['clock', 'Idea'];
  const run = (fx: any) => { const d: Record<string, any> = {}; Object.entries(fx).forEach(([key, v]) => { if (key !== 'label' && v !== '' && v != null) d[key] = key === 'patch' ? JSON.stringify(v) : v; }); dispatch('fx', d); };
  return (
    <div className={`alert ${a.sev}`} role={a.sev === 'hard' ? 'alert' : 'note'}>
      <div className="ah"><Ic n={k[0]} s={18} w={2.2} /><div><span className="kind">{k[1]}</span><b>{a.title}</b>{a.msg && <span>{a.msg}</span>}</div></div>
      {a.fix && a.fix.length > 0 && <div className="acts">{a.fix.map((f: any, i: number) => <button key={i} className={`btn sm ${f.act === 'edit' || f.act === 'dismiss' ? 'ghost' : 'quiet'}`} onClick={() => run(f)}>{f.label}</button>)}</div>}
    </div>
  );
}

function Gap({ E, a, date }: { E: Engine; a: any; date: string }) {
  const router = useRouter();
  const len = Math.floor((a.end - a.at) / 30) * 30;
  const head = (extra: ReactNode) => (
    <div className="ev"><span className="et faint">{E.clock(a.at)}</span><span className="er"><span className="nd" style={{ background: 'var(--sunk)', color: 'var(--ink)' }}><Ic n="clock" s={12} w={2.2} /></span></span>
      <span className="ec"><div className="idhd"><b>{E.durTxt(len)} free on {E.ZN[a.zone].name}</b><span>{E.clock(a.at)}–{E.clock(a.end)}{extra}</span></div></span></div>
  );
  if (a.skipped) return head(<> · <button className="link" onClick={() => dispatch('fx', { act: 'undismiss', key: 'gapday' + date })}>Show ideas</button></>);
  const { pick, blocks, leaving, landing, fiArr } = E.gapPicks(a, date);
  if (!pick.length && !blocks.length) return null;
  /* the free window, so a day plan is timed inside it (same as v1's data-from / data-to / data-eve) */
  const win = { date, from: a.at % 1440, to: a.end % 1440, eve: a.evening ? 1 : 0 };
  const why = leaving ? 'short and close, so you make your connection' : landing ? (fiArr ? `timed for your ${fiArr} landing` : 'light plans for your first hours') : blocks.length ? 'ideas that fit the time you have' : E.t('fitsHere');
  const grp = (k: string, n: number) => <div className="idgrp" key={'g' + k}><b>{k}</b><small>{n} that fit{n > 1 ? '' : 's'}</small></div>;
  return (
    <>
      {head(<> · {why}</>)}
      <div className="bleed" role="region" aria-label={`Ideas for ${E.clock(a.at)}–${E.clock(a.end)}`}><div className="idrail">
        {blocks.map((p: any, i: number) => (
          <div key={p.b.id} style={{ display: 'contents' }}>
            {(i === 0 || blocks[i - 1].span !== p.span) && grp(p.span === 'full' ? 'Full day' : 'Half day', blocks.filter((q: any) => q.span === p.span).length)}
            <div className="idc blk" style={{ ['--zc' as any]: E.ZC(p.b.z) }}>
              <button className="idc-art" onClick={() => dispatch('blk', { id: p.b.id, ...win })} aria-label={`See what is inside: ${p.b.n}`}><Art z={p.b.z} seed={p.hero} /><span className="bk-n">{p.span === 'full' ? 'Full day' : 'Half day'}</span><span className="why">★ {p.b.why}</span></button>
              <div className="idc-b"><b>{p.b.n}</b><small>{p.items.filter((i: any) => !i.during).map((i: any) => E.shortName(i.x)).join(' → ')}</small>
                <span className="idc-m"><Ic n="clock" s={14} /> {E.hm(p.start)}–{E.hm(p.end)} · {p.items.length} bookings</span>
                <div className="idc-f"><span className="price">{E.inr(p.price)}<small> for {E.pax()}</small></span>
                  <button className="btn sm" onClick={() => dispatch('blkadd', { id: p.b.id, ...win })}><Ic n="plus" s={16} w={2.6} /> Add plan</button></div></div>
            </div>
          </div>
        ))}
        {pick.length > 0 && grp('Single stops', pick.length)}
        {pick.map(({ x, slot, why: w, where }: any) => { const u = E.actUnit(x, date); return (
          <div key={x.id} className="idc" style={{ ['--zc' as any]: E.ZC(x.z) }}>
            <button className="idc-art" onClick={() => router.push(`/things-to-do/${x.id.toLowerCase()}?date=${date}`)} aria-label={`Details: ${x.n}`}><Art z={x.z} seed={x.id} />{w && <span className="why">★ {w}</span>}</button>
            <div className="idc-b"><b>{x.n}</b><small>{x.v}</small>
              <span className="idc-m"><Ic n="clock" s={14} /> {slot} · {E.durTxt(x.d)}{where ? ` · ${where}` : ''}</span>
              <div className="idc-f"><span className="price">{x.entry ? (u ? E.inr(u) : 'Free') : u ? E.inr(u) : 'On request'}<small>{x.b === 'per_pax' ? ' / person' : ''}</small></span>
                <button className="btn sm" onClick={() => dispatch('fx', { act: 'quickadd', kind: 'act', ref: x.id, date, t: slot })}><Ic n="plus" s={16} w={2.6} /> Add</button></div></div>
          </div>
        ); })}
        <button className="idc more" onClick={() => router.push(`/islands/${String(a.zone).toLowerCase()}?date=${date}`)}><Ic n="search" s={24} /><b>Everything on {E.ZN[a.zone].name}</b></button>
      </div>
      <div className="idskip"><button className="link" onClick={() => dispatch('fx', { act: 'dismiss', key: 'gapday' + date })}>Skip</button></div></div>
    </>
  );
}

/* one row on the timeline: time, coloured dot, and the card for its kind */
function Ev({ E, e, R }: { E: Engine; e: any; R: any }) {
  const { S } = E; const it = e.it; const I = e.I; const A = E.ACT[it.ref] || {};
  const al = R.by[it.uid] || []; const hard = al.some((a: any) => a.sev === 'hard'); const show = !e.parts || e.part === 1;
  const k = E.tcCat(e);
  const t0 = e.kind === 'stay' ? E.hm(e.ciAt || E.CHECKIN) : E.clock(e.s);
  const endT = e.kind !== 'stay' && e.e > e.s && k !== 'meal' && k !== 'shop' ? E.clock(e.e) : null;
  const drag = e.kind === 'act' && show && !it.own && !A.seaRoute;
  const price = A.meal || /^ACV-(MEAL|SHOP)/.test(it.ref) ? 'Pay there' : e.parts && e.part > 1 ? 'Included' : I.own ? 'Booked' : I.price != null ? E.inr(I.price) : 'On request';
  const per = (e.parts && e.part > 1) || A.meal || I.own ? '' : I.perTxt ? I.perTxt : I.per > 1 ? `${I.per} × ${E.inr(I.unit)}` : '';
  const pp = <span className="tc-pr"><b>{price}</b>{per && <small>{per}</small>}</span>;
  const status = <Raw html={E.bkTag(it) || ''} style={{ display: 'contents' }} />;
  const open = () => dispatch('edit', { uid: it.uid });
  const cls = `item tc tc-${k}${hard ? ' hard' : ''}${S.flashUid === it.uid ? ' flash' : ''}`;
  const router = useRouter();
  let card: ReactNode;

  if (k === 'cab' && /→/.test(I.title)) {
    const [fr, to] = I.title.split(/\s*→\s*/);
    const sub = String(I.sub || '').split(' · ').filter((x) => !/^until /.test(x)).slice(0, 2).join(' · ');
    card = (
      <button className={cls} onClick={open} aria-label={'Cab ' + I.title}>
        <span className="tc-bar" aria-hidden="true" />
        <span className="tc-b">
          <span className="tc-top"><Ic n="car" s={14} w={2.2} /><span className="tc-k">CAB · {sub.toUpperCase()}</span><span className="tc-d">{E.tcDur(e.e - e.s)}</span></span>
          <span className="tc-rt"><i className="o" /><b>{fr}</b>{pp}<i className="l" /><span /><i className="f" /><b>{to}</b></span>
          {status}
        </span>
      </button>
    );
  } else if (k === 'ferry' && E.SAIL[it.ref]) {
    const s = E.SAIL[it.ref]; const zf = E.ZN[s.f]?.name || s.f, zt = E.ZN[s.to]?.name || s.to;
    const seats = it.seats && it.seats.length ? it.seats.join(' ') : '';
    card = (
      <button className={cls} onClick={open} aria-label={`Ferry ${zf} to ${zt}, ${E.clock(e.s)} to ${E.clock(e.e)}`}>
        <span className="fp-stub"><Art z={e.to} icon="ship" seed={it.ref} /><em><Ic n="ferry" s={12} w={2.2} />FERRY</em></span>
        <span className="fp-cut" aria-hidden="true" />
        <span className="fp-b">
          <span className="fp-top"><span className="tc-k">{s.op.replace(/ \d$/, '').toUpperCase()}{it.cls ? ' · ' + String(it.cls).toUpperCase() : ''}</span>{pp}</span>
          <span className="fp-mid"><span className="fp-a"><b>{E.clock(e.s)}</b><small>{zf}</small></span><span className="fp-line"><i /><em>{E.tcDur(e.e - e.s)}</em><i /></span><span className="fp-a fp-r"><b>{E.clock(e.e)}</b><small>{zt}</small></span></span>
          <span className="fp-bot"><span><small>REPORT</small><b className="m">{E.clock(e.s - (e.rep || s.rep || 45))}</b></span><span><small>JETTY</small><b>{E.tcShort(s.fromPt) || zf}</b></span>{seats && <span><small>SEATS</small><b className="m">{seats}</b></span>}</span>
          {it.own ? <span className="tag bk">Booked elsewhere</span> : status}
        </span>
      </button>
    );
  } else if (k === 'boat' && show) {
    const kind = /private/i.test(A.v || '') ? 'PRIVATE' : 'SHARED'; const from = String(A.site || '').split('->')[0].trim() || E.ZN[A.z]?.name || '';
    card = (
      <button className={cls} onClick={open} aria-label={'Boat trip ' + I.title}>
        <span className="tc-ph"><Art z={e.zone} icon={I.icon} seed={it.ref} big /><em className="tc-badge"><Ic n="ferry" s={12} w={2.2} />BOAT TRIP · {kind}</em>
          <svg className="tc-wave" viewBox="0 0 390 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8 Q 24 0 48 8 T 96 8 T 144 8 T 192 8 T 240 8 T 288 8 T 336 8 T 384 8 T 432 8 V14 H0Z" /></svg>
          <span className="tc-ttl"><b>{I.title}</b></span></span>
        <span className="tc-b"><span className="tc-grid"><span><small>LEAVES</small><b className="m">{E.clock(e.s)}</b></span><span><small>BACK BY</small><b className="m">{E.clock(e.e)}</b></span><span className="w"><small>FROM</small><b>{from}</b></span>{pp}</span>{status}</span>
      </button>
    );
  } else if (k === 'stay') {
    const H = E.HOT[it.ref] || {};
    card = (
      <button className={cls} onClick={open}>
        <span className="ks-key" aria-hidden="true"><span className="ks-card"><i /></span><b>{it.nights || 1}N</b></span>
        <span className="tc-b">
          <span className="tc-k">CHECK-IN {t0}{it.early ? ' · EARLY ASKED' : ''}</span>
          <span className="tc-h"><b className="tc-t">{I.title}</b>{pp}</span>
          <span className="tc-s">{I.sub}</span>
          <span className="tc-f">{H.rt && <span className="tc-rate">★ {H.rt}</span>}{status}</span>
        </span>
      </button>
    );
  } else if (k === 'meal' || k === 'shop') {
    card = (
      <button className={cls} onClick={open}>
        <Ic n={k === 'shop' ? 'store' : 'cup'} s={16} /><b>{I.title}</b><span className="tc-s">{String(I.sub || '').replace(/ · until \d\d:\d\d$/, '')}</span><span className="tc-pay">Pay there</span>
      </button>
    );
  } else if ((k === 'do' || k === 'adv') && !I.own) {
    const rt = A.g && A.g.rt; const sub = String(I.sub || A.v || '').split(' · ')[0];
    const timing = `${E.clock(e.s)}–${E.clock(e.e)}${e.parts ? ` · DAY ${e.part} OF ${e.parts}` : ` · ${E.tcDur(e.e - e.s)}`}`;
    card = (
      <button className={cls} onClick={open}>
        <span className="tc-ph"><Art z={e.zone} icon={I.icon} seed={it.ref} big /><em className="tc-badge"><Ic n={k === 'adv' ? 'mask' : 'camera'} s={12} w={2.2} />{(k === 'adv' ? A.fam || 'Adventure' : A.fam || 'Sight').toUpperCase()}</em><span className="tc-ttl"><b>{I.title}</b>{sub && <small>{sub}</small>}</span></span>
        <span className="tc-b tc-row"><span className="tc-l"><span className="tc-tm">{timing}</span><span className="tc-f">{rt && <span className="tc-rate">★ {rt}</span>}{status}</span></span>{pp}</span>
      </button>
    );
  } else {
    card = (
      <button className={`item${hard ? ' hard' : ''}`} onClick={open}>
        <span className="ith"><Art z={e.zone} icon={I.icon} seed={it.ref} /></span>
        <span className="ib"><b>{I.title}</b><small>{I.sub}</small>{status}</span>
        <span className="ip">{price}{per && <small>{per}</small>}</span>
      </button>
    );
  }

  return (
    <div className="ev" data-uid={it.uid} data-k={e.kind} data-c={k}>
      <span className="et">{t0}{endT && <small>{endT}</small>}</span>
      <span className="er"><span className="nd" /></span>
      <span className="ec">
        {drag && <button className="lx-grip" aria-label={`Move or swap ${I.title}`} data-drag={it.uid}><Ic n="grip" s={14} w={2.2} /><span>Move</span></button>}
        {card}
        {show && al.map((a: any, i: number) => <Alert key={i} E={E} a={a} />)}
        {e.kind === 'stay' && !it.own && (
          <>
            <button className="lx-chip sm" onClick={() => router.push(`/stays?zone=${e.zone}&date=${it.date}`)}><Ic n="search" s={13} /> Change hotel</button>
            <button className="lx-chip sm" onClick={() => dispatch('swapopen', { uid: it.uid })}><Ic n="swap" s={13} /> Quick compare</button>
          </>
        )}
      </span>
    </div>
  );
}
