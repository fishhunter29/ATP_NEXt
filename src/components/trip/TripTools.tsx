'use client';
/* Small tools on the trip timeline, ported from v1 (dayTools, extendBtn, stayCompare, pairRail).
   Prices and checks come from the engine; buttons run the engine's own named actions through dispatch(). */
import { useRouter } from 'next/navigation';
import { commit, dispatch, lang, type Engine } from '@/engine/client';
import { Art, Ic } from '@/components/ui';
import { TideIcon } from '@/components/Brand';

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
  const pax = E.pax(); const L = lang(E);

  let panel = null;
  if (open === 'veh' && cabs.length) {
    const now = E.priceWith(cabs, '__none__'); const scope = S.vscope || 'day';
    panel = (
      <div className="lx-dt-panel"><b>{L(`Vehicle for ${cabs.length} cab ride${cabs.length > 1 ? 's' : ''} today`, `आज की ${cabs.length} कैब सवारी के लिए गाड़ी`)}</b>
        <div className="lx-vopts">{(E.vehClasses(cabs) as string[]).map((c) => { const d = E.priceWith(cabs, c) - now; const fits = (E.ROUTE[cabs[0].ref].prices.find((x: any) => x.c === c) || {}).seats >= pax; return (
          <button key={c} className="lx-vopt" aria-pressed={c === cur} onClick={() => dispatch('vehset', { c, d: date, z: zz })}>
            <b>{c}</b><small>{E.VSUB[c] || ''}{fits ? '' : L(' · more than one needed', ' · एक से ज़्यादा चाहिए')}</small><span>{d === 0 ? L('current', 'अभी वाली') : (d > 0 ? '+' : '−') + E.inr(Math.abs(d))}</span>
          </button>
        ); })}</div>
        <div className="lx-scope" role="radiogroup" aria-label={L('Apply to', 'किस पर लागू करें')}>
          {[['day', L('This day', 'यह दिन')], ['isle', L(`All ${E.ZN[zz].name} rides`, `${E.ZN[zz].name} की सभी सवारी`)], ['trip', L('Whole trip', 'पूरी यात्रा')]].map(([k, l]) => <button key={k} role="radio" aria-checked={scope === k} aria-pressed={scope === k} onClick={() => dispatch('vehscope', { k })}>{l}</button>)}
        </div>
      </div>
    );
  }
  if (open === 'wheels' && canWheels) {
    const sc: any[] = E.sightCabs(date, zz); const save = sc.reduce((s, c) => s + (E.info(c).price || 0), 0); const q = Math.max(1, Math.ceil(S.pax.adults / 2));
    panel = (
      <div className="lx-dt-panel"><b>{L(`Your own wheels on ${E.fD(date)}`, `${E.fD(date)} को अपनी गाड़ी`)}</b>
        <p className="note">{sc.length ? L(`Replaces ${sc.length} sightseeing cab ride${sc.length > 1 ? 's' : ''} (${E.inr(save)}). `, `घूमने की ${sc.length} कैब सवारी (${E.inr(save)}) की जगह। `) : ''}{L('Airport and jetty transfers stay booked. One vehicle per two adults.', 'एयरपोर्ट और जेट्टी की सवारी बुक रहती है। हर दो वयस्कों पर एक गाड़ी।')}</p>
        <div className="lx-vopts">{rents.map((r) => { const bike = /Bicycle/.test(r.n); const tot = Math.round(r.p / 10) * 10 * (bike ? pax : q); return (
          <button key={r.id} className="lx-vopt" onClick={() => dispatch('wheelset', { id: r.id, d: date })}>
            <b>{r.n}</b><small>{bike ? `${pax} × ${E.inr(r.p)}` : `${q} × ${E.inr(r.p)}`} · {r.fuel || ''}</small>
            <span>{E.inr(tot)}{sc.length ? ` · ${tot - save <= 0 ? L('save ', 'बचत ') + E.inr(save - tot) : '+' + E.inr(tot - save)}` : ''}</span>
          </button>
        ); })}</div>
        <p className="note"><Ic n="alert" s={14} /> {L('Riders need a valid licence for that vehicle and must be 18 or older; helmets are given and compulsory. A refundable deposit is paid to the vendor.', 'चलाने वाले के पास उस गाड़ी का वैध लाइसेंस हो और उम्र 18 या ज़्यादा हो; हेलमेट मिलता है और ज़रूरी है। वापस मिलने वाली जमा राशि विक्रेता को दी जाती है।')}</p>
      </div>
    );
  }
  return (
    <div className="lx-dt">
      <div className="lx-dt-row">
        {cabs.length > 0 && <button className="lx-chip" aria-expanded={open === 'veh'} onClick={() => dispatch('daytool', { k: 'veh', d: date })}><Ic n="car" s={14} /> {cur || 'Car'} ▾</button>}
        {own ? <>
          <span className="lx-chip on"><Ic n="check" s={14} w={2.4} /> {E.RENT[own.ref].n} {L('for the day', 'पूरे दिन')}</span>
          {/* (v1's button pointed at an action that did not exist) remove the rental, then let the engine book the cabs again */}
          <button className="lx-chip" onClick={() => { E.removeItem(own.uid); E.addCabs(); E.syncTrip(); commit(); }}>{L('Back to cabs', 'वापस कैब पर')}</button>
        </> : canWheels && <button className="lx-chip" aria-expanded={open === 'wheels'} onClick={() => dispatch('daytool', { k: 'wheels', d: date })}><Ic n="scooter" s={14} /> {L('Scooter or bike for the day', 'दिन भर के लिए स्कूटर या बाइक')}</button>}
      </div>
      {panel}
    </div>
  );
}

