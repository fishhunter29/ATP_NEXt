'use client';
/* Small tools on the trip timeline, ported from v1 (dayTools, extendBtn, stayCompare, pairRail).
   Prices and checks come from the engine; buttons run the engine's own named actions through dispatch(). */
import { useRouter } from 'next/navigation';
import { commit, dispatch, type Engine } from '@/engine/client';
import { Art, Ic } from '@/components/ui';

/* ---------- per day: which car the cab rides use (Sedan ▾), or a scooter / bike for the day ---------- */
export function DayTools({ E, date, zz }: { E: Engine; date: string; zz: string }) {
  const { S } = E;
  const cabs: any[] = E.dayCabs(date);
  const rents: any[] = (E.D.rentals || []).filter((r: any) => r.z === zz);
  const own = S.cart.find((i: any) => i.kind === 'rent' && E.RENT[i.ref] && E.RENT[i.ref].z === zz && i.date <= date && E.addD(i.date, i.days || 1) > date);
  const canWheels = rents.length > 0 && !E.moveDay(date) && !own;
  const open = S.dayTool && S.dayTool.date === date ? S.dayTool.k : null;
  if (!cabs.length && !canWheels && !own) return null;
  const cur: string | null = cabs.length ? (cabs.map((c) => c.vc).filter(Boolean)[0] || E.vehFor(E.ROUTE[cabs[0].ref]).c) : null;
  const pax = E.pax();

  let panel = null;
  if (open === 'veh' && cabs.length) {
    const now = E.priceWith(cabs, '__none__'); const scope = S.vscope || 'day';
    panel = (
      <div className="lx-dt-panel"><b>Vehicle for {cabs.length} cab ride{cabs.length > 1 ? 's' : ''} today</b>
        <div className="lx-vopts">{(E.vehClasses(cabs) as string[]).map((c) => { const d = E.priceWith(cabs, c) - now; const fits = (E.ROUTE[cabs[0].ref].prices.find((x: any) => x.c === c) || {}).seats >= pax; return (
          <button key={c} className="lx-vopt" aria-pressed={c === cur} onClick={() => dispatch('vehset', { c, d: date, z: zz })}>
            <b>{c}</b><small>{E.VSUB[c] || ''}{fits ? '' : ' · more than one needed'}</small><span>{d === 0 ? 'current' : (d > 0 ? '+' : '−') + E.inr(Math.abs(d))}</span>
          </button>
        ); })}</div>
        <div className="lx-scope" role="radiogroup" aria-label="Apply to">
          {[['day', 'This day'], ['isle', `All ${E.ZN[zz].name} rides`], ['trip', 'Whole trip']].map(([k, l]) => <button key={k} role="radio" aria-checked={scope === k} aria-pressed={scope === k} onClick={() => dispatch('vehscope', { k })}>{l}</button>)}
        </div>
      </div>
    );
  }
  if (open === 'wheels' && canWheels) {
    const sc: any[] = E.sightCabs(date, zz); const save = sc.reduce((s, c) => s + (E.info(c).price || 0), 0); const q = Math.max(1, Math.ceil(S.pax.adults / 2));
    panel = (
      <div className="lx-dt-panel"><b>Your own wheels on {E.fD(date)}</b>
        <p className="note">{sc.length ? `Replaces ${sc.length} sightseeing cab ride${sc.length > 1 ? 's' : ''} (${E.inr(save)}). ` : ''}Airport and jetty transfers stay booked. One vehicle per two adults.</p>
        <div className="lx-vopts">{rents.map((r) => { const bike = /Bicycle/.test(r.n); const tot = Math.round(r.p / 10) * 10 * (bike ? pax : q); return (
          <button key={r.id} className="lx-vopt" onClick={() => dispatch('wheelset', { id: r.id, d: date })}>
            <b>{r.n}</b><small>{bike ? `${pax} × ${E.inr(r.p)}` : `${q} × ${E.inr(r.p)}`} · {r.fuel || ''}</small>
            <span>{E.inr(tot)}{sc.length ? ` · ${tot - save <= 0 ? 'save ' + E.inr(save - tot) : '+' + E.inr(tot - save)}` : ''}</span>
          </button>
        ); })}</div>
        <p className="note"><Ic n="alert" s={14} /> Riders need a valid licence for that vehicle and must be 18 or older; helmets are given and compulsory. A refundable deposit is paid to the vendor.</p>
      </div>
    );
  }
  return (
    <div className="lx-dt">
      <div className="lx-dt-row">
        {cabs.length > 0 && <button className="lx-chip" aria-expanded={open === 'veh'} onClick={() => dispatch('daytool', { k: 'veh', d: date })}><Ic n="car" s={14} /> {cur || 'Car'} ▾</button>}
        {own ? <>
          <span className="lx-chip on"><Ic n="check" s={14} w={2.4} /> {E.RENT[own.ref].n} for the day</span>
          {/* (v1's button pointed at an action that did not exist) remove the rental, then let the engine book the cabs again */}
          <button className="lx-chip" onClick={() => { E.removeItem(own.uid); E.addCabs(); E.syncTrip(); commit(); }}>Back to cabs</button>
        </> : canWheels && <button className="lx-chip" aria-expanded={open === 'wheels'} onClick={() => dispatch('daytool', { k: 'wheels', d: date })}><Ic n="scooter" s={14} /> Scooter or bike for the day</button>}
      </div>
      {panel}
    </div>
  );
}

