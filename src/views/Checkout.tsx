'use client';
/* Checkout (Tide): who is travelling, the price by kind of booking, what happens if plans change, how to pay.
   After Pay: each partner confirms in turn, then My trips. Payment is simulated until Razorpay is connected
   (see /api/payments), and the page says so. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { commit, showToast, useEngine } from '@/engine/client';
import { Art, Loading } from '@/components/ui';
import { TideIcon } from '@/components/Brand';
import { COMPANY, DPIIT_LINE } from '@/lib/company';
import AskWhatsApp from '@/components/AskWhatsApp';

type Person = { name: string; age: string; gender: string; pp: string };
type Lead = { name: string; phone: string; email: string; people?: Person[]; gstin?: string };
const PAYS: [string, string, string][] = [['upi', 'UPI', 'Google Pay, PhonePe, Paytm, BHIM or any UPI app'], ['card', 'Debit or credit card', 'Visa, Mastercard, RuPay'], ['nb', 'Netbanking', 'All major Indian banks']];
const KINDS: [string, string, string, string][] = [['stay', 'Stays', 'k-stay', 'bed'], ['ferry', 'Ferries', 'k-boat', 'boat'], ['cab', 'Cabs and rentals', 'k-cab', 'car'], ['act', 'Activities and entry tickets', 'k-sight', 'sunset']];
const GENDERS = ['Female', 'Male', 'Other'];

export default function Checkout() {
  const E = useEngine();
  const router = useRouter();
  const [busy, setBusy] = useState<{ steps: [string, string, string][]; done: number } | null>(null);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [contact, setContact] = useState<{ phone: string; email: string } | null>(null);
  const [indian, setIndian] = useState(true);
  const [biz, setBiz] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [now, setNow] = useState('');
  useEffect(() => { setNow(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })); }, []);
  if (!E) return <Loading />;
  const { S } = E;

  if (busy) return (
    <div className="atp-pg atp-co">
      <section className="atp-cs is-first">
        <h1 className="atp-h1">Booking your trip</h1>
        <p className="atp-lead">Each booking goes to its own partner. This takes under a minute.</p>
        <ol className="atp-conf" aria-live="polite">
          {busy.steps.map(([b, s, ok], i) => (
            <li key={i} className={i < busy.done ? 'is-done' : i === busy.done ? 'is-now' : ''}>
              <span className="atp-st">{i < busy.done ? <TideIcon n="check" s={18} /> : <i className="atp-spin" />}</span>
              <span><b>{b}</b><small>{s}</small></span><em>{i < busy.done ? ok : i === busy.done ? 'Confirming' : 'Waiting'}</em>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
  if (!S.cart.length) return (
    <div className="atp-pg atp-trip-empty"><h1>Nothing to pay for yet</h1><p className="atp-lead">Add something to your trip first.</p>
      <button type="button" className="atp-btn is-action atp-wide" onClick={() => router.push('/')}>Start exploring</button></div>
  );

  if (!S.trip) { try { E.syncTrip(); } catch {} }
  const L: Lead = S.lead || { name: '', phone: '', email: '' };
  /* one form per traveller: adults, then children (their ages come from the trip), then infants */
  const hasFerry = S.cart.some((it: any) => it.kind === 'ferry' && !it.own);
  const kidAges: number[] = E.kidAges ? E.kidAges() : [];
  const all: { k: string; label: string; age?: number }[] = [
    ...Array.from({ length: S.pax.adults || 1 }, () => ({ k: 'adult', label: 'Adult' })),
    ...kidAges.map((a) => ({ k: 'child', label: `Child · ${a} years, from your trip`, age: a })),
    ...Array.from({ length: S.pax.infants || 0 }, () => ({ k: 'infant', label: 'Infant · under 2' })),
  ];
  /* ferry operators need everyone on the passenger list; without a ferry, one contact is enough */
  const roles = hasFerry ? all : all.slice(0, 1);
  const P: Person[] = roles.map((r, i) => (people && people[i]) || (L.people && L.people[i]) || { name: i === 0 ? L.name || '' : '', age: r.age != null ? String(r.age) : '', gender: '', pp: '' });
  const C = contact || { phone: L.phone || '', email: L.email || '' };
  const setP = (i: number, k: keyof Person, v: string) => { const n = P.slice(); n[i] = { ...n[i], [k]: v }; setPeople(n); if (errs[`t${i}${k}`]) setErrs({ ...errs, [`t${i}${k}`]: '' }); };
  const setC = (k: 'phone' | 'email', v: string) => { setContact({ ...C, [k]: v }); if (errs[k]) setErrs({ ...errs, [k]: '' }); };

  /* the price, by kind of booking; each line names the partner it goes to */
  const rows = S.cart.map((it: any) => ({ it, I: E.info(it), meal: it.kind === 'act' && !!(E.ACT[it.ref] || {}).meal })).filter((x: any) => !x.I.own);
  const meals = rows.filter((x: any) => x.meal).length;
  const groups = KINDS.map(([k, n, tile, icon]) => { const list = rows.filter((x: any) => !x.meal && (k === 'cab' ? x.it.kind === 'cab' || x.it.kind === 'rent' : x.it.kind === k)).sort((a: any, b: any) => String(a.it.date).localeCompare(String(b.it.date))); return { k, n, tile, icon, list, sum: list.reduce((s: number, x: any) => s + (x.I.price || 0), 0) }; }).filter((g) => g.list.length);
  const vendors = [...new Set<string>(groups.flatMap((g) => g.list.map((x: any) => x.I.vendor)).filter(Boolean))];
  const sub = E.subtotal(), fee = E.fee(), gst = E.gstTotal() + E.feeGst(), tot = E.total(); const n: number = E.pax() || 1; const req = E.onReq();
  /* GST by rate, from the bookings themselves */
  const rates: Record<string, number> = {};
  rows.forEach((x: any) => { if (!x.meal && x.I.gst && x.I.price) rates[x.I.gst] = (rates[x.I.gst] || 0) + x.I.price; });
  if (fee) rates[E.FEE_GST] = (rates[E.FEE_GST] || 0) + fee;
  /* what each booking's own cancellation rule means for this trip */
  const KW: Record<string, string> = { stay: 'Stays', ferry: 'Ferries', cab: 'Cabs', rent: 'Rentals', act: 'Activities' };
  const paidRows = rows.filter((x: any) => !x.meal && x.I.price);
  const byPol = (id: string) => paidRows.filter((x: any) => x.I.pol === id);
  const kindsOf = (id: string) => { const k = [...new Set<string>(byPol(id).map((x: any) => KW[x.it.kind] || 'Bookings'))]; return k.length > 1 ? k.slice(0, -1).join(', ') + ' and ' + k[k.length - 1].toLowerCase() : k[0] || ''; };
  const flex = [...byPol('POL-FLEX'), ...byPol('POL-MOD')];
  const freeBy = flex.length ? flex.map((x: any) => E.addD(x.it.date, x.I.pol === 'POL-MOD' ? -3 : -1)).sort()[0] : '';
  const flexSum = flex.reduce((n: number, x: any) => n + x.I.price + Math.round(x.I.price * (x.I.gst || 0) / 100), 0);
  const today = E.TODAY;
  const POLS: [string, string, string, string][] = [
    ['POL-MOD', 'bed', '', 'Full refund until 72 hours before check-in, half until 24 hours before, none in the last 24 hours.'],
    ['POL-FLEX', 'clock', '', 'Full refund until 24 hours before each one starts. No refund after that.'],
    ['POL-OPERATOR', 'boat', '', 'Each operator’s own published rules apply. If the operator or the port cancels for weather, you get that booking back in full.'],
    ['POL-STRICT', 'alert', '', 'Half back until 7 days before. No refund after that.'],
    ['POL-NR', 'alert', '', 'No refund. One free date change if the partner agrees.'],
    ['POL-GOVT', 'alert', 'Government entry fees', 'Refunded only if the authority refunds them.'],
  ];
  const dm = (date: string) => { const d = E.pDate(date); return `${d.getUTCDate()} ${E.MON[d.getUTCMonth()]}`; };
  const cover = (S.cart.map((it: any) => E.info(it).zone).find((z: string) => z && z !== 'PBL')) || 'PBL';
  const check = () => {
    const bad: Record<string, string> = {};
    P.forEach((p, i) => {
      if (p.name.trim().length < 2) bad[`t${i}name`] = 'Add the name as it is on the photo ID';
      if (!hasFerry) return;
      if (roles[i].k === 'adult' && !(Number(p.age) >= 12 && Number(p.age) <= 110)) bad[`t${i}age`] = 'Add the age in years';
      if (!p.gender) bad[`t${i}gender`] = 'Choose one';
      if (!indian && roles[i].k !== 'infant' && p.pp.trim().length < 6) bad[`t${i}pp`] = 'Add the passport number';
    });
    if (C.phone.replace(/\D/g, '').length < 10) bad.phone = 'Add a 10-digit WhatsApp number; tickets and updates go there';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(C.email.trim())) bad.email = 'Add an email address for invoices and receipts';
    if (biz != null && !/^[0-9]{2}[A-Z0-9]{13}$/i.test(biz.trim())) bad.gstin = 'A GSTIN has 15 letters and numbers';
    return bad;
  };

  const pay = () => {
    const bad = check(); setErrs(bad);
    const first = Object.keys(bad)[0];
    if (first) { showToast(`${Object.keys(bad).length} detail${Object.keys(bad).length > 1 ? 's' : ''} missing. They are marked in red.`); const el = document.querySelector<HTMLElement>(`[data-f="${first}"]`); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => el?.querySelector<HTMLElement>('input,button')?.focus({ preventScroll: true }), 350); return; }
    S.lead = { name: P[0].name.trim(), phone: C.phone.trim(), email: C.email.trim(), people: P.map((p) => ({ name: p.name.trim(), age: p.age, gender: p.gender, pp: '' })), ...(biz != null ? { gstin: biz.trim().toUpperCase() } : {}) };
    const method = (PAYS.find((p) => p[0] === S.pay) || PAYS[0])[1];
    const steps: [string, string, string][] = [['Payment received', `${E.inr(tot)} by ${method}`, 'Confirmed'], ...vendors.map((v): [string, string, string] => { const mine = rows.filter((x: any) => x.I.vendor === v); const c = mine.length; const boat = mine.every((x: any) => x.it.kind === 'ferry');
      return [v, boat ? `${c} ticket${c > 1 ? 's' : ''} · our team books within 15 minutes` : `${c} booking${c > 1 ? 's' : ''}`, boat ? 'Received' : 'Confirmed']; })];
    S.lead.paid = { total: tot, method: S.pay || 'upi', at: Date.now(), test: true };
    E.bookAll();
    /* what My trips needs to draw a ticket: the sailing, the class, the nights (same order as the trip) */
    S.booked.forEach((b: any, i: number) => { const it = S.cart[i]; if (!it) return; b.ref = it.ref; if (it.cls) b.cls = it.cls; if (it.nights) b.nights = it.nights; if (it.own) b.own = true; if (it.kind === 'ferry') { if (E.SAIL[it.ref]) b.arr = E.SAIL[it.ref].arr; b.seats = ''; } });
    setBusy({ steps, done: 0 }); commit(); window.scrollTo(0, 0);
    /* send it to the server (saved in the database once Supabase is connected); the vouchers stay on the phone either way */
    E.syncTrip(); const trip = S.trip || S.win || {};
    const send = fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      lead: { name: S.lead.name, phone: S.lead.phone, email: S.lead.email }, pay: 'simulated', pax: { adults: S.pax.adults, kids: S.pax.kids, infants: S.pax.infants },
      start: trip.start, end: trip.end, subtotal: sub, fee, gst, total: tot,
      items: S.booked, trip: { cart: S.cart, pax: S.pax, win: S.win, fin: S.fin, fout: S.fout, method: S.pay, fee, travellers: P.map((p, i) => ({ name: p.name.trim(), age: p.age, gender: p.gender, role: roles[i].k, ...(indian ? {} : { passport: p.pp.trim() }) })), gstin: S.lead.gstin, indian },
    }) }).then((r) => r.json()).then((j) => {
      if (!j || !j.stored) return;
      S.bookingCode = j.code;
      // the server gave a new code to any voucher whose code was already taken, so the QR matches the database
      Object.entries(j.renamed || {}).forEach(([from, to]) => { const b = S.booked.find((x: any) => x.code === from); if (b) b.code = to; });
    }).catch(() => {});
    /* each partner ticks off in turn; the whole thing never takes longer than about three seconds */
    const gap = Math.min(380, Math.round(2600 / steps.length));
    steps.forEach((_, i) => setTimeout(() => setBusy((b) => (b ? { ...b, done: i + 1 } : b)), gap * (i + 1)));
    const wait = new Promise((r) => setTimeout(r, gap * steps.length + 500));
    Promise.all([wait, Promise.race([send, new Promise((r) => setTimeout(r, 6000))])]).then(() => { S.cart = []; S.win = null; commit(); router.push('/my-trips?paid=1'); });
  };

  const field = (id: string, key: string, label: string, value: string, on: (v: string) => void, o: { ph?: string; mode?: 'text' | 'tel' | 'email' | 'numeric'; hint?: string; auto?: string } = {}) => (
    <div className={`atp-f${errs[key] ? ' is-bad' : ''}`} data-f={key}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(e) => on(e.target.value)} placeholder={o.ph} inputMode={o.mode} autoComplete={o.auto} aria-invalid={!!errs[key]} aria-describedby={errs[key] ? id + '-e' : undefined} />
      {o.hint && !errs[key] && <small className="atp-fhint">{o.hint}</small>}
      {errs[key] && <small className="atp-err" id={id + '-e'}>{errs[key]}</small>}
    </div>
  );

  return (
    <div className="atp-pg atp-co">
        <div className="atp-cosum">
          <span className="atp-ph"><Art z={cover} icon="beach" seed={'COVER:' + cover} /></span>
          <span><b>{S.trip ? (S.trip.start === S.trip.end ? E.fD(S.trip.start) : `${E.fD(S.trip.start)} – ${E.fD(S.trip.end)}`) : 'Your bookings'}</b><small>{E.paxTxt()}</small><small className="atp-okline"><TideIcon n="check" s={14} />{rows.length} booking{rows.length > 1 ? 's' : ''} checked</small></span>
          <Link className="atp-btn is-text" href="/trip" prefetch={false}>Edit</Link>
        </div>
        <p className="atp-checked"><TideIcon n="clock" s={16} /><span>Prices checked{now ? <> at <b className="atp-mono">{now}</b></> : ''}. We check again the moment you pay.</span></p>

        <section className="atp-cs">
          <h1 className="atp-h1">Who’s travelling</h1>
          <p className="atp-lead">{hasFerry ? 'Ferry operators need every name, age and gender for the passenger list. Carry the same photo ID.' : 'One contact for the trip. Carry a photo ID for hotel check-in.'}</p>
          {hasFerry && <p className="atp-checked atp-ferrynote"><TideIcon n="boat" s={16} /><span>Ferry tickets are booked by our team within 15 minutes of your confirmation and sent on WhatsApp. We ask you directly which seats you would like.</span></p>}
          {roles.map((r, i) => (
            <div key={i} className="atp-trav">
              <div className="atp-trav-h"><span className="atp-tile"><TideIcon n="user" s={18} /></span><b>{hasFerry ? `Traveller ${i + 1}` : 'Your details'}</b><span>{hasFerry ? r.label + (i === 0 ? ' · contact for the trip' : '') : `Booking for ${E.paxTxt()}`}</span></div>
              {field(i === 0 ? 'ln' : `t${i}n`, `t${i}name`, r.k === 'adult' ? 'Full name, as on photo ID' : 'Full name, as on school or Aadhaar ID', P[i].name, (v) => setP(i, 'name', v), { ph: i === 0 ? 'e.g. Priya Sharma' : '', auto: i === 0 ? 'name' : 'off' })}
              {hasFerry && <div className={r.k === 'adult' ? 'atp-two' : ''}>
                {r.k === 'adult' && field(`t${i}a`, `t${i}age`, 'Age', P[i].age, (v) => setP(i, 'age', v.replace(/\D/g, '').slice(0, 3)), { ph: 'Years', mode: 'numeric' })}
                <div className={`atp-f${errs[`t${i}gender`] ? ' is-bad' : ''}`} data-f={`t${i}gender`}>
                  <span className="atp-lab" id={`t${i}g`}>Gender</span>
                  <div className="atp-seg" role="radiogroup" aria-labelledby={`t${i}g`}>{GENDERS.map((g) => <button key={g} type="button" role="radio" aria-checked={P[i].gender === g} onClick={() => setP(i, 'gender', g)}>{g}</button>)}</div>
                  {errs[`t${i}gender`] && <small className="atp-err">{errs[`t${i}gender`]}</small>}
                </div>
              </div>}
              {hasFerry && !indian && r.k !== 'infant' && field(`t${i}pp`, `t${i}pp`, 'Passport number', P[i].pp, (v) => setP(i, 'pp', v.toUpperCase()), {})}
              {i === 0 && <>
                {field('lp', 'phone', 'WhatsApp number', C.phone, (v) => setC('phone', v), { ph: '98xxx xxxxx', mode: 'tel', auto: 'tel', hint: 'Tickets, driver details and changes come here.' })}
                {field('le', 'email', 'Email', C.email, (v) => setC('email', v), { ph: 'you@email.com', mode: 'email', auto: 'email', hint: 'For GST invoices and receipts.' })}
              </>}
            </div>
          ))}
          {hasFerry && <button type="button" className="atp-switch-row" role="switch" aria-checked={indian} onClick={() => setIndian(!indian)}><span><b>Everyone is an Indian national</b><small>Foreign nationals add a passport number for the ferry list.</small></span><span className="atp-sw" /></button>}
        </section>

        <aside className="atp-coside" aria-label="Price">
          <section className="atp-cs">
            <h2>Price</h2>
            {groups.map((g) => (
              <div key={g.k} className="atp-brk">
                <button type="button" className="atp-brk-h" aria-expanded={open === g.k} onClick={() => setOpen(open === g.k ? null : g.k)}>
                  <span className={`atp-tile ${g.tile}`}><TideIcon n={g.icon} /></span><span><b>{g.n}</b><small>{g.list.length} booking{g.list.length > 1 ? 's' : ''}</small></span><span className="atp-p">{E.inr(g.sum)}</span><TideIcon n="down" s={16} />
                </button>
                {open === g.k && <ul className="atp-brk-l">{g.list.map((x: any, i: number) => <li key={i}><span className="atp-mono">{dm(x.it.date)}</span><span>{x.I.title}{x.I.vendor && x.I.vendor !== x.I.title && <small>{x.I.vendor}</small>}</span><span className="atp-mono">{x.I.price != null ? E.inr(x.I.price) : 'On request'}</span></li>)}</ul>}
              </div>
            ))}
            <div className="atp-tl"><span>Subtotal</span><b>{E.inr(sub)}</b></div>
          {fee > 0 && <><div className="atp-tl"><span>Convenience fee</span><b>{E.inr(fee)}</b></div>
            <p className="atp-fine atp-feenote">We manage everything on the ground: each booking is made and confirmed with the partner, your cabs are timed to your ferries, and our team in Port Blair is on WhatsApp through the trip.</p></>}
            <div className="atp-tl"><span>GST</span><b>{E.inr(gst)}</b></div>
            {Object.keys(rates).length > 0 && <p className="atp-fine">{Object.keys(rates).sort((a, b) => Number(a) - Number(b)).map((r) => `${r}% on ${E.inr(rates[r])}`).join(' · ')}</p>}
            <div className="atp-tl is-total"><span>Total<small>{E.inr(Math.round(tot / n))} a person</small></span><b>{E.inr(tot)}</b></div>
            {meals > 0 && <p className="atp-fine">{meals} meal time{meals > 1 ? 's are' : ' is'} kept in your plan and paid at the restaurant. Nothing else is added later.</p>}
            {req > 0 && <p className="atp-fine">{req} booking{req > 1 ? 's are' : ' is'} confirmed by the partner before you are charged.</p>}
            <button type="button" className="atp-btn is-action atp-wide atp-copay" onClick={pay}>Pay {E.inr(tot)}</button>
          </section>
        </aside>

        <section className="atp-cs">
          <h2>If plans change</h2>
          {freeBy && freeBy >= today && <div className="atp-pol is-ok"><TideIcon n="check" /><span><b>Free cancellation until {E.fD(freeBy)}</b><small>{kindsOf('POL-MOD') && kindsOf('POL-FLEX') ? `${kindsOf('POL-MOD')}, ${kindsOf('POL-FLEX').toLowerCase()}` : kindsOf('POL-MOD') || kindsOf('POL-FLEX')}: {E.inr(flexSum)} back in full, GST included.</small></span></div>}
          {POLS.filter(([id]) => byPol(id).length).map(([id, icon, name, txt]) => <div key={id} className="atp-pol"><TideIcon n={icon} /><span><b>{name || kindsOf(id)}</b><small>{txt}</small></span></div>)}
          <p className="atp-fine">The full rules are in <a className="atp-link" href="/refunds">refunds and cancellation</a>.</p>
        </section>

        <section className="atp-cs">
          <h2>Pay with</h2>
          <div className="atp-paym" role="radiogroup" aria-label="Pay with">
            {PAYS.map(([k, b, s]) => <button key={k} type="button" role="radio" aria-checked={(S.pay || 'upi') === k} onClick={() => { S.pay = k; commit(); }}><span className="atp-rd" /><span><b>{b}</b><small>{s}</small></span></button>)}
          </div>
          <button type="button" className="atp-switch-row" role="switch" aria-checked={biz != null} onClick={() => setBiz(biz != null ? null : L.gstin || '')}><span><b>Business trip?</b><small>Add your company GSTIN to claim the GST.</small></span><span className="atp-sw" /></button>
          {biz != null && field('gstin', 'gstin', 'Company GSTIN', biz, (v) => { setBiz(v.toUpperCase().slice(0, 15)); if (errs.gstin) setErrs({ ...errs, gstin: '' }); }, { ph: '22AAAAA0000A1Z5' })}
          <p className="atp-draft"><TideIcon n="alert" s={18} /><span><b>Test mode.</b> No money is taken yet: payments switch on when Razorpay is connected.</span></p>
          <p className="atp-fine">One payment; each partner is paid their share and sends you a GST invoice. By paying you agree to the <a className="atp-link" href="/terms">booking terms</a> and each partner’s rules above.</p>
          <AskWhatsApp about="I have a question before I pay for my trip." lines={[`${rows.length} bookings · total ${E.inr(tot)} including GST`]} path="/checkout" label="A question before you pay?" hint="Ask on WhatsApp. Your dates, group and total go with the message." />
          <div className="atp-sec">You are booking with</div>
          <address className="atp-coinfo"><b>{COMPANY.name}</b><span>CIN {COMPANY.cin} · GSTIN {COMPANY.gstin}</span><span>{DPIIT_LINE}</span><span>{COMPANY.address}</span><span>Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></span></address>
        </section>

      <div className="cta wrap abovenav">
        <span className="tot"><b>{E.inr(tot)}</b><small>for {n} · {E.inr(Math.round(tot / n))} each</small></span>
        <button type="button" className="atp-btn is-action" onClick={pay}>Pay {E.inr(tot)}</button>
      </div>
    </div>
  );
}
