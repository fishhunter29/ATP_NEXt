'use client';
/* Bottom sheets in React: dates & travellers & flights, price breakdown, fix menu, fix report, help, move & swap,
   ferry added, day plans and the planned-trip loader.
   They read the trip from the engine and call its functions; nothing here is HTML text any more. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { commit, dispatch, lang, useEngine, type Engine } from '@/engine/client';
import { Ic, Raw } from '../ui';
import { TideIcon } from '../Brand';
import { COMPANY } from '@/lib/company';
import { waLink, waText } from '@/lib/whatsapp';
import { tripLines } from '../AskWhatsApp';

export function close(E: Engine) { E.S.sheet = null; commit(); }

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  /* Escape closes; the page behind does not scroll; focus goes into the sheet and back to where it was */
  useEffect(() => {
    const from = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; box.current?.focus({ preventScroll: true });
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; if (from && document.contains(from)) from.focus({ preventScroll: true }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet wrap" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={box}>
        <button type="button" className="atp-iconbtn atp-sheet-x" aria-label="Close" onClick={onClose}><TideIcon n="x" /></button>
        <div className="form">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- dates, travellers and flights ---------------- */
export function DatesSheet({ E }: { E: Engine }) {
  const tr = lang(E);
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
    if (!start) { E.toast(tr('Pick the day you land', 'पहुँचने का दिन चुनें')); return; }
    const before = E.pax();
    const pkP = S.pkg && S.cart.length && E.pkgSig() === S.pkg.sig ? E.PKGS.find((x: any) => x.id === S.pkg.id) : null; // an untouched ready-made trip is rebuilt around the new dates
    if (S.win && S.win.start !== start && S.cart.length && !pkP) {
      const delta = Math.round((E.pDate(start) - E.pDate(S.win.start)) / 864e5);
      S.cart.forEach((i: any) => { i.date = E.addD(i.date, delta); });
      setTimeout(() => E.toast(tr(`Moved your whole plan by ${delta > 0 ? '+' : ''}${delta} day${Math.abs(delta) === 1 ? '' : 's'}`, `पूरी योजना ${delta > 0 ? '+' : ''}${delta} दिन खिसकाई गई`)), 80);
    }
    S.win = { start, end }; S.datesAssumed = false;
    S.pax = { adults, kids, infants, ages: ages.slice(0, kids), sen };
    if (E.pax() !== before) {
      /* no seat numbers are kept: our team asks for seats when it books each ferry */
      S.cart.filter((i: any) => i.kind === 'ferry').forEach((i: any) => { i.seats = []; });
      S.cart.filter((i: any) => i.kind === 'act').forEach((i: any) => { delete i.pa; delete i.pk; });
    }
    S.fin = fin ? { no: fin, date: start } : null; S.fout = fout ? { no: fout, date: end } : null;
    if (!S.planDate || S.planDate < start || S.planDate > end) S.planDate = start;
    if (pkP && nights >= pkP.nights) {
      S.undo = JSON.parse(JSON.stringify(S.cart)); S.cart = []; S.seq = 1; S.dismissed = {}; E.buildPkg(pkP, start); S.sheet = null; E.syncTrip(); commit();
      E.toastUndo(fin || fout ? tr('Plan fitted to your flights', 'योजना आपकी उड़ानों के हिसाब से बनी') : tr('Plan moved to your dates', 'योजना आपकी तारीखों पर ले जाई गई')); return;
    }
    S.sheet = null; E.syncTrip(); commit(); E.toast(tr('Dates saved', 'तारीखें सेव हो गईं'));
  };

  const Step = ({ label, v, set, min }: { label: string; v: number; set: (n: number) => void; min: number }) => (
    <div className="field"><label>{label}</label><div className="stepper">
      <button onClick={() => set(Math.max(min, v - 1))} aria-label={`${tr('Fewer', 'कम')} ${label}`}>−</button><span>{v}</span><button onClick={() => set(Math.min(12, v + 1))} aria-label={`${tr('More', 'ज़्यादा')} ${label}`}>+</button>
    </div></div>
  );

  return (
    <Sheet label={tr('Trip dates', 'यात्रा की तारीखें')} onClose={() => close(E)}>
      <h2>{tr('Trip dates', 'यात्रा की तारीखें')}</h2>
      <p className="note" style={{ marginTop: -6 }}>{tr('Pick the day you land, then how many nights. Changing dates keeps your items; we re-check every timing.', 'पहुँचने का दिन चुनें, फिर कितनी रातें। तारीखें बदलने पर आपकी चीज़ें रहती हैं; हम हर समय दोबारा जाँचते हैं।')}</p>
      <div className="two">
        <div className="field"><label htmlFor="ds">{tr('Arrival day', 'पहुँचने का दिन')}</label><input id="ds" type="date" value={start} min={E.TODAY} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="field"><label>{tr('Nights', 'रातें')}</label><div className="stepper"><button onClick={() => setNights(N(nights - 1))} aria-label={tr('One night less', 'एक रात कम')}>−</button><span>{nights}</span><button onClick={() => setNights(N(nights + 1))} aria-label={tr('One more night', 'एक रात ज़्यादा')}>+</button></div></div>
      </div>
      <div className="lx-nchips">{[3, 4, 5, 6, 7, 9].map((n) => <button key={n} className={`chip sm${n === nights ? ' on' : ''}`} aria-pressed={n === nights} onClick={() => setNights(n)}>{tr(`${n}N / ${n + 1}D`, `${n} रात / ${n + 1} दिन`)}</button>)}</div>
      <p className="lx-leave"><Ic n="plane" s={14} /> {tr('Fly home', 'वापसी')} <b>{E.fD(end)}</b> · {tr(`${nights} night${nights > 1 ? 's' : ''}, ${nights + 1} days`, `${nights} रातें, ${nights + 1} दिन`)}</p>
      <div className="three"><Step label={tr('Adults', 'वयस्क')} v={adults} set={setAdults} min={1} /><Step label={tr('Children', 'बच्चे')} v={kids} set={setKids} min={0} /><Step label={tr('Infants', 'शिशु')} v={infants} set={setInfants} min={0} /></div>
      {kids > 0 && (
        <div className="ages"><div className="field"><label>{tr('Children’s ages', 'बच्चों की उम्र')}</label><div className="opts">
          {Array.from({ length: kids }, (_, i) => (
            <select key={i} className="agesel" aria-label={tr(`Age of child ${i + 1}`, `बच्चे ${i + 1} की उम्र`)} value={ages[i]} onChange={(e) => { const a = ages.slice(); a[i] = +e.target.value; setAges(a); }}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((y) => <option key={y} value={y}>{y} {tr('yrs', 'साल')}</option>)}
            </select>
          ))}
        </div></div></div>
      )}
      <label className="ownrow" style={{ cursor: 'pointer' }}>
        <span style={{ flex: 1, textAlign: 'left' }}><b>{tr('Someone in the group is 60+', 'समूह में कोई 60+ है')}</b><small>{tr('We’ll suggest easier-paced things and skip adventure sports', 'हम आराम वाली चीज़ें सुझाएँगे और एडवेंचर स्पोर्ट्स छोड़ देंगे')}</small></span>
        <input type="checkbox" checked={sen} onChange={(e) => setSen(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
      </label>
      <p className="note" style={{ marginTop: -4 }}>{tr('Children are 2–11 years; their ages decide which activities they can join. Infants under 2 travel free on ferries.', 'बच्चे 2–11 साल के; उनकी उम्र से तय होता है कि वे किन एक्टिविटी में जा सकते हैं। 2 साल से छोटे शिशु फ़ेरी पर मुफ़्त।')}</p>
      <div className="field"><label htmlFor="fi">{tr('Flight in (optional)', 'आने की उड़ान (ज़रूरी नहीं)')}</label>
        <select id="fi" value={fin} onChange={(e) => setFin(e.target.value)}><option value="">{tr('I’ll add it later', 'बाद में जोड़ूँगा')}</option>{arr.map((f: any) => <option key={f.no} value={f.no}>{f.no} · {f.fr.split(' (')[0]} → {tr('lands', 'पहुँचे')} {f.arr}</option>)}</select></div>
      <div className="field"><label htmlFor="fo">{tr('Flight out (optional)', 'जाने की उड़ान (ज़रूरी नहीं)')}</label>
        <select id="fo" value={fout} onChange={(e) => setFout(e.target.value)}><option value="">{tr('I’ll add it later', 'बाद में जोड़ूँगा')}</option>{dep.map((f: any) => <option key={f.no} value={f.no}>{f.no} · {f.dep} → {f.to.split(' (')[0]}</option>)}</select></div>
      <p className="note">{tr('Flights help us check dive-before-flying rules and ferry connections.', 'उड़ानों से हम उड़ान-से-पहले-डाइव के नियम और फ़ेरी कनेक्शन जाँचते हैं।')}</p>
      <button className="btn primary block" onClick={save}>{tr('Save', 'सेव करें')}</button>
      {!(S.win && !S.datesAssumed) && <button className="btn ghost block" onClick={() => { S.datesSkipped = true; close(E); E.toast(tr('No problem. Plan away, we will remind you later.', 'कोई बात नहीं। योजना बनाइए, हम बाद में याद दिलाएँगे।')); }}>{tr('Skip for now', 'अभी छोड़ें')}</button>}
    </Sheet>
  );
}

/* ---------------- price breakdown ---------------- */
export function BreakdownSheet({ E }: { E: Engine }) {
  const tr = lang(E);
  const { S } = E;
  const t = (it: any) => (it.kind === 'stay' ? E.hm(E.CHECKIN) : it.kind === 'ferry' ? E.SAIL[it.ref].dep : it.t || '');
  const days: string[] = [...new Set<string>(S.cart.map((i: any) => i.date))].sort();
  return (
    <Sheet label={tr('Price breakdown', 'कीमत का ब्योरा')} onClose={() => close(E)}>
      <h2>{tr('Price breakdown', 'कीमत का ब्योरा')}</h2>
      <div className="split">
        {days.map((d) => {
          const its = S.cart.filter((i: any) => i.date === d).sort((a: any, b: any) => t(a).localeCompare(t(b)));
          const sub = its.reduce((s: number, i: any) => s + (E.info(i).price || 0), 0);
          return (
            <div key={d} style={{ display: 'contents' }}>
              <span className="dayrow">{E.fD(d)}</span><span className="v dayrow">{E.inr(sub)}</span>
              {its.map((i: any) => { const I = E.info(i); return (
                <div key={i.uid} style={{ display: 'contents' }}>
                  <span>{I.title}<small className="faint" style={{ display: 'block' }}>{I.own ? tr('Booked elsewhere', 'कहीं और बुक') : I.perTxt ? I.perTxt : I.per > 1 ? `${I.per} × ${E.inr(I.unit)}` : I.sub}</small><Raw html={E.bkTag(i) || ''} style={{ display: 'contents' }} /></span>
                  <span className="v">{I.own ? '—' : I.price == null ? E.t('onReq') : E.inr(I.price)}</span>
                </div>
              ); })}
            </div>
          );
        })}
        <span className="hr" /><span>{tr('Subtotal', 'उप-योग')}</span><span className="v">{E.inr(E.subtotal())}</span>{E.fee() > 0 && <><span>Convenience fee<span className="sub" style={{ display: 'block' }}>We manage everything on the ground for you: bookings, timings and help through the trip.</span></span><span className="v">{E.inr(E.fee())}</span></>}<span>GST</span><span className="v">{E.inr(E.gstTotal() + E.feeGst())}</span>
        <span className="hr" /><span><b>{tr('Total', 'कुल')}</b></span><span className="v" style={{ fontSize: 18 }}>{E.inr(E.total())}</span>
        {E.onReq() > 0 && <span className="sub">{tr(`${E.onReq()} item(s) priced on request are confirmed before you pay for them.`, `अनुरोध पर कीमत वाली ${E.onReq()} चीज़ें भुगतान से पहले पक्की की जाती हैं।`)}</span>}
      </div>
      <button className="btn ghost block" onClick={() => close(E)}>{tr('Done', 'हो गया')}</button>
    </Sheet>
  );
}

/* ---------------- things that do not fit: fix for me, or show me ---------------- */
export function FixMenuSheet({ E }: { E: Engine }) {
  const tr = lang(E);
  const R = E.run(E.S.cart);
  return (
    <Sheet label={tr('Fix issues', 'समस्याएँ ठीक करें')} onClose={() => close(E)}>
      <h2>{tr(`${R.hard} thing${R.hard > 1 ? 's' : ''} won’t work as planned`, `${R.hard} चीज़ें योजना के मुताबिक नहीं चलेंगी`)}</h2>
      <p className="note" style={{ marginTop: -6 }}>{tr('We can rearrange your trip using island timing rules: move times, switch to a ferry that fits, or add the missing ferry, cab or boat. You’ll see every change and can undo it.', 'हम द्वीप के समय नियमों से आपकी यात्रा फिर से जमा सकते हैं: समय बदलना, फिट होने वाली फ़ेरी लेना, या छूटी फ़ेरी, कैब या नाव जोड़ना। हर बदलाव आपको दिखेगा और आप उसे वापस ले सकते हैं।')}</p>
      <button className="btn primary block" onClick={() => dispatch('autofix')}><Ic n="check" s={18} w={2.4} /> {tr('Fix it for me', 'मेरे लिए ठीक करें')}</button>
      <button className="btn ghost block" onClick={() => dispatch('firstissue')}>{tr('I’ll fix them myself', 'मैं खुद ठीक करूँगा')}</button>
    </Sheet>
  );
}

export function AutoFixSheet({ E }: { E: Engine }) {
  const tr = lang(E);
  const L: any[] = E.S.autoLog || []; const R = E.run(E.S.cart);
  return (
    <Sheet label={tr('Fixes', 'सुधार')} onClose={() => close(E)}>
      <h2>{L.length ? tr(`We changed ${L.length} thing${L.length > 1 ? 's' : ''}`, `हमने ${L.length} चीज़ें बदलीं`) : tr('This one needs your choice', 'इसमें आपको चुनना होगा')}</h2>
      <p className="note" style={{ marginTop: -6 }}>{R.hard ? tr(`${R.hard} still need${R.hard > 1 ? '' : 's'} you to pick. They’re marked in red.`, `${R.hard} में अभी भी आपको चुनना है। वे लाल रंग में हैं।`) : tr('Every timing works now.', 'अब हर समय ठीक बैठता है।')}</p>
      {L.length > 0 && <div className="menu">{L.map((l, i) => <div key={i} className="fixlog"><Ic n={l.icon || 'check'} s={18} /><div><b>{l.t}</b>{l.s && <small>{l.s}</small>}</div></div>)}</div>}
      <div className="two">
        {L.length > 0 && <button className="btn ghost" onClick={() => dispatch('autofixundo')}>{tr('Undo', 'वापस लें')}</button>}
        <button className="btn primary" onClick={() => (R.hard ? dispatch('firstissue') : close(E))}>{R.hard ? tr('Show me', 'दिखाएँ') : tr('Done', 'हो गया')}</button>
      </div>
    </Sheet>
  );
}

/* ---------------- help ---------------- */
export function HelpSheet({ E }: { E: Engine }) {
  const tr = lang(E);
  const num = COMPANY.whatsapp;
  return (
    <Sheet label="Help" onClose={() => close(E)}>
      <h2>Talk to us on WhatsApp</h2>
      <p className="note">A planner in Port Blair replies. Your dates and group go with the message, so you do not have to type them.</p>
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center' }}><b className="mono" style={{ flex: 1, fontSize: 17, userSelect: 'all' }}>{num}</b>
        <button className="btn sm quiet" onClick={() => { navigator.clipboard?.writeText(num); E.toast('Number copied'); }}>Copy</button></div>
      <a className="btn primary block" href={waLink(waText('I need help with my Andaman trip.', tripLines(E)))} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
      <button className="btn ghost block" onClick={() => close(E)}>{tr('Done', 'हो गया')}</button>
    </Sheet>
  );
}


/* ---------------- move or swap one plan (opened from the ⋮⋮ handle) ---------------- */
export function MoveSheet({ E }: { E: Engine }) {
  /* Moving a plan is always a choice made here, never a drag on the page: pick the day, pick the time (every time it
     can run is listed, and a time can be typed where the plan is not tied to set departures), then press Move. */
  const { S } = E; const it = S.cart.find((x: any) => x.uid === S.moveUid); const a = it && E.ACT[it.ref];
  const curT: string = it ? it.t || (a && a.t) || '' : '';
  const [day, setDay] = useState<string>(it ? it.date : '');
  const [time, setTime] = useState<string>(curT);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  const why = (d: string, t: string): string => { const f = E.fitOf(Object.assign({}, it, { date: d, t })); if (f.state !== 'bad') return ''; const h = f.hard[0]; return h ? `${h.title}${h.msg ? `: ${String(h.msg).split('.')[0]}` : ''}` : 'It clashes with another plan'; };
  /* Each day is tried at every time the plan can run, nearest to the current time first, so a day is offered whenever
     any time on it works. Worked out once for the sheet, not on every tap. */
  const sig = it && a ? `${it.uid}|${it.date}|${curT}|${S.cart.length}` : '';
  const days = useMemo<{ n: number; d: string; t: string | null }[]>(() => {
    if (!it || !a) return [];
    const cur = E.tm(curT); const c: string[] = E.slotCands(a).slice().sort((p: number, q: number) => Math.abs(p - cur) - Math.abs(q - cur)).map((m: number) => E.hm(m));
    return Array.from({ length: E.nDays() }, (_, n) => { const d = E.addD(S.trip.start, n); return { n, d, t: d === it.date ? curT : c.find((t) => !why(d, t)) || null }; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  const times = useMemo<{ t: string; bad: string }[]>(() => {
    if (!it || !a) return [];
    return E.slotCands(a).map((m: number) => E.hm(m)).map((t: string) => ({ t, bad: day === it.date && t === curT ? '' : why(day, t) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, day]);
  if (!it || !a) return null;
  const flex = !!(a.entry || !E.slotsFor(a).length || a.slot === 'Any' || a.slot === 'Open') && !a.sched;
  const pick = typed || time; const dn = E.dayIdx(day) + 1; const same = day === it.date && pick === curT;
  const short = (d: string) => { const x = E.pDate(d); return `${E.DOW[x.getUTCDay()]} ${x.getUTCDate()} ${E.MON[x.getUTCMonth()]}`; };
  const chooseDay = (x: { d: string; t: string | null }) => { setDay(x.d); setTyped(''); setErr(''); if (x.t) setTime(x.t); };
  const move = () => {
    if (!/^\d\d:\d\d$/.test(pick)) { setErr('Choose a time, or type one like 10:30.'); return; }
    if (typed) { const lo = a.open ? E.tm(a.open) : 360, hi = (a.close ? E.tm(a.close) : 1110) - (a.d || 60); const m = E.tm(typed); if (m < lo || m > hi) { setErr(`${typed} is outside its hours. It can start between ${E.hm(lo)} and ${E.hm(hi)}.`); return; } }
    const bad = same ? '' : why(day, pick); if (bad) { setErr(`${pick} on Day ${dn} does not work. ${bad}.`); return; }
    dispatch('mvto', { date: day, t: pick });
  };
  const sw: any[] = a.meal || a.sched ? [] : E.swapsFor(it);
  return (
    <Sheet label="Move or swap" onClose={() => close(E)}>
      <h2>{E.shortName(a)}</h2>
      <p className="note" style={{ marginTop: -6 }}>Now on Day {E.dayIdx(it.date) + 1}, {short(it.date)} at {curT}. Choose the day and the time, then press Move. Nothing changes until you do.</p>
      <div className="eyebrow" id="mv-day">Day</div>
      <div className="atp-mvdays" role="radiogroup" aria-labelledby="mv-day">
        {days.map((x) => <button key={x.d} type="button" className="atp-mvday" role="radio" aria-checked={day === x.d} disabled={!x.t} onClick={() => chooseDay(x)}><b>Day {x.n + 1}</b><small>{x.d === it.date ? `${short(x.d)} · now` : x.t ? short(x.d) : 'No time fits'}</small></button>)}
      </div>
      <div className="eyebrow" id="mv-time">Time on Day {dn}</div>
      <div className="atp-mvtimes" role="radiogroup" aria-labelledby="mv-time">
        {times.map(({ t, bad }) => <button key={t} type="button" className="atp-mvt" role="radio" aria-checked={!typed && time === t} disabled={!!bad} title={bad || undefined} onClick={() => { setTime(t); setTyped(''); setErr(''); }}>{t}{day === it.date && t === curT && <small>now</small>}</button>)}
      </div>
      <p className="note">{times.some((x) => x.bad) ? 'Times in grey clash with a ferry, a check-in, opening hours or another plan on that day.' : 'Every time shown works with the rest of that day.'}</p>
      {flex ? (
        <label className="atp-mvtype"><span>Or type a time</span>
          <input type="time" step={300} value={typed} onChange={(e) => { setTyped(e.target.value); setErr(''); }} aria-label="Type a time" /></label>
      ) : <p className="note">This runs at set times, so only those can be chosen.</p>}
      {err && <p className="atp-err" role="alert">{err}</p>}
      <button type="button" className="btn primary block" disabled={same} onClick={move}>{same ? 'Choose another day or time' : `Move to Day ${dn} · ${pick}`}</button>
      {sw.length > 0 && (
        <>
          <div className="eyebrow">Swap for something similar</div>
          <div className="lx-mvcol">{sw.map(({ x, t }: any) => { const u = E.actUnit(x, it.date); return (
            <button key={x.id} className="lx-sw" onClick={() => dispatch('swapact', { ref: x.id, t })}><span><b>{x.n}</b><small>{x.v || ''} · {t} · {E.durOf(x)}</small></span><span className="price">{u ? E.inr(u) : 'Free'}</span></button>
          ); })}</div>
        </>
      )}
      <div className="lx-mvrow" style={{ marginTop: 14 }}>
        <button className="btn ghost block" onClick={() => { const uid = it.uid; S.sheet = null; commit(); dispatch('edit', { uid }); }}>Open details</button>
        <button className="btn ghost block" style={{ color: 'var(--bad)' }} onClick={() => dispatch('mvdel')}>Remove</button>
      </div>
    </Sheet>
  );
}

/* ---------------- after adding a ferry: what usually comes next ---------------- */
export function FerryAddedSheet({ E }: { E: Engine }) {
  const tr = lang(E);
  const { S } = E; const it = S.cart.find((x: any) => x.uid === S.lastFerry); if (!it) return null; const s = E.SAIL[it.ref];
  const hasRet = S.cart.some((x: any) => x.kind === 'ferry' && E.SAIL[x.ref].f === s.to && E.SAIL[x.ref].to === s.f && x.date >= it.date);
  const hasStay = !!E.stayOn(S.cart, s.to, it.date, false);
  const fo = E.flightOut(); const sz = E.season(it.date);
  return (
    <Sheet label={tr('Ferry added', 'फ़ेरी जोड़ी गई')} onClose={() => close(E)}>
      <h2>{it.own ? tr('Ferry added to your trip', 'फ़ेरी आपकी यात्रा में जोड़ी गई') : tr('Ferry added', 'फ़ेरी जोड़ी गई')}</h2>
      <p className="note" style={{ marginTop: -6 }}>{E.ZN[s.f].name} → {E.ZN[s.to].name} · {E.fD(it.date)} · {s.dep}–{s.arr} · our team books it within 15 minutes of your confirmation and asks you for seats</p>
      <div className="menu">
        {!hasStay && !(s.to === 'PBL' && fo && fo.date === it.date) && <button onClick={() => dispatch('fasheet', { go: 'stay' })}><Ic n="bed" s={22} /><div><b>{tr(`Find a stay on ${E.ZN[s.to].name}`, `${E.ZN[s.to].name} पर होटल खोजें`)}</b><small>{tr(`Check-in ${E.fD(it.date)}, ${sz === 'pk' ? 'peak' : sz === 'ln' ? 'lean' : 'high'}-season prices`, `चेक-इन ${E.fD(it.date)}, ${sz === 'pk' ? 'पीक' : sz === 'ln' ? 'कम भीड़ वाले' : 'हाई'} सीज़न की कीमतें`)}</small></div></button>}
        {!hasRet && s.to !== 'PBL' && <button onClick={() => dispatch('fasheet', { go: 'ret' })}><Ic n="ferry" s={22} /><div><b>{E.t('addReturn')}</b><small>{E.ZN[s.to].name} → {E.ZN[s.f].name}</small></div></button>}
        <button onClick={() => dispatch('fasheet', { go: 'do' })}><Ic n="mask" s={22} /><div><b>{tr(`Things to do on ${E.ZN[s.to].name}`, `${E.ZN[s.to].name} पर घूमना-फिरना`)}</b><small>{tr('We check each one fits around your ferry', 'हम जाँचते हैं कि हर एक आपकी फ़ेरी के साथ फिट हो')}</small></div></button>
      </div>
      <div className="two"><button className="btn ghost" onClick={() => close(E)}>{E.t('keep')}</button><button className="btn primary" onClick={() => dispatch('fasheet', { go: 'trip' })}>{E.t('viewTrip')}</button></div>
    </Sheet>
  );
}

/* ---------------- pick a day: the trip's days (with where you are that day), then the next fortnight ---------------- */
export function DayPicker({ E, sel, onPick }: { E: Engine; sel: string; onPick: (d: string) => void }) {
  const tr = lang(E);
  const { S } = E; const set = new Set<string>();
  if (S.trip) for (let n = 0; n < E.nDays() && n < 21; n++) set.add(E.addD(S.trip.start, n));
  for (let i = -3; i <= 10; i++) { const d = E.addD(sel, i); if (d >= E.TODAY) set.add(d); }
  const days = [...set].filter((d) => d >= E.TODAY).sort();
  const inTrip = (d: string) => S.trip && S.cart.length && d >= S.trip.start && d <= S.trip.end;
  return (
    <div className="daypick" role="group" aria-label={tr('Day', 'दिन')}>
      {days.map((d) => { const dt = E.pDate(d); const z = inTrip(d) ? E.zoneAt(d) : null; return (
        <button key={d} className="dp" aria-pressed={d === sel} onClick={() => onPick(d)}>
          <small>{S.lang === 'hi' ? E.DOW_HI[dt.getUTCDay()] : E.DOW[dt.getUTCDay()]}</small><b>{dt.getUTCDate()}</b>
          {z ? <i style={{ background: E.ZC(z) }}>{E.ZSHORT[z] || E.ZN[z].name}</i> : <i className="nt">{E.MON[dt.getUTCMonth()]}</i>}
        </button>
      ); })}
      <label className="dp more"><Ic n="cal" s={18} /><i className="nt">{tr('More', 'और')}</i><input type="date" aria-label={tr('Another day', 'दूसरा दिन')} min={E.TODAY} value={sel} onChange={(e) => e.target.value && onPick(e.target.value)} /></label>
    </div>
  );
}

/* ---------------- a half-day or full-day plan: its stops timed for one day, then add them all ---------------- */
export function BlockSheet({ E }: { E: Engine }) {
  const tr = lang(E);
  const { S } = E; const q = S.blk; const b = q && E.BLK[q.id]; if (!b) return null;
  const zb = b.z === 'WAN' || b.z === 'BAR' ? 'PBL' : b.z; const date: string = q.date || E.defaultDayFor(zb);
  const st = E.stayAt(S.cart, zb, date, 600); const hk = st ? E.hotelKey(E.HOT[st.ref]) : undefined;
  const w = q.from != null ? { from: +q.from, to: +q.to + (q.eve ? 30 : 0), evening: !!q.eve, hk } : { hk };
  const p = E.planBlock(b, date, w); const m = E.blockMeta(b);
  const icon = (x: any) => (x.entry ? 'camera' : E.FAMICON[x.fam] || 'wave');
  const pick = (d: string) => { S.blk = { ...S.blk, date: d, from: null, to: null }; commit(); };
  const book = (id: string) => { S.sheet = null; commit(); dispatch('product', { kind: 'act', id, date }); };
  return (
    <Sheet label={b.n} onClose={() => close(E)}>
      <span className="tag acc" style={{ alignSelf: 'flex-start' }}>{(p ? p.label : m.full ? 'Full-day plan' : 'Half-day plan') === 'Full-day plan' ? tr('Full-day plan', 'पूरे दिन की योजना') : tr('Half-day plan', 'आधे दिन की योजना')} · {E.ZN[zb].name}</span>
      <h2>{b.n}</h2>
      <p className="note" style={{ marginTop: -8 }}>{b.why}. {p ? tr(`${E.hm(p.start)} to ${E.hm(p.end)}, with about ${p.backMin} min back to ${st ? 'your stay' : 'the centre'}.`, `${E.hm(p.start)} से ${E.hm(p.end)} तक, फिर ${st ? 'आपके होटल' : 'शहर'} तक लगभग ${p.backMin} मिनट।`) : ''}</p>
      <div className="eyebrow">{tr('Day', 'दिन')}</div>
      <DayPicker E={E} sel={date} onPick={pick} />
      <div className="pkday" style={{ border: 0, padding: 0 }}>
        {p ? p.items.map((i: any) => (
          <div key={i.ref + i.s} className="pkrow"><span className="mono">{E.hm(i.s)}</span><span className="nd" style={{ background: E.ZC(i.x.z) }}><Ic n={icon(i.x)} s={13} w={2} /></span>
            <span><b>{i.x.n}</b><small>{i.x.v || ''} · {E.durTxt(i.d)}{i.during ? tr(' · during the boat trip', ' · नाव की सैर के दौरान') : ''}</small></span>
            <button className="link" style={{ gridColumn: 3, justifySelf: 'start', minHeight: 32 }} onClick={() => book(i.ref)}>{tr('Book this on its own', 'इसे अलग से बुक करें')}</button></div>
        )) : m.xs.map((x: any, n: number) => (
          <div key={x.id} className="pkrow"><span className="mono">{n + 1}</span><span className="nd" style={{ background: E.ZC(x.z) }}><Ic n={icon(x)} s={13} w={2} /></span><span><b>{x.n}</b><small>{x.v || ''} · {E.durTxt(x.d)}</small></span></div>
        ))}
      </div>
      {p ? (
        <>
          <div className="split"><span className="hr" /><span><b>{tr('Plan total', 'योजना की कुल राशि')}</b><span className="sub" style={{ display: 'block' }}>{E.paxTxt()} · {tr('before GST · itemised at checkout', 'GST से पहले · चेकआउट पर पूरा ब्योरा')}</span></span><span className="v" style={{ font: '800 24px var(--f-display)' }}>{E.inr(p.price)}</span></div>
          <button className="btn primary block" onClick={() => dispatch('blkadd', { id: b.id, date, ...(q.from != null ? { from: q.from, to: q.to, eve: q.eve ? 1 : 0 } : {}) })}><Ic n="plus" s={18} w={2.6} /> {tr(`Add plan to ${E.fD(date)}`, `${E.fD(date)} में योजना जोड़ें`)}</button>
        </>
      ) : (
        <div className="fitbox warn"><div className="ln"><Ic n="alert" s={18} /><p>{tr(`This plan does not fit on ${E.fD(date)}: a stop is closed, out of season, already booked, or it clashes with something in your trip. Try another day, or book a stop on its own.`, `यह योजना ${E.fD(date)} को फिट नहीं होती: कोई जगह बंद है, मौसम नहीं है, पहले से बुक है, या आपकी यात्रा की किसी चीज़ से टकराती है। कोई दूसरा दिन चुनें, या कोई जगह अलग से बुक करें।`)}</p></div></div>
      )}
      <button className="btn ghost block" onClick={() => close(E)}>{E.t('done')}</button>
    </Sheet>
  );
}

/* ---------------- loading a planned trip over plans you already have ---------------- */
export function PkgLoadSheet({ E }: { E: Engine }) {
  const tr = lang(E);
  return (
    <Sheet label={E.t('replaceQ')} onClose={() => close(E)}>
      <h2>{E.t('replaceQ')}</h2>
      <p className="note">{E.t('replaceS')}</p>
      <button className="btn primary block" onClick={() => dispatch('pkgreplace', { id: E.S.pkgPending })}>{E.t('replace')}</button>
      <button className="btn ghost block" onClick={() => close(E)}>{E.t('keepMine')}</button>
    </Sheet>
  );
}

/** Every bottom sheet, by the engine's name for it (S.sheet). */
export const REACT_SHEETS: Record<string, (p: { E: Engine }) => ReactNode> = {
  dates: DatesSheet, breakdown: BreakdownSheet, fixmenu: FixMenuSheet, autofix: AutoFixSheet, help: HelpSheet, move: MoveSheet, ferryadded: FerryAddedSheet,
  block: BlockSheet, pkgload: PkgLoadSheet,
};

export function useEngineSheet() { return useEngine(); }
