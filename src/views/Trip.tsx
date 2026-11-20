'use client';
/* The Trip page (Tide): cover, what fits and what does not, where you sleep, then every day in time order.
   Cabs are shown the way they run in the islands: one car, from the hotel round the stops and back.
   Ferries are boarding passes; a tap opens class and seats. Timings and prices come from the trip engine. */
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { commit, dispatch, showToast, useEngine, type Engine } from '@/engine/client';
import { Art, Loading, Raw } from '@/components/ui';
import { TideIcon } from '@/components/Brand';
import { DayTools, ExtendBtn, PairRail, StayCompare } from '@/components/trip/TripTools';

type Row = { at: number; key: string; node: ReactNode; t?: 'cab' | 'stop' | 'meal'; e?: any };
const TILE: Record<string, [string, string]> = { ferry: ['k-boat', 'boat'], cab: ['k-cab', 'car'], stay: ['k-stay', 'bed'], do: ['k-sight', 'sunset'], adv: ['k-adv', 'mask'], boat: ['k-boat', 'wave'], meal: ['', 'cup'], shop: ['', 'store'] };
/* what a waiting cab costs an hour (the catalogue's "Cab rules"), for the note under a meal out */
const waitRate = (E: Engine, z: string) => ((E.D.extras || []).find((x: any) => /^CR-WAIT/.test(x.id) && x.z === z) || (E.D.extras || []).find((x: any) => /^CR-WAIT/.test(x.id)) || { p: 150 }).p;
const place = (s: string, stays?: Set<string>) => ((stays && stays.has(s)) || /hotels?\b|resort|your stay/i.test(s) ? 'Hotel' : String(s).replace(/\s*\(.*?\)/g, '').trim());