/* ---------- "Add a day before / after": the hotel, airport cab and flight move with it ---------- */
export function ExtendBtn({ E, dir }: { E: Engine; dir: 'before' | 'after' }) {
  const { S } = E; if (!S.trip || !S.cart.length) return null; const L = lang(E);
  const d = dir === 'before' ? E.addD(S.trip.start, -1) : E.addD(S.trip.end, 1); if (dir === 'before' && d < E.TODAY) return null;
  return (
    <div className="wrap lx-ext"><button className="lx-extbtn" onClick={() => dispatch('extend', { dir })}>
      <Ic n="plus" s={16} w={2.4} /> {dir === 'before' ? L('Add a day before', 'एक दिन पहले जोड़ें') : L('Add a day after', 'एक दिन बाद जोड़ें')} · <b>{E.fD(d)}</b>
      <small>{dir === 'before' ? L('Arrive a day earlier; your hotel and airport pickup move with it', 'एक दिन पहले पहुँचें; होटल और एयरपोर्ट पिकअप साथ में बदलते हैं') : L('Stay a day longer; your flight home and airport drop move with it', 'एक दिन ज़्यादा रुकें; वापसी उड़ान और एयरपोर्ट ड्रॉप साथ में बदलते हैं')}</small>
    </button></div>
  );
}

/* ---------- under a stay: change hotel, or compare a few others for the same nights (with the real change to the trip total) ---------- */
export function StayCompare({ E, it, zone }: { E: Engine; it: any; zone: string }) {
  const router = useRouter(); const { S } = E; const L = lang(E);
  const change = <button className="lx-chip sm" onClick={() => router.push(`/stays?zone=${zone}&date=${it.date}`)}><Ic n="search" s={13} /> {L('Change hotel', 'होटल बदलें')}</button>;
  if (S.swapUid !== it.uid) return <>{change}<button className="lx-chip sm" aria-expanded="false" onClick={() => dispatch('swapopen', { uid: it.uid })}><Ic n="swap" s={13} /> {L('Quick compare', 'तुरंत तुलना')}</button></>;
  const alts: any[] = E.stayAlts(it);
  return (
    <div className="lx-dt-panel"><b>{L(`Other stays on ${E.ZN[E.HOT[it.ref].z].name} for these ${it.nights} night${it.nights > 1 ? 's' : ''}`, `इन ${it.nights} रातों के लिए ${E.ZN[E.HOT[it.ref].z].name} पर दूसरे होटल`)}</b>
      <div className="lx-vopts">{alts.map((x) => (
        <button key={x.h.id} className="lx-vopt" onClick={() => dispatch('swapstay', { uid: it.uid, id: x.h.id })}>
          <b>{x.h.n}</b><small>{x.why} · {x.h.t || ''}{x.h.rt ? ` · ★ ${x.h.rt} Google${x.h.rv ? ' (' + x.h.rv.toLocaleString('en-IN') + ')' : ''}` : ''}</small>
          <span>{x.d == null ? E.sgn(x.ds) : x.d === 0 ? L('same trip total', 'कुल राशि वही') : E.sgn(x.d) + L(' trip total', ' कुल राशि')}</span>
          {x.d != null && Math.abs(x.d - x.ds) >= 10 && <small>{L('stay', 'होटल')} {E.sgn(x.ds)}, {L('transfers and GST', 'सवारी और GST')} {E.sgn(x.d - x.ds)}</small>}
        </button>
      ))}</div>
      <p className="note">{L('Cabs to and from the jetty and your activities follow the new hotel automatically.', 'जेट्टी और घूमने की जगहों की कैब अपने आप नए होटल के हिसाब से बदल जाती हैं।')}</p>
      <button className="lx-chip sm" onClick={() => dispatch('swapopen')}>{L('Close', 'बंद करें')}</button>
    </div>
  );
}

/* ---------- after you add something: what goes well with it, at a time that fits ---------- */
export function PairRail({ E, e }: { E: Engine; e: any }) {
  const router = useRouter(); const it = e.it; const a = E.ACT[it.ref]; const L = lang(E);
  const out: any[] = E.pairPicks(e); if (!a || !out.length) return null;
  return (
    <div className="lx-pair atp-pair">
      <div className="atp-pair-h"><b><TideIcon n="spark" s={16} />Goes well with {E.shortName(a)}</b><button type="button" className="atp-btn is-text" aria-label="Hide" onClick={() => dispatch('pairx')}>Hide</button></div>
      <div className="atp-rail3">{out.map(({ x, s, why }) => { const u = E.actUnit(x, it.date); return (
        <div key={x.id} className="atp-idea">
          <button type="button" className="atp-idea-ph" aria-label={`Details: ${x.n}`} onClick={() => router.push(`/things-to-do/${x.id.toLowerCase()}?date=${it.date}`)}><Art z={x.z} seed={x.id} /><span className="atp-pk-tag">{why}</span></button>
          <div className="atp-idea-b"><b>{x.n}</b><small>{x.v || ''}</small><small className="atp-mono">{s} · {E.durOf(x)}</small>
            <div className="atp-idea-f"><span className="atp-bc-p"><b>{x.entry ? (u ? E.inr(u) : 'Free') : E.inr(u)}</b>{x.b === 'per_pax' ? <small>a person</small> : null}</span>
              <button type="button" className="atp-btn is-outline" onClick={() => dispatch('fx', { act: 'quickadd', kind: 'act', ref: x.id, date: it.date, t: s })}><TideIcon n="plus" s={16} />Add</button></div></div>
        </div>
      ); })}</div>
    </div>
  );
}
