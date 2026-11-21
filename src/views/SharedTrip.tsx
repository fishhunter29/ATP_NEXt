'use client';
/* A plan someone shared, opened on the site: the same days, times and prices as their Trip page, to read and react to.
   "Open it in my planner" makes it your own trip, where everything can be changed and booked.
   The plan comes from the link itself (see src/lib/sharelink.ts); nothing is fetched. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { commit, showToast, useEngine } from '@/engine/client';
import { Art, Loading } from '@/components/ui';
import { TideIcon, WaIcon } from '@/components/Brand';
import AskWhatsApp from '@/components/AskWhatsApp';
import { unpackTrip, withShared, type Shared } from '@/lib/sharelink';

const KIND: Record<string, [string, string]> = { stay: ['k-stay', 'bed'], ferry: ['k-boat', 'boat'], cab: ['k-cab', 'car'], rent: ['k-cab', 'car'], act: ['k-sight', 'sunset'] };
type Line = { it: any; I: any; at: string };

export default function SharedTrip() {
  const E = useEngine(); const router = useRouter();
  const [t, setT] = useState<Shared | null | undefined>(undefined);
  const [url, setUrl] = useState('');
  useEffect(() => { if (!E) return; let on = true; setUrl(location.href); unpackTrip(location.hash.slice(1), E).then((x) => { if (on) setT(x); }); return () => { on = false; }; }, [E]);
  if (!E || t === undefined) return <Loading />;
  if (!t) return (
    <div className="atp-pg atp-trip-empty"><h1>This link does not open a plan</h1><p className="atp-lead">It may have been cut short when it was copied. Ask for it again, or start your own.</p>
      <Link className="atp-btn is-action atp-wide" href="/" prefetch={false}>Plan my trip</Link></div>
  );

  const v = withShared(E, t, () => {
    const lines: Line[] = t.cart.map((it) => { const I = E.info(it); return { it, I, at: it.kind === 'ferry' ? E.SAIL[it.ref].dep : it.kind === 'stay' ? '' : (it.t || '') }; });
    return { lines, total: E.total() as number, route: E.tripRoute(t.cart) as [string, number][], paxTxt: E.paxTxt() as string, n: E.pax() as number };
  });
  const dates = [...new Set(v.lines.map((x) => x.it.date))].sort();
  const start = t.win ? t.win.start : dates[0]; const end = t.win ? t.win.end : dates[dates.length - 1];
  const short = (d: string) => { const x = E.pDate(d); return `${E.DOW[x.getUTCDay()]} ${x.getUTCDate()} ${E.MON[x.getUTCMonth()]}`; };
  const dayNo = (d: string) => Math.round((E.pDate(d).getTime() - E.pDate(start).getTime()) / 864e5) + 1;
  const cover = (v.route.find(([z]) => z !== 'PBL') || v.route[0] || ['PBL'])[0];
  const routeTxt = v.route.map(([z, n]) => `${E.ZN[z].name} ${n}N`).join(' → ');
  const range = `${short(start)} – ${short(end)}`;
  const say = (about: string) => `https://wa.me/?text=${encodeURIComponent(`${about}\n\n${url}`)}`;
  const mine = E.S.cart.length > 0;
  const use = () => {
    const S = E.S; E.stashCurrent();
    S.cart = JSON.parse(JSON.stringify(t.cart)); S.seq = 999; S.pax = { ...t.pax }; S.win = t.win ? { ...t.win } : null; S.datesAssumed = t.guess; S.dismissed = {}; S.pkg = null; S.tripId = null; S.tripName = t.name || 'Shared plan';
    E.syncTrip(); commit(); if (mine) showToast('Your earlier trip is saved in My trips'); router.push('/trip');
  };

  return (
    <div className="atp-pg atp-shared">
      <div className="atp-sh-top">
        <span className="atp-sh-ph"><Art z={cover} icon="beach" seed={'COVER:' + cover} big /></span>
        <div className="atp-sh-b">
          <span className="atp-sh-tag"><TideIcon n="users" s={14} />Shared with you</span>
          <h1 className="atp-h1">{t.name || 'An Andaman plan'}</h1>
          <p className="atp-lead">{range} · {v.paxTxt}{t.guess ? ' · dates are a guess' : ''}</p>
          {routeTxt && <p className="atp-sh-route">{routeTxt}</p>}
          <div className="atp-tl is-total"><span>Total<small>{E.inr(Math.round(v.total / v.n))} a person, GST and fee included</small></span><b>{E.inr(v.total)}</b></div>
          <div className="atp-sh-acts">
            <button type="button" className="atp-btn is-action" onClick={use}>Open it in my planner</button>
            <a className="atp-btn is-outline" href={say(`About the Andaman plan (${range}): `)} target="_blank" rel="noopener noreferrer"><WaIcon s={22} />Reply on WhatsApp</a>
          </div>
          <p className="atp-fine">You are looking at a copy. Opening it in your planner lets you change anything and book it; {mine ? 'your own trip is kept in My trips.' : 'the sender’s plan stays as it is.'} Prices and seats are checked again then.</p>
        </div>
      </div>

      <div className="atp-vlist atp-sh-days">
        {dates.map((d) => {
          const day = v.lines.filter((x) => x.it.date === d).sort((a, b) => (a.at || '00:00').localeCompare(b.at || '00:00'));
          const cabs = day.filter((x) => x.it.kind === 'cab'); const rest = day.filter((x) => x.it.kind !== 'cab');
          return (
            <section key={d} className="atp-vday" aria-label={`Day ${dayNo(d)}, ${short(d)}`}>
              <h2 className="atp-vday-h"><b>Day {dayNo(d)}</b><span>{short(d)}</span>
                <a className="atp-sh-say" href={say(`About Day ${dayNo(d)} (${short(d)}) of the Andaman plan: `)} target="_blank" rel="noopener noreferrer"><WaIcon s={16} />Comment</a></h2>
              {(() => { const out: any[] = []; let cabDone = false;
                const cabRow = cabs.length > 0 && (
                  <div key="cabs" className="atp-vch"><div className="atp-vrow">
                    <span className="atp-tile k-cab"><TideIcon n="car" /></span>
                    <span className="atp-vt">{cabs[0].at}</span>
                    <span className="atp-vb"><b>Cab · {cabs.length} ride{cabs.length > 1 ? 's' : ''}</b><small>{cabs.length > 1 ? `First pickup ${cabs[0].at}, last ${cabs[cabs.length - 1].at}` : cabs[0].I.title}</small></span>
                    <span className="atp-vp">{E.inr(cabs.reduce((n, x) => n + (x.I.price || 0), 0))}</span>
                  </div></div>
                );
                rest.forEach(({ it, I, at }) => { const [tile, icon] = KIND[it.kind] || KIND.act;
                  if (cabRow && !cabDone && it.kind !== 'stay' && (at || '') >= cabs[0].at) { out.push(cabRow); cabDone = true; }
                  out.push(
                    <div key={it.uid} className="atp-vch"><div className="atp-vrow">
                      <span className={`atp-tile ${tile}`}><TideIcon n={icon} /></span>
                      <span className="atp-vt">{it.kind === 'stay' ? `${it.nights}N` : at}</span>
                      <span className="atp-vb"><b>{I.title}</b><small>{I.sub}</small></span>
                      <span className="atp-vp">{I.own ? 'Own' : I.price != null ? E.inr(I.price) : 'On request'}</span>
                    </div></div>); });
                if (cabRow && !cabDone) out.push(cabRow);
                return out; })()}
            </section>
          );
        })}
      </div>
      <section className="atp-cs">
        <AskWhatsApp withTrip={false} about="someone shared an Andaman plan with me and I have a question." lines={[`${range} · ${v.paxTxt}`, routeTxt, url]} label="Ask a planner about this plan" hint="We live in Port Blair. The plan goes with your message." />
      </section>
    </div>
  );
}