export default function Trip() {
  const E = useEngine();
  const router = useRouter();
  const [ferry, setFerry] = useState<string | null>(null);
  const closeFerry = useCallback(() => setFerry(null), []);
  const shape = E && E.S.trip ? `${E.S.trip.start}|${E.S.trip.end}` : '';
  /* The day rail follows the day you are reading. Done on the page itself, not through React state: the photos
     in the itinerary are the engine's, and redrawing the whole trip on every scroll would make them reload. */
  const cur = useRef(0);
  const mark = useCallback(() => {
    document.querySelectorAll('.atp-rail .atp-day').forEach((d, i) => { d.classList.toggle('is-on', i === cur.current); if (i === cur.current) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  }, []);
  useEffect(() => {
    const days = [...document.querySelectorAll<HTMLElement>('section.atp-dsec')]; if (!days.length || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; cur.current = days.indexOf(e.target as HTMLElement); mark();
      const chip = document.querySelector<HTMLElement>('.atp-rail .is-on'); const rail = chip?.parentElement;
      if (chip && rail && rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2 });
    }), { rootMargin: '-25% 0px -70% 0px' });
    days.forEach((d) => io.observe(d)); return () => io.disconnect();
  }, [shape, mark]);
  useEffect(mark); // after every redraw, the mark goes back on
  if (!E) return <Loading />;
  const { S } = E;
  /* the trip's dates are worked out from what is in it; after a reload that has not happened yet */
  if (!S.trip && (S.cart.length || S.win)) { try { E.syncTrip(); } catch {} }
  if (!S.trip || (!S.cart.length && !S.win)) return <EmptyTrip E={E} />;

  E.__resetIdeas();
  const R = E.run(S.cart); const evs = E.expand(S.cart); const pos = E.makePos(evs); const N = E.nDays();
  const fi = E.flightIn(), fo = E.flightOut();
  const hardN = R.hard; const req = E.onReq(); const total = E.total();

  // where you sleep each night
  const segs: any[] = [];
  for (let n = 0; n < N - 1; n++) {
    const st = E.nightStay(evs, n); const z = st ? st.zone : null; const uid = st ? st.it.uid : null; const L = segs[segs.length - 1];
    if (L && L.z === z && L.uid === uid) L.n++;
    else segs.push({ z, n: 1, uid, name: st ? st.I.title : '', d: E.addD(S.trip.start, n), at: (() => { const p = pos(E.abs(n, 1380)); return p === 'transit' ? 'PBL' : p; })() });
  }
  const dayZone = (n: number) => { const z0 = pos(E.abs(n, 720)), zE = pos(E.abs(n, 1380)); return z0 === 'transit' ? (zE === 'transit' ? 'PBL' : zE) : z0; };
  const dmeta = Array.from({ length: N }, (_, n) => ({ zz: dayZone(n), bad: evs.some((e: any) => E.dayOf(e.s) === n && (R.by[e.it.uid] || []).some((a: any) => a.sev === 'hard')) }));
  const cover = dmeta.map((m) => m.zz).find((z) => z !== 'PBL') || 'PBL';
  const isles = [...new Set(dmeta.map((m) => m.zz))].map((z) => E.ZN[z].name).join(', ');
  const fixAll = () => dispatch('fixmenu');
  /* the clashes themselves, named, so the panel says what is wrong before you open the fixes */
  const clashes: any[] = []; Object.values(R.by || {}).forEach((l: any) => l.forEach((a: any) => { if (a.sev === 'hard' && !clashes.some((c) => c.title === a.title)) clashes.push(a); }));
  const ferryIt = ferry ? S.cart.find((i: any) => i.uid === ferry) : null;
  /* stops with no ride yet: the engine can book a cab for each in one go (the same first choice its tips offer) */
  const noRide = Object.values(R.by || {}).flat().filter((a: any) => a.sev === 'soft' && a.fix && a.fix[0] && a.fix[0].act === 'quickadd' && a.fix[0].kind === 'cab').length;
  const addCabs = () => { S.undo = JSON.parse(JSON.stringify(S.cart)); const before = E.total(); E.addCabs(); E.syncTrip(); commit(); showToast(`Cabs added for ${noRide} stop${noRide > 1 ? 's' : ''} · +${E.inr(E.total() - before)}`, () => dispatch('undo')); };
  const tips = R.soft - noRide;

  return (
    <div className="atp-pg atp-trip">
      <aside className="atp-tside" aria-label="Trip summary">
        <div className="atp-thead">
          <span className="atp-thead-ph"><Art z={cover} icon="beach" seed={'COVER:' + cover} big /></span>
          <div className="atp-thead-b">
            <span className="atp-eyebrow">{N} days · {Math.max(0, N - 1)} nights{isles ? ` · ${isles}` : ''}</span>
            <h1>{E.fD(S.trip.start)} – {E.fD(S.trip.end)}</h1>
            <span className="atp-pax">{E.paxTxt()}</span>
          </div>
          <button type="button" className="atp-btn atp-change" onClick={() => dispatch('dates')}>Change</button>
        </div>

        <div className="atp-flights">
          {[[fi, 'Arrive', fi && `${fi.arr} · ${fi.no}`, fi && `${fi.fr.split(' (')[0]} → Port Blair`], [fo, 'Fly home', fo && `${fo.dep} · ${fo.no}`, fo && `Port Blair → ${fo.to.split(' (')[0]}`]].map(([f, k, b, sub]: any, i) => (
            <button key={k} type="button" className={`atp-hf${f ? '' : ' is-add'}`} onClick={() => dispatch('dates')}>
              <span style={i ? { transform: 'scaleX(-1)' } : undefined}><TideIcon n="plane" /></span>
              <span><small>{k}{f ? ' · ' + E.fD(f.date) : ''}</small><b>{f ? b : 'Add your flight'}</b><small>{f ? sub : i ? 'We keep your last day clear' : 'We time your first day from it'}</small></span>
            </button>
          ))}
        </div>

        {(S.datesAssumed || !S.win) && !(S._nudgeOff || {}).trip && (
          <div className="atp-nudge" role="note"><TideIcon n="cal" s={18} /><span>{S.datesAssumed ? 'These dates are a guess.' : 'Are these your dates?'}</span>
            <button type="button" className="atp-btn is-text" onClick={() => dispatch('dates')}>Set dates</button>
            <button type="button" className="atp-iconbtn" aria-label="Not now" onClick={() => dispatch('nudgeoff', { k: 'trip' })}><TideIcon n="x" s={16} /></button></div>
        )}

        {!S.cart.length ? (
          <div className="atp-fits is-none"><span className="atp-tile"><TideIcon n="trip" /></span><div><b>Nothing here yet</b><span>Start with a ferry or a place to stay.</span></div></div>
        ) : hardN ? (
          <div className="atp-fix" role="alert">
            <div className="atp-fix-h"><span className="atp-tile k-clash"><TideIcon n="alert" /></span>{hardN} thing{hardN > 1 ? 's do' : ' does'} not fit</div>
            <ul>{clashes.slice(0, 3).map((a, i) => <li key={i}>{a.title}</li>)}{clashes.length > 3 && <li>and {clashes.length - 3} more</li>}</ul>
            <div className="atp-fix-f"><button type="button" className="atp-btn is-commit" onClick={fixAll}>Review the fixes</button><span>Nothing changes until you say so, and you can undo.</span></div>
          </div>
        ) : (
          <div className="atp-fits"><span className="atp-tile k-ok"><TideIcon n="check" /></span><div><b>It all fits</b><span>Every ferry, check-in and plan lines up.{tips > 0 ? ` ${tips} tip${tips > 1 ? 's' : ''} in the days below.` : ''}</span></div></div>
        )}
        {noRide > 0 && (
          <div className="atp-ride"><span className="atp-tile k-cab"><TideIcon n="car" /></span><div><b>{noRide} stop{noRide > 1 ? 's have' : ' has'} no ride yet</b><span>One cab from your hotel, there and back, for each.</span></div>
            <button type="button" className="atp-btn is-commit" onClick={addCabs}>Add cabs</button></div>
        )}

        {segs.length > 0 && (
          <div className="atp-nights" role="list" aria-label="Where you sleep each night">
            {segs.map((s, i) => s.z ? (
              <button key={i} type="button" role="listitem" style={{ flexGrow: s.n }} onClick={() => dispatch('edit', { uid: s.uid })} aria-label={`${s.name}, ${E.ZN[s.z].name}, ${s.n} night${s.n > 1 ? 's' : ''}: change`}>
                <i style={{ background: `var(--z-${s.z})` }} /><b>{E.ZN[s.z].name}</b><small>{s.n} night{s.n > 1 ? 's' : ''}</small>
              </button>
            ) : (
              <button key={i} type="button" role="listitem" className="is-gap" style={{ flexGrow: s.n }} onClick={() => router.push(`/stays?zone=${s.at}&date=${s.d}`)}><b>Add a stay</b><small>{s.n} night{s.n > 1 ? 's' : ''}</small></button>
            ))}
          </div>
        )}

        {S.cart.length > 0 && (
          <details className="atp-ttools">
            <summary><TideIcon n="sort" s={18} />Pace, saving and sharing<TideIcon n="down" s={18} /></summary>
            <div className="atp-seg2 is-inline" role="radiogroup" aria-label="Pace">
              {[['relaxed', 'Relaxed', 'One half-day plan a day'], ['balanced', 'Balanced', 'A plan for each free day'], ['packed', 'Packed', 'Fill every free slot']].map(([k, l, h]) => (
                <button key={k} type="button" role="radio" aria-checked={(S.pace || 'balanced') === k} aria-pressed={(S.pace || 'balanced') === k} title={h} onClick={() => dispatch('pace', { k })}>{l}</button>
              ))}
            </div>
            <div className="atp-tlinks">
              <button type="button" onClick={() => dispatch('trsave')}><TideIcon n="check" s={18} />{S.tripId ? 'Save changes' : 'Save itinerary'}</button>
              <button type="button" onClick={() => router.push('/my-trips')}><TideIcon n="ticket" s={18} />My trips{S.trips.length ? ` (${S.trips.length})` : ''}</button>
              <button type="button" onClick={() => router.push('/plan')}><TideIcon n="spark" s={18} />Build it another way</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(E.shareText())}`} target="_blank" rel="noopener"><TideIcon n="chat" s={18} />Share on WhatsApp</a>
              <button type="button" onClick={() => dispatch('mealsall')}><TideIcon n="cup" s={18} />Keep time for lunch and dinner every day</button>
            </div>
          </details>
        )}

        <div className="atp-tbuy">
          <button type="button" className="atp-total" onClick={() => dispatch('breakdown')} aria-label="See the price breakdown"><b>{E.inr(total)}</b><small>{req ? `+ ${req} on request · ` : ''}incl. GST · {S.cart.length} booking{S.cart.length === 1 ? '' : 's'} · breakdown</small></button>
          {!S.cart.length ? <button type="button" className="atp-btn is-action" disabled>Checkout</button> : hardN ? <button type="button" className="atp-btn is-action" onClick={fixAll}>Fix {hardN}</button> : <button type="button" className="atp-btn is-action" onClick={() => router.push('/checkout')}>Checkout</button>}
        </div>
      </aside>

      <div className="atp-tmain">
        {N > 1 && (
          <nav className="atp-rail" aria-label="Jump to a day" style={{ ['--n' as any]: Math.min(N, 7) }}>
            {dmeta.map((m, n) => { const d = E.pDate(E.addD(S.trip.start, n)); return (
              <a key={n} href={`#day${n + 1}`} className={`atp-day${m.bad ? ' has-clash' : ''}`} aria-label={`Day ${n + 1}, ${E.ZN[m.zz].name}${m.bad ? ', something does not fit' : ''}`}>
                <i style={{ background: `var(--z-${m.zz})` }} /><small>{E.DOW[d.getUTCDay()]}</small>{d.getUTCDate()}
              </a>
            ); })}
          </nav>
        )}
        {S.cart.length > 0 && <p className="atp-hint"><TideIcon n="swap" s={14} />Tap anything to change, move or remove it.</p>}
        <ExtendBtn E={E} dir="before" />
        {Array.from({ length: N }, (_, n) => <Day key={n} E={E} n={n} N={N} R={R} evs={evs} zz={dmeta[n].zz} first={n === 0 || dmeta[n - 1].zz !== dmeta[n].zz} fi={fi} fo={fo} onFerry={setFerry} />)}
        <ExtendBtn E={E} dir="after" />
        <p className="atp-fine atp-pad">Everything is in day and time order. Reporting times and the travel in between are already counted.</p>
      </div>

      <div className="cta wrap abovenav">
        <button type="button" className="tot bd" onClick={() => dispatch('breakdown')} aria-label="See the price breakdown"><b>{E.inr(total)} <TideIcon n="down" s={14} /></b><small>{req ? `+ ${req} on request · incl. GST` : 'incl. GST · breakdown'}</small></button>
        {!S.cart.length ? <button type="button" className="atp-btn is-action" disabled>Checkout</button> : hardN ? <button type="button" className="atp-btn is-action" onClick={fixAll}>Fix {hardN}</button> : <button type="button" className="atp-btn is-action" onClick={() => router.push('/checkout')}>Checkout</button>}
      </div>
      {ferryIt && <FerrySheet E={E} it={ferryIt} onClose={closeFerry} />}
    </div>
  );
}

