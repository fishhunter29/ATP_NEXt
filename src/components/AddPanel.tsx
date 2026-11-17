'use client';
/* Pick a day (and time, room or class) and add it to the trip. Prices and "does it fit" come from the trip engine. */
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { commit, useEngine } from '@/engine/client';
import { Ic } from './ui';

type Kind = 'act' | 'stay' | 'ferry' | 'cab' | 'rent';

export default function AddPanel({ kind, id, uid }: { kind: Kind; id: string; uid?: string }) {
  const E = useEngine();
  const router = useRouter();
  const params = useSearchParams();
  const [cfg, setCfg] = useState<any>(null);
  const days = useMemo(() => {
    if (!E) return [] as string[];
    const { S } = E; const out: string[] = [];
    if (S.trip && S.cart.length) for (let n = 0; n < E.nDays(); n++) out.push(E.addD(S.trip.start, n));
    else { const b = E.baseDate(); for (let n = 0; n < 10; n++) out.push(E.addD(b, n)); }
    return out;
  }, [E, E?.S.cart.length]);
  if (!E) return <div className="card" style={{ minHeight: 160 }} aria-busy="true" />;

  const date0 = params.get('date') || undefined;
  const editing = uid ? E.S.cart.find((x: any) => x.uid === uid) : null;
  const c = cfg || (editing ? JSON.parse(JSON.stringify(editing)) : initial(E, kind, id, date0));
  const update = (o: any) => setCfg({ ...c, ...o });
  let I: any = null; try { I = E.info(c); } catch {}
  const fit = E.S.cart.length && E.fitOf ? safe(() => E.fitOf(c)) : null;

  const save = () => {
    if (!editing) return;
    Object.assign(editing, c);
    if (kind === 'ferry' && !editing.own) editing.seats = E.autoSeats({ sid: editing.ref, cls: editing.cls, date: editing.date });
    E.S.flashUid = editing.uid; E.syncTrip(); commit(); E.toast('Changes saved'); router.push('/trip');
  };
  const remove = () => { if (!editing) return; E.removeItem(editing.uid); commit(); E.toast('Removed from your trip'); router.push('/trip'); };
  const add = () => {
    const it = { ...c };
    if (kind === 'ferry') {
      /* same as the engine's addFerry: seats, the cab from the jetty, trim stays that no longer fit, then "what next?" */
      const s = E.SAIL[it.ref];
      it.seats = it.own ? [] : E.autoSeats({ sid: it.ref, cls: it.cls, date: it.date });
      const f = E.addItem(it, true);
      if (!it.own) { const L = E.jettyLegs(s, it.date); if (L.post) E.addItem({ kind: 'cab', ref: L.post.r.id, date: it.date, t: s.arr, for: f.uid, leg: 'post', ...(L.post.rev ? { rev: true } : {}) }, true); }
      const tr: string[] = E.trimStays() || [];
      E.S.lastFerry = f.uid; E.S.sheet = 'ferryadded'; E.syncTrip(); commit();
      if (tr.length) E.toast(`Adjusted to match your ferry: ${tr.join('; ')}`);
      return;
    }
    E.addItem(it, true);
    const day = E.S.trip ? E.dayIdx(it.date) + 1 : 1;
    commit();
    E.toast(`Added to Day ${day}`);
    router.push('/trip');
  };

  return (
    <div className="card addpanel">
      <h3 style={{ fontSize: 18 }}>{editing ? 'Change this booking' : 'Add to your trip'}</h3>
      <div className="eyebrow">Day</div>
      <div className="daypick" role="radiogroup" aria-label="Day">
        {days.map((d) => { const p = E.pDate(d); return (
          <button key={d} className="dp" aria-pressed={c.date === d} onClick={() => update({ date: d, ...(kind === 'ferry' ? {} : {}) })}>
            <small>{E.DOW[p.getUTCDay()]}</small><b>{p.getUTCDate()}</b><small>{E.MON[p.getUTCMonth()]}</small>
          </button>
        ); })}
      </div>
      {kind === 'act' && <Slots E={E} c={c} update={update} />}
      {kind === 'stay' && <StayOpts E={E} c={c} update={update} />}
      {kind === 'ferry' && <FerryOpts E={E} c={c} update={update} />}
      {(kind === 'cab') && <CabOpts E={E} c={c} update={update} />}
      {fit && fit.state === 'bad' && <p className="note" style={{ color: 'var(--bad)' }}><Ic n="alert" s={14} /> {fit.msg || 'This clashes with something on that day. Try another time or day.'}</p>}
      <div className="addpanel-f">
        <span className="price"><b>{I && I.price != null ? E.inr(I.price) : 'On request'}</b>{I && I.perTxt && <small>{I.perTxt}</small>}</span>
        {editing ? (
          <span style={{ display: 'flex', gap: 8 }}><button className="btn ghost" onClick={remove}>Remove</button><button className="btn primary" onClick={save}>Save changes</button></span>
        ) : <button className="btn primary" onClick={add}><Ic n="plus" s={18} w={2.6} /> Add to trip</button>}
      </div>
    </div>
  );
}

