'use client';
/* Bottom sheets in React: dates & travellers & flights, price breakdown, fix menu, fix report, help.
   They read the trip from the engine and call its functions; nothing here is HTML text any more. */
import { useEffect, useState, type ReactNode } from 'react';
import { commit, dispatch, useEngine, type Engine } from '@/engine/client';
import { Ic, Raw } from '../ui';

export function close(E: Engine) { E.S.sheet = null; commit(); }

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet wrap" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="form">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- dates, travellers and flights ---------------- */
export function DatesSheet({ E }: { E: Engine }) {
  const { S, D } = E;
  const w = S.win || (S.trip ? { start: S.trip.start, end: S.trip.end } : { start: E.SAMPLE0, end: E.addD(E.SAMPLE0, 5) });
  const n0 = Math.max(1, Math.round((E.pDate(w.end) - E.pDate(w.start)) / 864e5));
  const [start, setStart] = useState<string>(w.start);
  const [nights, setNights] = useState<number>(n0);
  const [adults, setAdults] = useState<number>(S.pax.adults);
  const [kids, setKids] = useState<number>(S.pax.kids);
  const [infants, setInfants] = useState<number>(S.pax.infants);
  const [ages, setAges] = useState<number[]>(() => { const A = E.kidAges(); return Array.from({ length: 12 }, (_, i) => A[i] ?? 8); });
  const [sen, setSen] = useState<boolean>(!!S.pax.sen);
  const [fin, setFin] = useState<string>(S.fin ? S.fin.no : '');
  const [fout, setFout] = useState<string>(S.fout ? S.fout.no : '');
  const end = E.addD(start, nights);
  const arr = D.flights.filter((f: any) => f.dir === 'Arrival'), dep = D.flights.filter((f: any) => f.dir === 'Departure');
  const N = (v: number) => Math.max(1, Math.min(20, v));

  const save = () => {
    if (!start) { E.toast('Pick the day you land'); return; }
    const before = E.pax();
    const pkP = S.pkg && S.cart.length && E.pkgSig() === S.pkg.sig ? E.PKGS.find((x: any) => x.id === S.pkg.id) : null; // an untouched ready-made trip is rebuilt around the new dates
    if (S.win && S.win.start !== start && S.cart.length && !pkP) {
      const delta = Math.round((E.pDate(start) - E.pDate(S.win.start)) / 864e5);
      S.cart.forEach((i: any) => { i.date = E.addD(i.date, delta); });
      setTimeout(() => E.toast(`Moved your whole plan by ${delta > 0 ? '+' : ''}${delta} day${Math.abs(delta) === 1 ? '' : 's'}`), 80);
    }
    S.win = { start, end }; S.datesAssumed = false;
    S.pax = { adults, kids, infants, ages: ages.slice(0, kids), sen };
    if (E.pax() !== before) {
      let n = 0; S.cart.filter((i: any) => i.kind === 'ferry' && !i.own).forEach((i: any) => { i.seats = E.autoSeats({ sid: i.ref, cls: i.cls, date: i.date }); n++; });
      S.cart.filter((i: any) => i.kind === 'act').forEach((i: any) => { delete i.pa; delete i.pk; });
      if (n) setTimeout(() => E.toast(`Ferry seats updated for ${E.pax()} travellers`), 50);
    }
    S.fin = fin ? { no: fin, date: start } : null; S.fout = fout ? { no: fout, date: end } : null;
    if (!S.planDate || S.planDate < start || S.planDate > end) S.planDate = start;
    if (pkP && nights >= pkP.nights) {
      S.undo = JSON.parse(JSON.stringify(S.cart)); S.cart = []; S.seq = 1; S.dismissed = {}; E.buildPkg(pkP, start); S.sheet = null; E.syncTrip(); commit();
      E.toastUndo(fin || fout ? 'Plan fitted to your flights' : 'Plan moved to your dates'); return;
    }
    S.sheet = null; E.syncTrip(); commit(); E.toast('Dates saved');
  };

  const Step = ({ label, v, set, min }: { label: string; v: number; set: (n: number) => void; min: number }) => (
    <div className="field"><label>{label}</label><div className="stepper">
      <button onClick={() => set(Math.max(min, v - 1))} aria-label={`Fewer ${label}`}>−</button><span>{v}</span><button onClick={() => set(Math.min(12, v + 1))} aria-label={`More ${label}`}>+</button>
    </div></div>
  );

  return (
    <Sheet label="Trip dates" onClose={() => close(E)}>
      <h2>Trip dates</h2>
      <p className="note" style={{ marginTop: -6 }}>Pick the day you land, then how many nights. Changing dates keeps your items; we re-check every timing.</p>
      <div className="two">
        <div className="field"><label htmlFor="ds">Arrival day</label><input id="ds" type="date" value={start} min={E.TODAY} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="field"><label>Nights</label><div className="stepper"><button onClick={() => setNights(N(nights - 1))} aria-label="One night less">−</button><span>{nights}</span><button onClick={() => setNights(N(nights + 1))} aria-label="One more night">+</button></div></div>
      </div>
      <div className="lx-nchips">{[3, 4, 5, 6, 7, 9].map((n) => <button key={n} className={`chip sm${n === nights ? ' on' : ''}`} aria-pressed={n === nights} onClick={() => setNights(n)}>{n}N / {n + 1}D</button>)}</div>
      <p className="lx-leave"><Ic n="plane" s={14} /> Fly home <b>{E.fD(end)}</b> · {nights} night{nights > 1 ? 's' : ''}, {nights + 1} days</p>
      <div className="three"><Step label="Adults" v={adults} set={setAdults} min={1} /><Step label="Children" v={kids} set={setKids} min={0} /><Step label="Infants" v={infants} set={setInfants} min={0} /></div>
      {kids > 0 && (
        <div className="ages"><div className="field"><label>Children’s ages</label><div className="opts">
          {Array.from({ length: kids }, (_, i) => (
            <select key={i} className="agesel" aria-label={`Age of child ${i + 1}`} value={ages[i]} onChange={(e) => { const a = ages.slice(); a[i] = +e.target.value; setAges(a); }}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((y) => <option key={y} value={y}>{y} yrs</option>)}
            </select>
          ))}
        </div></div></div>
      )}
      <label className="ownrow" style={{ cursor: 'pointer' }}>
        <span style={{ flex: 1, textAlign: 'left' }}><b>Someone in the group is 60+</b><small>We’ll suggest easier-paced things and skip adventure sports</small></span>
        <input type="checkbox" checked={sen} onChange={(e) => setSen(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
      </label>
      <p className="note" style={{ marginTop: -4 }}>Children are 2–11 years; their ages decide which activities they can join. Infants under 2 travel free on ferries.</p>
      <div className="field"><label htmlFor="fi">Flight in (optional)</label>
        <select id="fi" value={fin} onChange={(e) => setFin(e.target.value)}><option value="">I’ll add it later</option>{arr.map((f: any) => <option key={f.no} value={f.no}>{f.no} · {f.fr.split(' (')[0]} → lands {f.arr}</option>)}</select></div>
      <div className="field"><label htmlFor="fo">Flight out (optional)</label>
        <select id="fo" value={fout} onChange={(e) => setFout(e.target.value)}><option value="">I’ll add it later</option>{dep.map((f: any) => <option key={f.no} value={f.no}>{f.no} · {f.dep} to {f.to.split(' (')[0]}</option>)}</select></div>
      <p className="note">Flights help us check dive-before-flying rules and ferry connections.</p>
      <button className="btn primary block" onClick={save}>Save</button>
      {!(S.win && !S.datesAssumed) && <button className="btn ghost block" onClick={() => { S.datesSkipped = true; close(E); E.toast('No problem. Plan away, we will remind you later.'); }}>Skip for now</button>}
    </Sheet>
  );
}

/* ---------------- price breakdown ---------------- */
export function BreakdownSheet({ E }: { E: Engine }) {
  const { S } = E;
  const t = (it: any) => (it.kind === 'stay' ? E.hm(E.CHECKIN) : it.kind === 'ferry' ? E.SAIL[it.ref].dep : it.t || '');
  const days: string[] = [...new Set<string>(S.cart.map((i: any) => i.date))].sort();
  return (
    <Sheet label="Price breakdown" onClose={() => close(E)}>
      <h2>Price breakdown</h2>
      <div className="split">
        {days.map((d) => {
          const its = S.cart.filter((i: any) => i.date === d).sort((a: any, b: any) => t(a).localeCompare(t(b)));
          const sub = its.reduce((s: number, i: any) => s + (E.info(i).price || 0), 0);
          return (
            <div key={d} style={{ display: 'contents' }}>
              <span className="dayrow">{E.fD(d)}</span><span className="v dayrow">{E.inr(sub)}</span>
              {its.map((i: any) => { const I = E.info(i); return (
                <div key={i.uid} style={{ display: 'contents' }}>
                  <span>{I.title}<small className="faint" style={{ display: 'block' }}>{I.own ? 'Booked elsewhere' : I.perTxt ? I.perTxt : I.per > 1 ? `${I.per} × ${E.inr(I.unit)}` : I.sub}</small><Raw html={E.bkTag(i) || ''} style={{ display: 'contents' }} /></span>
                  <span className="v">{I.own ? '—' : I.price == null ? 'On request' : E.inr(I.price)}</span>
                </div>
              ); })}
            </div>
          );
        })}
        <span className="hr" /><span>Subtotal</span><span className="v">{E.inr(E.subtotal())}</span><span>GST</span><span className="v">{E.inr(E.gstTotal())}</span>
        <span className="hr" /><span><b>Total</b></span><span className="v" style={{ fontSize: 18 }}>{E.inr(E.total())}</span>
        {E.onReq() > 0 && <span className="sub">{E.onReq()} item(s) priced on request are confirmed before you pay for them.</span>}
      </div>
      <button className="btn ghost block" onClick={() => close(E)}>Done</button>
    </Sheet>
  );
}

/* ---------------- things that do not fit: fix for me, or show me ---------------- */
export function FixMenuSheet({ E }: { E: Engine }) {
  const R = E.run(E.S.cart);
  return (
    <Sheet label="Fix issues" onClose={() => close(E)}>
      <h2>{R.hard} thing{R.hard > 1 ? 's' : ''} won’t work as planned</h2>
      <p className="note" style={{ marginTop: -6 }}>We can rearrange your trip using island timing rules: move times, switch to a ferry that fits, or add the missing ferry, cab or boat. You’ll see every change and can undo it.</p>
      <button className="btn primary block" onClick={() => dispatch('autofix')}><Ic n="check" s={18} w={2.4} /> Fix it for me</button>
      <button className="btn ghost block" onClick={() => dispatch('firstissue')}>I’ll fix them myself</button>
    </Sheet>
  );
}

export function AutoFixSheet({ E }: { E: Engine }) {
  const L: any[] = E.S.autoLog || []; const R = E.run(E.S.cart);
  return (
    <Sheet label="Fixes" onClose={() => close(E)}>
      <h2>{L.length ? `We changed ${L.length} thing${L.length > 1 ? 's' : ''}` : 'This one needs your choice'}</h2>
      <p className="note" style={{ marginTop: -6 }}>{R.hard ? `${R.hard} still need${R.hard > 1 ? '' : 's'} you to pick. They’re marked in red.` : 'Every timing works now.'}</p>
      {L.length > 0 && <div className="menu">{L.map((l, i) => <div key={i} className="fixlog"><Ic n={l.icon || 'check'} s={18} /><div><b>{l.t}</b>{l.s && <small>{l.s}</small>}</div></div>)}</div>}
      <div className="two">
        {L.length > 0 && <button className="btn ghost" onClick={() => dispatch('autofixundo')}>Undo</button>}
        <button className="btn primary" onClick={() => (R.hard ? dispatch('firstissue') : close(E))}>{R.hard ? 'Show me' : 'Done'}</button>
      </div>
    </Sheet>
  );
}

/* ---------------- help ---------------- */
export function HelpSheet({ E }: { E: Engine }) {
  const num = process.env.NEXT_PUBLIC_WHATSAPP || '+91 00000 00000';
  return (
    <Sheet label="Help" onClose={() => close(E)}>
      <h2>Talk to us on WhatsApp</h2>
      <p className="note">A local team member replies in Hindi, English, Bengali or Tamil, 7 am to 10 pm.</p>
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center' }}><b className="mono" style={{ flex: 1, fontSize: 17, userSelect: 'all' }}>{num}</b>
        <button className="btn sm quiet" onClick={() => { navigator.clipboard?.writeText(num); E.toast('Number copied'); }}>Copy</button></div>
      <a className="btn primary block" href={`https://wa.me/${num.replace(/\D/g, '')}`} target="_blank" rel="noopener">Open WhatsApp</a>
      <button className="btn ghost block" onClick={() => close(E)}>Done</button>
    </Sheet>
  );
}

/** Which sheets are React now. The rest still come from the engine until they are ported. */
export const REACT_SHEETS: Record<string, (p: { E: Engine }) => ReactNode> = {
  dates: DatesSheet, breakdown: BreakdownSheet, fixmenu: FixMenuSheet, autofix: AutoFixSheet, help: HelpSheet,
};

export function useEngineSheet() { return useEngine(); }