function EmptyTrip({ E }: { E: Engine }) {
  const router = useRouter();
  return (
    <div className="atp-pg atp-trip-empty">
      <span className="atp-thead-ph"><Art z="HAV" icon="trip" seed="empty" big /></span>
      <h1>Your trip is empty</h1>
      <p className="atp-lead">Add a ferry, a room or something to do. We lay it out day by day and tell you straight away if something does not fit.</p>
      <button type="button" className="atp-btn is-action atp-wide" onClick={() => router.push('/')}>Start exploring</button>
      <button type="button" className="atp-btn is-outline atp-wide" onClick={() => { E.sampleTrip(); E.S.booked = []; commit(); }}>Show me an example trip</button>
    </div>
  );
}

function Day({ E, n, N, R, evs, zz, first, fi, fo, onFerry }: { E: Engine; n: number; N: number; R: any; evs: any[]; zz: string; first: boolean; fi: any; fo: any; onFerry: (uid: string) => void }) {
  const router = useRouter();
  const { S } = E; const date = E.addD(S.trip.start, n); const nat = E.NAT[date];
  const rows: Row[] = [];
  const ev = (e: any) => <Ev E={E} e={e} R={R} onFerry={onFerry} />;
  if (fi && E.dayIdx(fi.date) === n) rows.push({ at: E.tm(fi.arr), key: 'fi', node: <Anchor E={E} time={fi.arr} b="Land at Port Blair" s={`${fi.no} ${fi.al} from ${fi.fr}`} alerts={R.anchors.in} /> });
  evs.filter((e) => E.dayOf(e.s) === n && e.kind !== 'stay').forEach((e) => { const k = E.tcCat(e); rows.push({ at: e.s % 1440, key: e.it.uid + ':' + (e.part || 0), node: ev(e), e, t: k === 'cab' ? 'cab' : k === 'meal' || k === 'shop' ? 'meal' : k === 'ferry' ? undefined : 'stop' }); });
  evs.filter((e) => e.kind === 'stay' && E.dayIdx(e.it.date) === n).forEach((e) => {
    const arr = evs.filter((x) => E.dayOf(x.e) === n && x.e <= E.abs(n, 1080) && ((x.kind === 'ferry' && x.to === e.zone) || (x.kind === 'veh' && x.move === e.zone) || (x.kind === 'veh' && /Airport|Jetty|Wharf/.test(x.I.title.split(' → ')[0]) && x.zone === e.zone))).map((x) => x.e % 1440).sort((a, b) => b - a)[0];
    const fiA = fi && E.dayIdx(fi.date) === n && e.zone === 'PBL' ? E.tm(fi.arr) + 30 : null;
    e.ciAt = Math.max(E.CHECKIN, arr || fiA || E.CHECKIN);
    rows.push({ at: e.ciAt, key: e.it.uid, node: ev(e) });
  });
  evs.filter((e) => e.kind === 'stay' && E.dayIdx(e.it.date) + e.it.nights === n).forEach((e) => {
    const lv = evs.filter((x) => E.dayOf(x.s) === n && (x.kind === 'ferry' || (x.kind === 'veh' && x.zone === e.zone))).sort((a, b) => a.s - b.s)[0];
    const lvAt = lv ? (lv.s % 1440) - (lv.kind === 'ferry' ? lv.rep : 0) : null;
    const at = lvAt != null && lvAt < E.CHECKOUT ? lvAt - 1 : E.CHECKOUT;
    const late = lvAt != null && lvAt > E.CHECKOUT + E.GRACE;
    rows.push({ at, key: 'co' + e.it.uid, node: (
      <div className="atp-item is-quiet"><div className="atp-row"><span className="atp-t">{E.hm(at)}</span><span className="atp-tile"><TideIcon n="bed" /></span>
        <span><span className="atp-n">Check out of {e.I.title}</span><span className="atp-s">{at < E.CHECKOUT ? 'Before you leave' : `By ${E.hm(E.CHECKOUT)}, free till ${E.hm(E.CHECKOUT + E.GRACE)}`}{e.it.late ? ' · late check-out requested' : late ? ' · bags can stay at the hotel' : ''}</span></span></div></div>
    ) });
  });
  (R.day[n] || []).filter((a: any) => a.kind === 'gap').forEach((a: any, i: number) => rows.push({ at: (a.at % 1440) + 0.5, key: 'gap' + i, node: <Gap E={E} a={a} date={date} picks={a.skipped ? null : E.gapPicks(a, date)} /> }));
  if (fo && E.dayIdx(fo.date) === n) rows.push({ at: E.tm(fo.dep), key: 'fo', node: <Anchor E={E} time={fo.dep} b="Fly out of Port Blair" s={`${fo.no} ${fo.al} to ${fo.to}`} alerts={R.anchors.out} /> });
  rows.sort((a, b) => a.at - b.at);

  /* cab loops: a run that starts with a cab and takes in at least one stop is one car's outing */
  const out: ReactNode[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].t === 'cab') {
      let j = i; while (j + 1 < rows.length && rows[j + 1].t) j++;
      while (j > i && rows[j].t === 'meal') j--; // a meal after the last ride is not part of the outing
      const run = rows.slice(i, j + 1);
      if (run.some((r) => r.t === 'stop')) { out.push(<Loop key={'loop' + rows[i].key} E={E} run={run} R={R} zz={zz} date={date} />); i = j; continue; }
    }
    out.push(<Fragment key={rows[i].key}>{rows[i].node}</Fragment>);
  }

  const st = E.nightStay(evs, n); const miss = (R.day[n] || []).find((a: any) => a.kind === 'night');
  const load = E.dayLoad ? E.dayLoad(date) : null; const bars = load ? Math.max(1, Math.round(load.r * 5)) : 0;
  const meals: string[] = E.dayMeals(date);
  const zm = zz === 'WAN' ? 'PBL' : zz; const wait = waitRate(E, zm);
  const mealOpts = S.cart.length ? ['bf', 'lunch', 'dinner', 'shop'].filter((k) => !meals.includes(k) && (E.ACT[E.MEALK[k].id + zm] || k !== 'shop')) : [];
  const d = E.pDate(date);

  return (
    <section className="atp-dsec day" id={`day${n + 1}`} aria-label={`Day ${n + 1}`} data-date={date}>
      {first && <div className="atp-banner"><Art z={zz} icon="beach" seed={'DAYHD:' + zz + ':' + date} big /><span>{E.ZN[zz].name}</span></div>}
      <div className="atp-dh">
        <h2><b>Day {n + 1}</b><span>{E.DOW[d.getUTCDay()]} {d.getUTCDate()} {E.MON[d.getUTCMonth()]}</span></h2>
        <span className="atp-zone"><i style={{ background: `var(--z-${zz})` }} />{E.ZN[zz].name}</span>
        {load && <span className="atp-fit">{load.label.replace(' day', '')}<span className="atp-meter" role="img" aria-label={`${Math.round(load.r * 100)} percent of the day is planned`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < bars ? 'on' : ''} />)}</span></span>}
        <button type="button" className="atp-iconbtn" aria-label={`Add to day ${n + 1}`} onClick={() => router.push(`/islands/${zz.toLowerCase()}?date=${date}`)}><TideIcon n="plus" /></button>
      </div>
      {(nat || E.season(date) === 'pk') && <p className="atp-sun">{nat && <><span><TideIcon n="sunrise" s={14} />{nat.sr}</span><span><TideIcon n="sunset" s={14} />{nat.ss}</span></>}{E.season(date) === 'pk' && <span>Peak season</span>}</p>}
      <DayTools E={E} date={date} zz={zz} />
      {out.length ? out : <p className="atp-fine atp-pad">Nothing planned yet.</p>}
      {mealOpts.length > 0 && (
        <div className="atp-eat" role="group" aria-label={`Eating out on day ${n + 1}, optional`}>
          <span><TideIcon n="cup" s={16} />Eat out?</span>
          <div>{mealOpts.map((k) => <button key={k} type="button" className="atp-eatc" title="We keep the time free; you pay at the table" onClick={() => E.addMeal(k, date)}><TideIcon n="plus" s={14} />{E.MEALK[k].n}{(k === 'lunch' || k === 'dinner') && <small>cab waits ~{E.inr(Math.round(wait * (k === 'dinner' ? 1.25 : 1) / 10) * 10)}</small>}</button>)}</div>
        </div>
      )}
      {n < N - 1 && (st ? (
        <div className="atp-night"><TideIcon n="moon" s={16} /><span>Night at <b>{st.I.title}</b> · night {n - E.dayIdx(st.it.date) + 1} of {st.it.nights}</span></div>
      ) : miss ? (
        <div className="atp-night is-missing"><TideIcon n="moon" s={16} /><span><b>{miss.title}</b></span><button type="button" className="atp-btn is-outline" onClick={() => router.push(`/stays?zone=${miss.zone}&date=${date}`)}>Find a stay</button></div>
      ) : null)}
    </section>
  );
}

