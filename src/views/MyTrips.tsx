'use client';
/* My trips (Tide): the booked trip day by day. Each booking is one row; a tap opens its code to show at the gate.
   Ferries read like boarding passes. Right after paying, the page opens with the confirmation. Saved itineraries sit below. */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { commit, showToast, useEngine } from '@/engine/client';
import { Art, Loading } from '@/components/ui';
import { TideIcon, WaIcon } from '@/components/Brand';
import AskWhatsApp from '@/components/AskWhatsApp';
import { waLink, waText } from '@/lib/whatsapp';

const KIND: Record<string, [string, string, string]> = { stay: ['k-stay', 'bed', 'Stay'], ferry: ['k-boat', 'boat', 'Ferry'], cab: ['k-cab', 'car', 'Cab'], rent: ['k-cab', 'car', 'Rental'], act: ['k-sight', 'sunset', 'Activity'] };
const PAYN: Record<string, string> = { upi: 'UPI', card: 'card', nb: 'netbanking' };

function Qr({ html }: { html: string }) {
  const inner = useMemo(() => ({ __html: html }), [html]);
  return <span className="atp-qr" aria-hidden="true" dangerouslySetInnerHTML={inner} />;
}

/* a calendar file of the whole trip, made on the phone */
function ics(list: any[], E: any) {
  const pad = (s: string) => s.replace(/[-:]/g, ''); const esc = (s: string) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Andaman Travel Planner//Trip//EN', 'CALSCALE:GREGORIAN'];
  list.forEach((p) => {
    out.push('BEGIN:VEVENT', `UID:${p.code}@andamantravelplanner.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`);
    if (p.kind === 'stay') out.push(`DTSTART;VALUE=DATE:${pad(p.date)}`, `DTEND;VALUE=DATE:${pad(E.addD(p.date, p.nights || 1))}`);
    else { const t = /^\d\d:\d\d$/.test(p.time) ? p.time : '09:00'; const end = p.arr && p.arr > t ? p.arr : E.hm(Math.min(E.tm(t) + 60, 23 * 60 + 59)); out.push(`DTSTART;TZID=Asia/Kolkata:${pad(p.date)}T${pad(t)}00`, `DTEND;TZID=Asia/Kolkata:${pad(p.date)}T${pad(end)}00`); }
    out.push(`SUMMARY:${esc(p.title)}`, `DESCRIPTION:${esc(`${p.report}\nCode ${p.code}${p.vendor ? `\n${p.vendor}` : ''}`)}`, `LOCATION:${esc(E.ZN[p.zone] ? E.ZN[p.zone].name + ', Andaman Islands' : 'Andaman Islands')}`, 'END:VEVENT');
  });
  out.push('END:VCALENDAR'); return out.join('\r\n');
}

