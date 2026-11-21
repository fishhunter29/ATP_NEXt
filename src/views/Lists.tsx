'use client';
/* Search across things to do, stays and ready-made trips. Results stay in their groups, five at a time,
   with a link to the full list. The words typed are kept in the address (?q=), so Back returns to them. */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { TideIcon } from '@/components/Brand';
import { Row } from '@/components/browse/cards';
import AskWhatsApp from '@/components/AskWhatsApp';
import type { Item } from '@/lib/browse';

type Group = { k: string; n: string; href: string; items: Item[] };
const TRY = ['Scuba', 'Radhanagar', 'Sunset', 'Sea walk', 'Kayaking', 'Neil', 'Cellular Jail', 'Honeymoon'];

export function Search({ groups, isles }: { groups: Group[]; isles: Record<string, string> }) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { box.current?.focus(); }, []);
  useEffect(() => { const u = q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search'; if (location.pathname + location.search !== u) window.history.replaceState(window.history.state, '', u); }, [q]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const on = words.join('').length > 1;
  const found = on ? groups.map((g) => ({ g, hits: g.items.filter((x) => words.every((w) => x.q.includes(w))) })).filter((x) => x.hits.length) : [];
  const total = found.reduce((s, x) => s + x.hits.length, 0);
  return (
    <div className="atp-pg atp-srch">
      <div className="atp-ph"><h1>Search</h1></div>
      <div className="atp-pad">
        <label className="atp-bsearch">
          <TideIcon n="search" />
          <input ref={box} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Beaches, dives, hotels, trips…" aria-label="Search" enterKeyHint="search" autoComplete="off" />
          {q && <button type="button" className="atp-iconbtn" aria-label="Clear" onClick={() => { setQ(''); box.current?.focus(); }}><TideIcon n="x" s={18} /></button>}
        </label>
      </div>
      {!on && (
        <section className="atp-pad atp-srch-try">
          <div className="atp-sec">Try</div>
          <div className="atp-srch-chips">{TRY.map((t) => <button key={t} type="button" className="atp-chip2" onClick={() => setQ(t)}>{t}</button>)}</div>
          <div className="atp-sec">Or browse</div>
          <div className="atp-rows">
            {groups.map((g) => <Link key={g.k} className="atp-nrow" href={g.href} prefetch={false}><span className="atp-tile"><TideIcon n={g.k === 'stay' ? 'bed' : g.k === 'trip' ? 'map' : 'sunset'} /></span><span className="atp-vb"><b>{g.n}</b><small>{g.items.length} to choose from</small></span><TideIcon n="chev" s={16} /></Link>)}
            <Link className="atp-nrow" href="/ferries" prefetch={false}><span className="atp-tile k-boat"><TideIcon n="boat" /></span><span className="atp-vb"><b>Ferries</b><small>Every sailing between the islands</small></span><TideIcon n="chev" s={16} /></Link>
            <Link className="atp-nrow" href="/cabs" prefetch={false}><span className="atp-tile k-cab"><TideIcon n="car" /></span><span className="atp-vb"><b>Cabs</b><small>Airport, jetty and day rides</small></span><TideIcon n="chev" s={16} /></Link>
          </div>
        </section>
      )}
      {on && <p className="atp-fine atp-pad" role="status">{total ? `${total} result${total === 1 ? '' : 's'} for “${q.trim()}”` : `Nothing found for “${q.trim()}”. Try a place, an activity or a hotel name.`}</p>}
      {on && !total && <div className="atp-pad"><AskWhatsApp about={`I’m looking for “${q.trim()}” in the Andamans and could not find it on the site.`} label="Ask us on WhatsApp" hint="If it exists on the islands, we can arrange it." /></div>}
      {found.map(({ g, hits }) => (
        <section key={g.k} className="atp-srch-g" aria-label={g.n}>
          <h2 className="atp-srch-h"><span>{g.n}</span><small>{hits.length}</small></h2>
          {hits.slice(0, 5).map((it) => <Row key={it.id} it={it} isle={isles[it.z]} />)}
          {hits.length > 5 && <Link className="atp-srch-all" href={`${g.href}?q=${encodeURIComponent(q.trim())}`} prefetch={false}>See all {hits.length} in {g.n.toLowerCase()}<TideIcon n="chev" s={16} /></Link>}
        </section>
      ))}
    </div>
  );
}