/* One cab's outing: from where it picks you up, round the stops, and back. The rides inside open on a tap. */
function Loop({ E, run, R, zz, date }: { E: Engine; run: Row[]; R: any; zz: string; date: string }) {
  const router = useRouter(); const [open, setOpen] = useState(false);
  const cabs = run.filter((r) => r.t === 'cab').map((r) => r.e); const stops = run.filter((r) => r.t === 'stop').map((r) => r.e);
  const names = [...new Set(stops.map((s) => { const a = E.ACT[s.it.ref]; return a && E.shortName ? E.shortName(a) : s.I.title; }))];
  const from = String(cabs[0].I.title).split(/\s*→\s*/)[0]; const last = cabs[cabs.length - 1]; const to = String(last.I.title).split(/\s*→\s*/)[1] || '';
  const stays = new Set<string>(); E.S.cart.forEach((i: any) => { if (i.kind === 'stay' && E.HOT[i.ref]) stays.add(E.HOT[i.ref].n); });
  const pl = (x: string) => place(x, stays);
  const ends = run[run.length - 1].t === 'cab'; const back = ends && (from === to || (pl(from) === 'Hotel' && pl(to) === 'Hotel'));
  /* a return fare is one booking: the cab waits at the stop and brings you back */
  const waits = !ends && /return/i.test(String(last.I.sub || ''));
  const sum = cabs.reduce((s, c) => s + (c.I.price || 0), 0); const veh = String(cabs[0].I.sub || '').split(' · ')[0];
  const al = cabs.flatMap((c) => R.by[c.it.uid] || []); const hard = al.some((a: any) => a.sev === 'hard');
  const route = [pl(from), ...names, ends ? pl(to) : waits ? pl(from) : null].filter(Boolean).join(' → ');
  return (
    <div className={`atp-loop${hard ? ' is-clash' : ''}`}>
      <div className="atp-item">
        <button type="button" className="atp-row" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="atp-t">{E.clock(cabs[0].s)}</span><span className="atp-tile k-cab"><TideIcon n="car" /></span>
          <span><span className="atp-n">One cab · {names.length} stop{names.length > 1 ? 's' : ''}</span><span className="atp-s">{veh}{veh ? ' · ' : ''}{cabs.length} ride{cabs.length > 1 ? 's' : ''} <TideIcon n="down" s={12} /></span></span>
          <span className="atp-p">{E.inr(sum)}</span>
          <span className="atp-lroute">{route}</span>
        </button>
        {open && <div className="atp-legs">{cabs.map((c) => (
          <button key={c.it.uid} type="button" onClick={() => dispatch('edit', { uid: c.it.uid })}><span className="atp-mono">{E.clock(c.s)}</span><span>{c.I.title}</span><b className="atp-mono">{c.I.price != null ? E.inr(c.I.price) : ''}</b></button>
        ))}</div>}
        {al.length > 0 && <div className="atp-issue">{al.map((a: any, i: number) => <Alert key={i} a={a} />)}</div>}
      </div>
      {run.filter((r) => r.t !== 'cab').map((r) => <Fragment key={r.key}>{r.node}</Fragment>)}
      {(ends || waits) && (
        <div className="atp-end"><span className="atp-t">{ends ? E.clock(last.e) : ''}</span><span className="atp-node" /><span>{waits ? 'The cab waits, then takes you back' : back ? 'Back at the hotel' : `Dropped at ${pl(to)}`}</span>
          <button type="button" className="atp-btn is-text" onClick={() => router.push(`/islands/${zz.toLowerCase()}?date=${date}`)}>Add a stop</button></div>
      )}
    </div>
  );
}