export default function MyTrips() {
  const E = useEngine();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  if (!E) return <Loading />;
  const { S } = E;
  const saved: any[] = (S.trips || []).filter((t: any) => t && t.cart && t.cart.length);
  const paid = params.get('paid') === '1';
  const list: any[] = S.booked.slice().sort((a: any, b: any) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));
  const rec = (S.lead && S.lead.paid) || null;
  const first = list[0], last = list[list.length - 1];
  const days: { date: string; items: any[] }[] = [];
  list.forEach((p) => { const d = days[days.length - 1]; if (d && d.date === p.date) d.items.push(p); else days.push({ date: p.date, items: [p] }); });
  const cover = (list.find((p) => p.zone && p.zone !== 'PBL') || first || {}).zone || 'HAV';
  const dayNo = (date: string) => (first ? Math.round((E.pDate(date).getTime() - E.pDate(first.date).getTime()) / 864e5) + 1 : 1);
  const short = (date: string) => { const d = E.pDate(date); return `${E.DOW[d.getUTCDay()]} ${d.getUTCDate()} ${E.MON[d.getUTCMonth()]}`; };
  const range = first ? (first.date === last.date ? short(first.date) : `${short(first.date)} – ${short(last.date)}`) : '';
  const shareTxt = first ? `We’re going to the Andamans, ${range}.\n${days.map((d) => `${short(d.date)}: ${d.items.map((p) => p.title).join(', ')}`).join('\n')}\nBooked with Andaman Travel Planner${S.bookingCode ? ` · ${S.bookingCode}` : ''}` : '';
  const cal = () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics(list, E)], { type: 'text/calendar' })); a.download = 'andaman-trip.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); showToast('Calendar file saved. Open it to add every booking.'); } catch { showToast('This phone could not save the calendar file.'); } };

  const row = (p: any) => {
    const [tile, icon] = KIND[p.kind] || KIND.act; const on = open === p.code; const used = S.scans && S.scans[p.code]; const s = p.kind === 'ferry' && p.ref ? E.SAIL[p.ref] : null;
    const zf = E.ZN[p.zone] ? E.ZN[p.zone].name : '', zt = p.to && E.ZN[p.to] ? E.ZN[p.to].name : '';
    return (
      <div key={p.code} className={`atp-vch${on ? ' is-open' : ''}${s ? ' is-ferry' : ''}`}>
        {s ? (
          <button type="button" className="atp-pass" aria-expanded={on} aria-label={`Ferry ${zf} to ${zt}, ${E.clock(E.tm(s.dep))}. Show the ticket code`} onClick={() => setOpen(on ? null : p.code)}>
            <span className="atp-pass-band"><span><TideIcon n="boat" s={16} /><b>{s.gov ? 'Government ship' : String(s.op).replace(/ \d$/, '')}</b></span><span>{p.cls || ''}</span></span>
            <span className="atp-pass-main">
              <span className="atp-pass-r">
                <span className="atp-pass-pt"><b>{E.clock(E.tm(s.dep))}</b><span>{zf}</span><small>{s.fromPt}</small></span>
                <span className="atp-pass-mid"><i /><em>{E.tcDur(E.tm(s.arr) - E.tm(s.dep)).toLowerCase()}</em><i /></span>
                <span className="atp-pass-pt is-to"><b>{E.clock(E.tm(s.arr))}</b><span>{zt}</span><small>{s.toPt}</small></span>
              </span>
              <span className="atp-pass-f"><span><small>Be there by</small><b>{E.clock(E.tm(s.dep) - (s.rep || 45))}</b></span><span><small>Seats</small><b>{p.seats || 'At the counter'}</b></span><span><small>Travellers</small><b>{p.pax}</b></span></span>
            </span>
            <span className="atp-pass-stub"><span><small>Ticket</small><b>{p.code}</b></span><span className="atp-pass-bar" aria-hidden="true">{Array.from(p.code as string).map((c, i) => <i key={i} style={{ width: 1 + (c.charCodeAt(0) % 3) }} />)}</span><span className="atp-pass-p">{on ? 'Hide' : 'Show code'}</span></span>
          </button>
        ) : (
          <button type="button" className="atp-vrow" aria-expanded={on} onClick={() => setOpen(on ? null : p.code)}>
            <span className={`atp-tile ${tile}`}><TideIcon n={icon} /></span>
            <span className="atp-vt">{p.kind === 'stay' ? 'Check in' : /^\d\d:\d\d$/.test(p.time) ? E.clock(E.tm(p.time)) : ''}</span>
            <span className="atp-vb"><b>{p.title}</b><small>{p.report}</small></span>
            {used ? <span className="atp-vtag">Used</span> : <TideIcon n="down" s={16} />}
          </button>
        )}
        {on && (
          <div className="atp-vopen">
            <Qr html={E.qr(p.code, 29)} />
            <div className="atp-vfacts">
              <b className="atp-vcode">{p.code}</b>
              <dl>
                <div><dt>When</dt><dd>{short(p.date)}{p.kind === 'stay' ? ` · ${p.nights || 1} night${(p.nights || 1) > 1 ? 's' : ''}` : /^\d\d:\d\d$/.test(p.time) ? ` · ${E.clock(E.tm(p.time))}` : ''}</dd></div>
                <div><dt>Be ready</dt><dd>{p.report}</dd></div>
                <div><dt>Travellers</dt><dd>{p.pax}</dd></div>
                {p.vendor && <div><dt>Partner</dt><dd>{p.vendor}</dd></div>}
              </dl>
              <p className="atp-fine"><TideIcon n="check" s={14} /> Saved on this phone. It opens without network; turn the brightness up at the gate.</p>
              <a className="atp-link atp-wa-text" href={waLink(waText(`I need help with this booking: ${p.title}.`, [`${short(p.date)}${/^\d\d:\d\d$/.test(p.time) ? ` · ${E.clock(E.tm(p.time))}` : ''} · ${p.pax} traveller${p.pax > 1 ? 's' : ''}`, `Code: ${p.code}`, S.bookingCode ? `Booking: ${S.bookingCode}` : '']))} target="_blank" rel="noopener noreferrer">Ask about this booking on WhatsApp</a>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* the day's cab rides are one row: one car, one driver, every pickup inside */
  const cabs = (date: string, rides: any[]) => {
    const id = 'cab:' + date; const on = open === id; const t0 = rides[0].time, t1 = rides[rides.length - 1].time;
    return (
      <div key={id} className={`atp-vch${on ? ' is-open' : ''}`}>
        <button type="button" className="atp-vrow" aria-expanded={on} onClick={() => setOpen(on ? null : id)}>
          <span className="atp-tile k-cab"><TideIcon n="car" /></span>
          <span className="atp-vt">{E.clock(E.tm(t0))}</span>
          <span className="atp-vb"><b>{rides.length > 1 ? `Cab · ${rides.length} rides` : 'Cab · 1 ride'}</b><small>{rides.length > 1 ? `First pickup ${E.clock(E.tm(t0))}, last ${E.clock(E.tm(t1))}` : rides[0].title}</small></span>
          <TideIcon n="down" s={16} />
        </button>
        {on && (
          <ol className="atp-rides">
            {rides.map((p) => <li key={p.code}><b>{E.clock(E.tm(p.time))}</b><span>{p.title}<small>{p.vendor ? `${p.vendor} · ` : ''}{p.code}</small></span></li>)}
          </ol>
        )}
      </div>
    );
  };
  const dayRows = (d: { date: string; items: any[] }) => {
    const rides = d.items.filter((p) => p.kind === 'cab' && /^\d\d:\d\d$/.test(p.time)); let done = false;
    return d.items.map((p) => { if (rides.includes(p)) { if (done) return null; done = true; return cabs(d.date, rides); } return row(p); });
  };

  return (
    <div className="atp-pg atp-mt">
      {paid && first && (
        <section className="atp-done" aria-live="polite">
          <div className="atp-done-ph"><Art z={cover} icon="beach" seed={'COVER:' + cover} big /><span className="atp-done-tag"><TideIcon n="check" s={16} />Paid and booked</span></div>
          <div className="atp-done-b">
            <h1 className="atp-h1">You’re going to the Andamans</h1>
            <p className="atp-lead">{range} · {first.pax} traveller{first.pax > 1 ? 's' : ''} · {list.length} bookings confirmed</p>
            <dl className="atp-rcpt">
              {S.bookingCode && <div><dt>Booking</dt><dd>{S.bookingCode}</dd></div>}
              {rec && <div><dt>Paid</dt><dd>{E.inr(rec.total)}</dd></div>}
              {rec && <div><dt>With</dt><dd>{PAYN[rec.method] || 'UPI'}</dd></div>}
            </dl>
            {rec && rec.test && <p className="atp-draft"><TideIcon n="alert" s={18} /><span><b>Test booking.</b> No money was taken and the partners were not contacted.</span></p>}
            <div className="atp-first"><span className="atp-sec">First up</span><b>{short(first.date)}{/^\d\d:\d\d$/.test(first.time) ? ` · ${E.clock(E.tm(first.time))}` : ''}</b><span>{first.title}</span><small>{first.report}</small></div>
            <div className="atp-done-acts">
              <a className="atp-btn is-commit" href={`https://wa.me/?text=${encodeURIComponent(shareTxt)}`} target="_blank" rel="noopener noreferrer"><WaIcon s={22} />Share on WhatsApp</a>
              <button type="button" className="atp-btn is-outline" onClick={cal}><TideIcon n="cal" s={18} />Add to calendar</button>
            </div>
          </div>
        </section>
      )}

      <section className={`atp-cs${paid && first ? '' : ' is-first'}`}>
        {paid && first ? <h2>Every ticket and voucher</h2> : <h1 className="atp-h1">My trips</h1>}
        {!list.length ? (
          <div className="atp-mt-empty">
            <p className="atp-lead">After you pay, every ferry ticket, stay, cab and activity shows here day by day, saved on your phone.</p>
            <button type="button" className="atp-btn is-action" onClick={() => router.push(S.cart.length ? '/trip' : '/')}>{S.cart.length ? 'Go to my trip' : 'Start exploring'}</button>
          </div>
        ) : (
          <>
            <p className="atp-lead">{paid ? 'Tap a booking to show its code at the gate. Everything opens without network.' : `${range} · ${list.length} bookings, saved on this phone. Tap one to show its code.`}</p>
            {!paid && <div className="atp-mt-tools"><a className="atp-btn is-outline" href={`https://wa.me/?text=${encodeURIComponent(shareTxt)}`} target="_blank" rel="noopener noreferrer"><WaIcon s={20} />Share</a><button type="button" className="atp-btn is-outline" onClick={cal}><TideIcon n="cal" s={18} />Add to calendar</button></div>}
            <div className="atp-vlist">
              {days.map((d) => (
                <section key={d.date} className="atp-vday" aria-label={`Day ${dayNo(d.date)}, ${short(d.date)}`}>
                  <h3 className="atp-vday-h"><b>Day {dayNo(d.date)}</b><span>{short(d.date)}</span><em>{E.ZN[d.items[0].zone] ? E.ZN[d.items[0].zone].name : ''}</em></h3>
                  {dayRows(d)}
                </section>
              ))}
            </div>
            <AskWhatsApp withTrip={false} about={`I need to change or cancel something in my booking${S.bookingCode ? ` ${S.bookingCode}` : ''}.`} lines={[`${range} · ${first.pax} traveller${first.pax > 1 ? 's' : ''} · ${list.length} bookings`, `Name: ${(S.lead && S.lead.name) || ''}`]} label="Change or cancel on WhatsApp" hint="Your booking code and dates go with the message." />
            <p className="atp-fine">Refund rules are in <Link className="atp-link" href="/refunds" prefetch={false}>refunds and cancellation</Link>. You can also write to <a className="atp-link" href="mailto:info@andamantravelplanner.com">info@andamantravelplanner.com</a>.</p>
          </>
        )}
      </section>

      {saved.length > 0 && (
        <section className="atp-cs">
          <h2>Saved itineraries</h2>
          <p className="atp-lead">Plans you saved on this phone. Open one to carry on.</p>
          <div className="atp-rows">
            {saved.map((t: any) => (
              <button key={t.id} type="button" className="atp-nrow" onClick={() => { if (E.openTrip) E.openTrip(t.id); commit(); router.push('/trip'); }}>
                <span className="atp-tile"><TideIcon n="trip" /></span>
                <span className="atp-vb"><b>{t.name || 'My trip'}</b><small>{t.win && t.win.start ? `${short(t.win.start)} – ${short(t.win.end)} · ` : ''}{t.cart.length} bookings{t.total ? ` · ${E.inr(t.total)}` : ''}</small></span>
                <TideIcon n="chev" s={16} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