/* ---------- "Add a day before / after": the hotel, airport cab and flight move with it ---------- */
export function ExtendBtn({ E, dir }: { E: Engine; dir: 'before' | 'after' }) {
  const { S } = E; if (!S.trip || !S.cart.length) return null;
  const d = dir === 'before' ? E.addD(S.trip.start, -1) : E.addD(S.trip.end, 1); if (dir === 'before' && d < E.TODAY) return null;
  return (
    <div className="wrap lx-ext"><button className="lx-extbtn" onClick={() => dispatch('extend', { dir })}>
      <Ic n="plus" s={16} w={2.4} /> Add a day {dir} · <b>{E.fD(d)}</b>
      <small>{dir === 'before' ? 'Arrive a day earlier; your hotel and airport pickup move with it' : 'Stay a day longer; your flight home and airport drop move with it'}</small>
    </button></div>
  );
}

/* ---------- under a stay: change hotel, or compare a few others for the same nights (with the real change to the trip total) ---------- */
export function StayCompare({ E, it, zone }: { E: Engine; it: any; zone: string }) {
  const router = useRouter(); const { S } = E;
  const change = <button className="lx-chip sm" onClick={() => router.push(`/stays?zone=${zone}&date=${it.date}`)}><Ic n="search" s={13} /> Change hotel</button>;
  if (S.swapUid !== it.uid) return <>{change}<button className="lx-chip sm" aria-expanded="false" onClick={() => dispatch('swapopen', { uid: it.uid })}><Ic n="swap" s={13} /> Quick compare</button></>;
  const alts: any[] = E.stayAlts(it);
  return (
    <div className="lx-dt-panel"><b>Other stays on {E.ZN[E.HOT[it.ref].z].name} for these {it.nights} night{it.nights > 1 ? 's' : ''}</b>
      <div className="lx-vopts">{alts.map((x) => (
        <button key={x.h.id} className="lx-vopt" onClick={() => dispatch('swapstay', { uid: it.uid, id: x.h.id })}>
          <b>{x.h.n}</b><small>{x.why} · {x.h.t || ''}{x.h.rt ? ` · ★ ${x.h.rt} Google${x.h.rv ? ' (' + x.h.rv.toLocaleString('en-IN') + ')' : ''}` : ''}</small>
          <span>{x.d == null ? E.sgn(x.ds) : x.d === 0 ? 'same trip total' : E.sgn(x.d) + ' trip total'}</span>
          {x.d != null && Math.abs(x.d - x.ds) >= 10 && <small>stay {E.sgn(x.ds)}, transfers and GST {E.sgn(x.d - x.ds)}</small>}
        </button>
      ))}</div>
      <p className="note">Cabs to and from the jetty and your activities follow the new hotel automatically.</p>
      <button className="lx-chip sm" onClick={() => dispatch('swapopen')}>Close</button>
    </div>
  );
}

/* ---------- after you add something: what goes well with it, at a time that fits ---------- */
export function PairRail({ E, e }: { E: Engine; e: any }) {
  const router = useRouter(); const it = e.it; const a = E.ACT[it.ref];
  const out: any[] = E.pairPicks(e); if (!a || !out.length) return null;
  return (
    <div className="lx-pair">
      <div className="lx-pair-h"><b><Ic n="spark" s={14} /> Goes well with {E.shortName(a)}</b><button className="link" aria-label="Hide" onClick={() => dispatch('pairx')}>Hide</button></div>
      <div className="bleed"><div className="idrail">{out.map(({ x, s, why }) => { const u = E.actUnit(x, it.date); return (
        <div key={x.id} className="idc" style={{ ['--zc' as any]: E.ZC(x.z) }}>
          <button className="idc-art" aria-label={`Details: ${x.n}`} onClick={() => router.push(`/things-to-do/${x.id.toLowerCase()}?date=${it.date}`)}><Art z={x.z} seed={x.id} /><span className="why">★ {why}</span></button>
          <div className="idc-b"><b>{x.n}</b><small>{x.v || ''}</small><span className="idc-m"><Ic n="clock" s={14} /> {s} · {E.durOf(x)}</span>
            <div className="idc-f"><span className="price">{x.entry ? (u ? E.inr(u) : 'Free') : E.inr(u)}<small> {x.b === 'per_pax' ? '/ person' : ''}</small></span>
              <button className="btn sm" onClick={() => dispatch('fx', { act: 'quickadd', kind: 'act', ref: x.id, date: it.date, t: s })}><Ic n="plus" s={16} w={2.6} /> Add</button></div></div>
        </div>
      ); })}</div></div>
    </div>
  );
}