function Anchor({ E, time, b, s, alerts }: { E: Engine; time: string; b: string; s: string; alerts: any[] }) {
  return (
    <div className="atp-item"><div className="atp-row"><span className="atp-t">{time}</span><span className="atp-tile"><TideIcon n="plane" /></span><span><span className="atp-n">{b}</span><span className="atp-s">{s}</span></span></div>
      {alerts.length > 0 && <div className="atp-issue">{alerts.map((a, i) => <Alert key={i} a={a} />)}</div>}</div>
  );
}

/* What does not fit (or a tip), in a sentence, with the ways out as buttons. */
function Alert({ a }: { a: any }) {
  const k = a.sev === 'hard' ? ['alert', 'Does not fit'] : a.sev === 'soft' ? ['bulb', 'Tip'] : ['clock', 'Idea'];
  const run = (fx: any) => { const d: Record<string, any> = {}; Object.entries(fx).forEach(([key, v]) => { if (key !== 'label' && v !== '' && v != null) d[key] = key === 'patch' ? JSON.stringify(v) : v; }); dispatch('fx', d); };
  const acts = a.fix && a.fix.length > 0 && <div className="atp-acts">{a.fix.map((f: any, i: number) => <button key={i} type="button" className={`atp-btn ${i === 0 && f.act !== 'dismiss' ? 'is-commit' : 'is-text'}`} onClick={() => run(f)}>{f.label}</button>)}</div>;
  /* a tip is one line until you open it; something that does not fit stays open */
  if (a.sev !== 'hard') return (
    <details className={`atp-alert is-${a.sev}`}>
      <summary><span className="atp-why"><TideIcon n={k[0]} s={18} />{a.title}</span><TideIcon n="down" s={16} /></summary>
      {a.msg && <span className="atp-s">{a.msg}</span>}
      {acts}
    </details>
  );
  return (
    <div className="atp-alert is-hard" role="alert">
      <span className="atp-why"><TideIcon n={k[0]} s={18} />{k[1]}: {a.title}</span>
      {a.msg && <span className="atp-s">{a.msg}</span>}
      {acts}
    </div>
  );
}

