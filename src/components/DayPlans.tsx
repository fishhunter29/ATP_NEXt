'use client';
/* Half-day and full-day plans (v1 blocksRail): a few stops in the right order, sold as one plan.
   Rendered on the server from src/data/dayplans.json (Google reads it); a tap opens the day-plan sheet. */
import { useRef } from 'react';
import { dispatch, lang, loadEngine, useEngine } from '@/engine/client';
import { Ic } from '@/components/ui';
import PLANS from '@/data/dayplans.json';
import PhotoArt from '@/components/seo/PhotoArt';

type Plan = { id: string; z: string; ph: string; n: string; why: string; full: boolean; pp: number; stops: { id: string; n: string }[] };
const ZNAME: Record<string, string> = { PBL: 'Port Blair', HAV: 'Havelock', NEI: 'Neil', BAR: 'Baratang', RAN: 'Rangat', LON: 'Long Island', MAY: 'Mayabunder', DIG: 'Diglipur', LIT: 'Little Andaman' };
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function DayPlans({ zone, date }: { zone?: string; date?: string }) {
  const E = useEngine(); const rail = useRef<HTMLDivElement>(null); const L = lang(E);
  const list = (PLANS as Plan[]).filter((b) => !zone || b.z === zone);
  if (!list.length) return null;
  const open = (id: string) => loadEngine().then(() => dispatch('blk', { id, date }));
  const scroll = (d: number) => rail.current?.scrollBy({ left: d * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  const name = zone ? (E ? E.ZN[zone].name : ZNAME[zone] || zone) : '';
  return (
    <div className="sec dayplans">
      <div className="sechd"><h2>{zone ? L(`Day plans on ${name}`, `${name} पर दिन की योजनाएँ`) : L('Half-day and full-day plans', 'आधे दिन और पूरे दिन की योजनाएँ')}</h2><span className="sub">{list.length} {L('ready to add', 'जोड़ने को तैयार')}</span></div>
      <p className="note" style={{ marginTop: -8 }}>{L('A few stops in the right order, timed around travel and opening hours. Take the whole plan, or only the parts you like.', 'कुछ जगहें सही क्रम में, सफ़र और खुलने के समय के हिसाब से। पूरी योजना लें, या बस वे हिस्से जो पसंद हों।')}</p>
      <div className="railwrap">
        <button className="rail-btn prev" aria-label="Previous" onClick={() => scroll(-1)}><Ic n="back" s={20} w={2.4} /></button>
        <div className="pkgrail" ref={rail}>{list.map((b) => (
          <button key={b.id} className="pkg blkt" style={E ? { ['--zc' as any]: E.ZC(b.z) } : undefined} onClick={() => open(b.id)} aria-label={`${b.n}: ${L('see the plan', 'योजना देखें')}`}>
            <span className="art"><PhotoArt id={b.ph} /><span className="pk-n">{b.full ? L('Full day', 'पूरा दिन') : L('Half day', 'आधा दिन')}</span><span className="pk-t">{E ? E.ZN[b.z].name : ZNAME[b.z] || b.z}</span></span>
            <span className="pk-b"><b>{b.n}</b>
              <span className="pk-h">{b.stops.map((x, i) => <small key={x.id}><i className="num">{i + 1}</i>{x.n}</small>)}</span>
              <span className="pk-f"><span><span className="price">{inr(b.pp)}</span><small>{L(`per person · ${b.stops.length} bookings in one`, `प्रति व्यक्ति · एक में ${b.stops.length} बुकिंग`)}</small></span><span className="go" aria-hidden="true"><Ic n="arrow" s={18} w={2.2} /></span></span>
            </span>
          </button>
        ))}</div>
        <button className="rail-btn next" aria-label="Next" onClick={() => scroll(1)}><span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}><Ic n="back" s={20} w={2.4} /></span></button>
      </div>
    </div>
  );
}