function safe<T>(f: () => T): T | null { try { return f(); } catch { return null; } }

function initial(E: any, kind: Kind, id: string, date?: string) {
  if (kind === 'ferry') {
    const s = E.SAIL[id]; const cls = (s.fares && s.fares[0] && s.fares[0].n) || String(s.cls || '').split(',')[0].trim();
    return { kind: 'ferry', ref: id, date: date || E.baseDate(), cls };
  }
  return E.initCfg(kind, id, date);
}

function Slots({ E, c, update }: any) {
  const a = E.ACT[c.ref]; const sl: string[] = E.slotsFor(a);
  if (sl.length < 2) return null;
  return (
    <>
      <div className="eyebrow">Time</div>
      <div className="chips">
        {sl.map((s) => { const n = safe(() => E.availability({ kind: 'act', ref: c.ref, date: c.date, t: s })); return (
          <button key={s} className="chip" aria-pressed={c.t === s} disabled={n === 0} onClick={() => update({ t: s })}>{s}{n === 0 && <small className="sf"> Sold out</small>}</button>
        ); })}
      </div>
    </>
  );
}

function StayOpts({ E, c, update }: any) {
  const h = E.HOT[c.ref];
  return (
    <>
      <div className="eyebrow">Room</div>
      <div className="chips">{h.rooms.map((r: any) => <button key={r.n} className="chip" aria-pressed={c.room === r.n} onClick={() => update({ room: r.n })}>{r.n}</button>)}</div>
      <div className="eyebrow">Nights</div>
      <div className="chips">{[1, 2, 3, 4, 5].map((n) => <button key={n} className="chip" aria-pressed={c.nights === n} onClick={() => update({ nights: n })}>{n}</button>)}</div>
      <div className="eyebrow">Rooms</div>
      <div className="chips">{[1, 2, 3, 4].map((n) => <button key={n} className="chip" aria-pressed={c.qty === n} onClick={() => update({ qty: n })}>{n}</button>)}</div>
    </>
  );
}

function FerryOpts({ E, c, update }: any) {
  const s = E.SAIL[c.ref]; const fares: any[] = s.fares && s.fares.length ? s.fares : String(s.cls || '').split(',').map((n: string) => ({ n: n.trim(), f: s.fare }));
  return (
    <>
      <div className="eyebrow">Class</div>
      <div className="chips">{fares.map((f) => <button key={f.n} className="chip" aria-pressed={c.cls === f.n} onClick={() => update({ cls: f.n })}>{f.n} · {E.inr(f.f)}</button>)}</div>
    </>
  );
}

function CabOpts({ E, c, update }: any) {
  const r = E.ROUTE[c.ref];
  return (
    <>
      <div className="eyebrow">Car</div>
      <div className="chips">{r.prices.map((p: any) => <button key={p.c} className="chip" aria-pressed={c.vc === p.c} onClick={() => update({ vc: p.c })}>{p.c} · {p.seats} seats</button>)}</div>
      <div className="eyebrow">Pickup</div>
      <div className="chips">{['07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00'].map((t) => <button key={t} className="chip" aria-pressed={c.t === t} onClick={() => update({ t })}>{t}</button>)}</div>
      {r.prices.some((p: any) => p.ret) && <div className="chips"><button className="chip" aria-pressed={!!c.ret} onClick={() => update({ ret: !c.ret })}>Return trip with waiting</button></div>}
    </>
  );
}