/* Free time: what fits in it, as day plans and single stops. */
/* The ideas are worked out once, while the whole trip is drawn (the engine keeps track of what it has already
   suggested); opening and closing this row must not ask again, or the list would change under your finger. */
function Gap({ E, a, date, picks }: { E: Engine; a: any; date: string; picks: any }) {
  const router = useRouter(); const [open, setOpen] = useState(false);
  const len = Math.floor((a.end - a.at) / 30) * 30;
  const head = (extra: ReactNode) => (
    <div className="atp-gap-h"><span className="atp-t">{E.clock(a.at)}</span><span className="atp-node is-open" /><span><b>{E.durTxt(len)} free on {E.ZN[a.zone].name}</b><small>until {E.clock(a.end)}{extra}</small></span></div>
  );
  if (a.skipped) return <div className="atp-gap">{head(<> · <button type="button" className="atp-link" onClick={() => dispatch('fx', { act: 'undismiss', key: 'gapday' + date })}>Show ideas</button></>)}</div>;
  const { pick, blocks, leaving, landing, fiArr } = picks;
  if (!pick.length && !blocks.length) return null;
  /* the free window, so a day plan is timed inside it */
  const win = { date, from: a.at % 1440, to: a.end % 1440, eve: a.evening ? 1 : 0 };
  const why = leaving ? 'short and close, so you make your connection' : landing ? (fiArr ? `timed for your ${fiArr} landing` : 'light plans for your first hours') : a.evening ? 'for the evening' : 'already timed to fit';
  const n = blocks.length + pick.length; const best = blocks[0] ? blocks[0].b.n : pick[0].x.n;
  if (!open) return (
    <div className="atp-gap is-shut">
      <div className="atp-gap-h"><span className="atp-t">{E.clock(a.at)}</span><span className="atp-node is-open" /><span><b>{E.durTxt(len)} free on {E.ZN[a.zone].name}</b><small>{best}{n > 1 ? ` and ${n - 1} more fit` : ' fits'}</small></span>
        <button type="button" className="atp-btn is-outline" aria-expanded="false" onClick={() => setOpen(true)}>See {n} idea{n > 1 ? 's' : ''}</button></div>
    </div>
  );
  return (
    <div className="atp-gap">
      {head(<> · {why}</>)}
      <div className="atp-rail3" role="group" aria-label={`Ideas for ${E.clock(a.at)} to ${E.clock(a.end)}`}>
        {blocks.map((p: any) => (
          <div key={p.b.id} className="atp-idea is-plan">
            <button type="button" className="atp-idea-ph" onClick={() => dispatch('blk', { id: p.b.id, ...win })} aria-label={`See what is inside: ${p.b.n}`}><Art z={p.b.z} seed={p.hero} /><span className="atp-pk-tag">{p.span === 'full' ? 'Full day' : 'Half day'} plan</span></button>
            <div className="atp-idea-b"><b>{p.b.n}</b><small>{p.items.filter((i: any) => !i.during).map((i: any) => E.shortName(i.x)).join(' → ')}</small>
              <small className="atp-mono">{E.hm(p.start)}–{E.hm(p.end)} · {p.items.length} bookings</small>
              <div className="atp-idea-f"><span className="atp-bc-p"><b>{E.inr(p.price)}</b><small>for {E.pax()}</small></span>
                <button type="button" className="atp-btn is-outline" onClick={() => dispatch('blkadd', { id: p.b.id, ...win })}><TideIcon n="plus" s={16} />Add plan</button></div></div>
          </div>
        ))}
        {pick.map(({ x, slot, why: w, where }: any) => { const u = E.actUnit(x, date); return (
          <div key={x.id} className="atp-idea">
            <button type="button" className="atp-idea-ph" onClick={() => router.push(`/things-to-do/${x.id.toLowerCase()}?date=${date}`)} aria-label={`Details: ${x.n}`}><Art z={x.z} seed={x.id} />{w && <span className="atp-pk-tag">{w}</span>}</button>
            <div className="atp-idea-b"><b>{x.n}</b><small>{x.v}</small>
              <small className="atp-mono">{slot} · {E.durTxt(x.d)}{where ? ` · ${where}` : ''}</small>
              <div className="atp-idea-f"><span className="atp-bc-p"><b>{x.entry ? (u ? E.inr(u) : 'Free') : u ? E.inr(u) : 'On request'}</b>{x.b === 'per_pax' && u ? <small>a person</small> : null}</span>
                <button type="button" className="atp-btn is-outline" onClick={() => dispatch('fx', { act: 'quickadd', kind: 'act', ref: x.id, date, t: slot })}><TideIcon n="plus" s={16} />Add</button></div></div>
          </div>
        ); })}
        <button type="button" className="atp-bc atp-more" onClick={() => router.push(`/islands/${String(a.zone).toLowerCase()}?date=${date}`)}><b>Everything on {E.ZN[a.zone].name}</b><TideIcon n="arrow" /></button>
      </div>
      <div className="atp-gap-f"><button type="button" className="atp-btn is-text" onClick={() => setOpen(false)}>Hide ideas</button><button type="button" className="atp-btn is-text" onClick={() => dispatch('fx', { act: 'dismiss', key: 'gapday' + date })}>Leave it free</button></div>
    </div>
  );
}

