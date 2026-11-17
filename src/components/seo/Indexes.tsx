/* Server-rendered lists shown until the trip engine loads in the browser (and what Google reads first).
   Same markup as the live lists, so nothing jumps when they swap. */
import { ACTS, HOTELS, ZN, actPhoto, hotelFrom, inr, slug } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';
import PhotoArt from './PhotoArt';

const score = (rt?: number | null, n?: number | null) => (rt || 0) * Math.log10((n || 1) + 1);

export function ActsIndex() {
  const list = ACTS.filter((a) => !/^ACV-(MEAL|SHOP)/.test(a.id)).sort((a, b) => score(b.g?.rt, b.g?.n) - score(a.g?.rt, a.g?.n)).slice(0, 80);
  return (
    <div className="wrap"><p className="note">{ACTS.length} to choose from</p>
      <div className="lst">{list.map((a) => (
        <a key={a.id} className="lrow" href={`/things-to-do/${slug(a.id)}`}>
          <span className="art"><PhotoArt id={actPhoto(a.id)} /></span>
          <span className="lb"><b>{a.n}</b><small>{ZN[a.z]?.name} · {a.v}</small><span className="price">{a.p ? `from ${inr(a.p)}` : 'On request'}{a.g?.rt ? <small style={{ display: 'inline', marginLeft: 8 }}>★ {a.g.rt} Google</small> : null}</span></span>
        </a>
      ))}</div>
    </div>
  );
}

export function StaysIndex() {
  const list = HOTELS.slice().sort((a, b) => score(b.rt, b.rv) - score(a.rt, a.rv));
  return (
    <div className="wrap"><p className="note">{list.length} stays · prices per night before GST</p>
      <div className="lst">{list.map((h) => (
        <a key={h.id} className="lrow noimg" href={`/stays/${slug(h.id)}`}>
          <span className="lb"><b>{h.n}</b><small>{ZN[h.z]?.name} · {h.t}{h.rt ? ` · ★ ${h.rt} Google` : ''}{h.rv ? ` (${h.rv.toLocaleString('en-IN')})` : ''}</small><span className="price">from {inr(hotelFrom(h))}</span></span>
        </a>
      ))}</div>
    </div>
  );
}

export type Pkg = { id: string; n: string; hi: string | null; tag: string; nights: number; tier: string; pax: number[]; hl: string[]; route: [string, number][]; total: number; bookings: number; days: { t: string; kind: string; title: string; sub: string; ref: string; zone: string }[][] };
export const PACKAGES = PKGS as unknown as Pkg[];
export const routeTxt = (p: Pkg) => p.route.map(([z, n]) => `${ZN[z]?.name} ${n}N`).join(' → ');
export const paxTxt = (p: Pkg) => { const [a, k] = p.pax; return `${a} adult${a > 1 ? 's' : ''}${k ? `, ${k} child${k > 1 ? 'ren' : ''}` : ''}`; };

export function TripsIndex() {
  return (
    <div className="wrap"><div className="lst">{PACKAGES.map((p) => (
      <a key={p.id} className="lrow noimg" href={`/trips/${slug(p.id)}`}>
        <span className="lb"><b>{p.n}</b><small>{p.nights} nights · {routeTxt(p)}{p.tag ? ` · ${p.tag}` : ''}</small><span className="price">{inr(p.total)}<small style={{ display: 'inline', marginLeft: 6 }}>for {paxTxt(p)}</small></span></span>
      </a>
    ))}</div></div>
  );
}
