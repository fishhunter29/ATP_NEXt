'use client';
/* Boat charters: every private boat, speedboat, fishing boat, cruise and volcano trip (canvas "Boat charters page"). */
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useEngine } from '@/engine/client';
import { Art, Ic, Loading } from '@/components/ui';

export default function Charters({ fallback }: { fallback?: ReactNode }) {
  const E = useEngine(); const router = useRouter();
  const [fk, setFk] = useState('all'); const [fz, setFz] = useState('all');
  if (!E) return <>{fallback ?? <Loading />}</>;
  const G: any[] = E.chList(); const all = G.reduce((s, g) => s + g.l.length, 0);
  const zones: string[] = [...new Set<string>(G.flatMap((g) => g.l.map((a: any) => a.z)))];
  const secs = G.filter((g) => fk === 'all' || g.k === fk).map((g) => ({ ...g, l: g.l.filter((a: any) => fz === 'all' || a.z === fz) })).filter((g) => g.l.length);
  return (
    <>
      <div className="chhero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Boats moored off a white-sand beach in the Andaman Islands" src="/img/f/i120.webp" />
        <div className="wrap"><span className="eyebrow">Boat charters · {all} boats</span><h1>The sea, on your clock</h1><p>Whole boats, private speedboats, fishing and sunset cruises. Pick a boat, we fit it into your trip.</p></div>
      </div>
      <div className="wrap"><div className="sec" style={{ paddingTop: 14 }}>
        <div className="chips"><button className="chip" aria-pressed={fk === 'all'} onClick={() => setFk('all')}>All {all}</button>{G.map((g) => <button key={g.k} className="chip" aria-pressed={fk === g.k} onClick={() => setFk(g.k)}>{g.n} {g.l.length}</button>)}</div>
        <div className="chips" style={{ marginTop: 8 }}><button className="chip" aria-pressed={fz === 'all'} onClick={() => setFz('all')}>Any island</button>{zones.map((z) => <button key={z} className="chip" aria-pressed={fz === z} onClick={() => setFz(z)}>{E.ZN[z].name}</button>)}</div>
        {secs.length ? secs.map((g) => (
          <section key={g.k} className="chsec"><div className="sechd"><h2>{g.n}</h2><span className="muted" style={{ fontSize: 13 }}>{g.s}</span></div>
            <div className="chgrid">{g.l.map((a: any) => { const p = E.actUnit(a, E.baseDate()); const cap = E.chCap(a); const per = a.b === 'per_boat' ? '/ boat' : a.b === 'per_group' ? '/ group' : '/ person'; const from = String(a.site || '').split('->')[0].trim() || E.ZN[a.z].name; const pp = a.b === 'per_boat' && cap && p ? `${E.inr(Math.round(p / cap))} a person if ${cap} go` : ''; const go = () => router.push(`/things-to-do/${a.id.toLowerCase()}`); return (
              <article key={a.id} className="chc">
                <button className="chc-ph" onClick={go} aria-label={`${a.n}, details`}><Art z={a.z} icon="boat" seed={a.id} big /><em className="tc-badge"><Ic n="ferry" s={12} w={2.2} />{E.CH_BADGE[g.k] || 'BOAT'}</em><span className="tc-ttl"><b>{a.n}</b><small>{a.v}</small></span></button>
                <div className="chc-b">
                  <div className="chc-g"><span><small>UP TO</small><b className="m">{cap || '—'}</b></span><span><small>TIME</small><b className="m">{String(E.durOf(a) || '—').replace(/ hrs?/, 'H').replace(/ min/, 'M')}</b></span><span className="w"><small>FROM</small><b>{from}</b></span></div>
                  <div className="chc-f"><span className="chc-p"><b>{p ? E.inr(p) : 'On request'}<small> {p ? per : ''}</small></b>{pp && <em>{pp}</em>}</span><button className="btn primary sm" onClick={go}><Ic n="plus" s={15} w={2.6} /> Pick a time</button></div>
                </div>
              </article>
            ); })}</div>
          </section>
        )) : <p className="note">No boats for that island in this group. Try “Any island”.</p>}
        <p className="note">Private boats are priced for the whole boat. Sea and weather permitting; our Port Blair team confirms the slot with the boat owner.</p>
      </div></div>
    </>
  );
}