/* One booking on the timeline. */
function Ev({ E, e, R, onFerry }: { E: Engine; e: any; R: any; onFerry: (uid: string) => void }) {
  const { S } = E; const it = e.it; const I = e.I; const A = E.ACT[it.ref] || {};
  const al = R.by[it.uid] || []; const hard = al.some((a: any) => a.sev === 'hard'); const show = !e.parts || e.part === 1;
  const k: string = E.tcCat(e); const [tile, icon] = TILE[k] || ['', 'pin'];
  const t0 = e.kind === 'stay' ? E.hm(e.ciAt || E.CHECKIN) : E.clock(e.s);
  const endT = e.kind !== 'stay' && e.e > e.s && k !== 'meal' && k !== 'shop' && k !== 'cab' ? E.clock(e.e) : null;
  const drag = e.kind === 'act' && show && !it.own && !A.seaRoute && k !== 'meal' && k !== 'shop';
  const meal = k === 'meal' || k === 'shop';
  const price = meal ? 'Pay there' : e.parts && e.part > 1 ? 'Included' : I.own ? 'Booked' : I.price != null ? E.inr(I.price) : E.t('onReq');
  const per = (e.parts && e.part > 1) || meal || I.own ? '' : I.perTxt ? I.perTxt : I.per > 1 ? `${I.per} × ${E.inr(I.unit)}` : '';
  const bk = E.bookStatus ? E.bookStatus(it) : null;
  const status = bk && bk !== 'instant' ? <Raw html={E.bkTag(it) || ''} style={{ display: 'contents' }} /> : null;
  /* a plan you can move opens the sheet with every way to change it (time, day, swap, remove, details); the rest open their page */
  const open = () => { if (drag) { S.moveUid = it.uid; S.sheet = 'move'; commit(); } else dispatch('edit', { uid: it.uid }); };
  /* `ev` and data-uid are what the engine's drag-to-move looks for */
  const cls = `atp-item ev${hard ? ' is-clash' : ''}${S.flashUid === it.uid ? ' flash' : ''}${meal ? ' atp-mealrow' : ''}`;
  const extra = (
    <>
      {show && al.length > 0 && <div className="atp-issue">{al.map((a: any, i: number) => <Alert key={i} a={a} />)}</div>}
      {e.kind === 'stay' && !it.own && <div className="atp-under"><StayCompare E={E} it={it} zone={e.zone} /></div>}
      {e.kind === 'act' && show && S.justAdded === it.uid && <PairRail E={E} e={e} />}
    </>
  );

  if (k === 'ferry' && E.SAIL[it.ref]) {
    const s = E.SAIL[it.ref]; const zf = E.ZN[s.f]?.name || s.f, zt = E.ZN[s.to]?.name || s.to;
    const seats: string[] = it.seats || []; const d = E.pDate(it.date);
    return (
      <div className={cls + ' is-pass'} data-uid={it.uid} data-k={e.kind} data-c={k}>
        <button type="button" className="atp-pass" onClick={() => (it.own ? open() : onFerry(it.uid))} aria-label={`Ferry ${zf} to ${zt}, ${E.clock(e.s)} to ${E.clock(e.e)}: class and seats`}>
          <span className="atp-pass-band"><span><TideIcon n="boat" s={16} /><b>{s.gov ? 'Government ship' : s.op.replace(/ \d$/, '')}</b></span><span>{it.own ? 'Booked elsewhere' : it.cls || ''}</span></span>
          <span className="atp-pass-main">
            <span className="atp-pass-r">
              <span className="atp-pass-pt"><b>{E.clock(e.s)}</b><span>{zf}</span><small>{E.tcShort(s.fromPt) || s.fromPt}</small></span>
              <span className="atp-pass-mid"><i /><em>{E.tcDur(e.e - e.s).toLowerCase()}</em><i /></span>
              <span className="atp-pass-pt is-to"><b>{E.clock(e.e)}</b><span>{zt}</span><small>{E.tcShort(s.toPt) || s.toPt}</small></span>
            </span>
            <span className="atp-pass-f"><span><small>Be there by</small><b>{E.clock(e.s - (e.rep || s.rep || 45))}</b></span><span><small>Date</small><b>{d.getUTCDate()} {E.MON[d.getUTCMonth()]}</b></span><span><small>Travellers</small><b>{E.pax()}</b></span></span>
          </span>
          <span className="atp-pass-stub"><span><small>Seats</small><b>{seats.length ? seats.join(' ') : 'At the jetty'}</b></span><span className="atp-pass-bar" aria-hidden="true">{Array.from(String(E.hash(it.uid + it.ref) % 1e9).padStart(9, '3')).map((c, i) => <i key={i} style={{ width: 1 + (Number(c) % 3) }} />)}</span><span className="atp-pass-p">{price}</span></span>
        </button>
        {!it.own && <div className="atp-under"><button type="button" className="atp-btn is-text" onClick={() => onFerry(it.uid)}>Class and seats</button><button type="button" className="atp-btn is-text" onClick={open}>Change sailing</button>{status}</div>}
        {extra}
      </div>
    );
  }

  const photo = (k === 'do' || k === 'adv' || k === 'boat') && show && !I.own;
  const title = k === 'cab' ? I.title : I.title;
  const sub = k === 'stay' ? `Check in${it.early ? ' · early check-in asked' : ''} · ${I.sub || ''}`
    : k === 'cab' ? [String(I.sub || '').split(' · ').filter((x: string) => !/^until /.test(x)).slice(0, 2).join(' · '), E.tcDur(e.e - e.s).toLowerCase()].filter(Boolean).join(' · ')
    : meal ? `${String(I.sub || '').replace(/ · until \d\d:\d\d$/, '')}${k === 'meal' && A.meal !== 'bf' ? ` · if the cab waits, about ${E.inr(Math.round(waitRate(E, e.zone === 'WAN' ? 'PBL' : e.zone) * (A.d || 60) / 60 / 10) * 10)} to the driver` : ''}`
    : e.parts ? `Day ${e.part} of ${e.parts} · ${String(I.sub || A.v || '').split(' · ')[0]}`
    : [E.tcDur(e.e - e.s).toLowerCase(), String(I.sub || A.v || '').split(' · ')[0]].filter(Boolean).join(' · ');
  return (
    <div className={cls} data-uid={it.uid} data-k={e.kind} data-c={k}>
      <button type="button" className="atp-row" onClick={open} aria-label={`${title}, ${t0}: ${drag ? 'change, move or remove' : 'details'}`}>
        {photo && <span className="atp-pano"><Art z={e.zone} icon={I.icon} seed={it.ref} big /></span>}
        <span className="atp-t">{t0}{endT && <small>{endT}</small>}</span>
        <span className={`atp-tile ${tile}`}><TideIcon n={icon} /></span>
        <span><span className="atp-n">{title}</span><span className="atp-s">{sub}</span>{A.g && A.g.rt && photo ? <span className="atp-rate"><TideIcon n="starf" s={12} />{A.g.rt}</span> : null}{status}</span>
        <span className="atp-p">{price}{per && <small>{per}</small>}</span>
      </button>
      {drag && <button type="button" className="lx-grip atp-grip" aria-label={`Move or swap ${I.title}`} data-drag={it.uid}><TideIcon n="swap" s={16} /><span>Move</span></button>}
      {extra}
    </div>
  );
}

/* Class and seats for a ferry: the classes with what each costs more or less, and the cabin as the engine lays it out. */
function FerrySheet({ E, it, onClose }: { E: Engine; it: any; onClose: () => void }) {
  const s = E.SAIL[it.ref]; const n: number = E.pax();
  const fares: { n: string; f: number }[] = s.fares && s.fares.length ? s.fares : [{ n: it.cls || String(s.cls || '').split(',')[0].trim(), f: s.fare }];
  const [cls, setCls] = useState<string>(it.cls || fares[0].n);
  const [seats, setSeats] = useState<string[]>(it.seats && it.seats.length ? it.seats : E.autoSeats({ sid: it.ref, cls: it.cls || fares[0].n, date: it.date }));
  const box = useRef<HTMLDivElement>(null);
  /* Escape closes; the page behind does not scroll; focus goes into the sheet and back to where it was */
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; const from = document.activeElement as HTMLElement | null;
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; box.current?.focus();
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; from?.focus?.(); };
  }, [onClose]);
  const st = E.seatState(s, cls, it.date); const cur = (fares.find((f) => f.n === (it.cls || fares[0].n)) || fares[0]).f;
  const mine = (id: string) => seats.includes(id); const free = (id: string) => st.free.has(id) || (cls === it.cls && (it.seats || []).includes(id));
  const pick = (c: string) => { setCls(c); setSeats(c === it.cls && it.seats && it.seats.length ? it.seats : E.autoSeats({ sid: it.ref, cls: c, date: it.date })); };
  const tap = (id: string) => setSeats(mine(id) ? seats.filter((x) => x !== id) : [...seats, id].slice(-n));
  const fare = (fares.find((f) => f.n === cls) || fares[0]).f; const diff = (fare - cur) * n;
  const apply = () => { it.cls = cls; it.seats = seats; E.S.flashUid = it.uid; E.syncTrip(); commit(); E.toast(`${cls} · seats ${seats.join(' ')}`); onClose(); };
  /* on the page body, so it sits above the header and the dock */
  return createPortal(
    <div className="atp-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="atp-sheet" role="dialog" aria-modal="true" aria-label="Class and seats" tabIndex={-1} ref={box}>
        <div className="atp-sheet-h"><b>Class and seats</b><button type="button" className="atp-iconbtn" aria-label="Close" onClick={onClose}><TideIcon n="x" /></button></div>
        <div className="atp-sheet-b">
          <p className="atp-lead">{s.gov ? 'Government ship' : s.op} · {E.ZN[s.f]?.name} to {E.ZN[s.to]?.name} · {E.fD(it.date)} · {s.dep}</p>
          <div role="radiogroup" aria-label="Class">
            {fares.map((f) => { const d = (f.f - cur) * n; return (
              <button key={f.n} type="button" className="atp-cls" role="radio" aria-checked={cls === f.n} onClick={() => pick(f.n)}>
                <span className="atp-rd" /><span><b>{f.n}</b><small>{E.inr(f.f)} a person</small></span>
                <span className="atp-delta">{f.n === it.cls ? 'Yours now' : d === 0 ? 'Same price' : `${d > 0 ? '+' : '−'}${E.inr(Math.abs(d))}`}</span>
              </button>
            ); })}
          </div>
          <div className="atp-sec">Pick {n} seat{n > 1 ? 's' : ''} · {seats.length} chosen</div>
          <div className="atp-seatmap" role="group" aria-label="Seats">
            <span className="atp-bow">Front of the boat</span>
            {Array.from({ length: st.rows }, (_, r) => (
              <div key={r} className="atp-srow"><span className="rn">{r + 1}</span>
                {st.cols.map((c: string | null, i: number) => { if (!c) return <span key={i} className="atp-aisle" />; const id = r + 1 + c; const ok = free(id); return (
                  <button key={i} type="button" className={`atp-seat${ok ? '' : ' is-taken'}`} disabled={!ok} aria-pressed={mine(id)} aria-label={`Seat ${id}${ok ? '' : ', taken'}`} onClick={() => tap(id)}>{c}</button>
                ); })}
              </div>
            ))}
            <div className="atp-legend"><span><i />Free</span><span><i className="t" />Taken</span><span><i className="s" />Yours</span></div>
          </div>
          <p className="atp-fine">Seats are held when you pay. If the operator moves a seat, you are kept together and told before you travel.</p>
        </div>
        <div className="atp-sheet-f"><span className="atp-total"><b>{diff === 0 ? 'No change' : `${diff > 0 ? '+' : '−'}${E.inr(Math.abs(diff))}`}</b><small>{cls} · {seats.join(' ') || 'no seats yet'}</small></span>
          <button type="button" className="atp-btn is-action" disabled={seats.length !== Math.min(n, st.free.size + seats.length)} onClick={apply}>Use these seats</button></div>
      </div>
    </div>,
    document.body,
  );
}
