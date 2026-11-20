'use client';
/* The browse screen for things to do, stays and ready-made trips. Never one long list: an island (or trip length)
   switch, a search field, category tiles, one short row per category, and "See all" for a sorted list.
   Every choice lives in the address (?island=hav&cat=scuba&sort=price), so Back works and a link can be shared. */
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import type { Cat, Isle, Item } from '@/lib/browse';
import { TideIcon } from '@/components/Brand';
import { Card, Row, inr } from './cards';
import Rail from './Rail';

export type Kind = 'act' | 'stay' | 'trip';
export type BrowseProps = { kind: Kind; items: Item[]; cats: Cat[]; isles: Isle[] };
type St = { z: string; c: string; s: string; q: string; len: string; date: string };
const DEF: St = { z: 'all', c: '', s: '', q: '', len: 'all', date: '' };

const KIND = {
  act: { all: 'All things to do', find: 'Search scuba, kayaking, beaches…', top: 'Most loved', none: 'Nothing here with that word. Try another island.', empty: 'Nothing to book here yet.',
    sorts: [['', 'Popular'], ['price', 'Lowest price'], ['short', 'Shortest']] },
  stay: { all: 'All stays', find: 'Search a stay by name or beach', top: 'Top rated', none: 'No stay with that name here. Try another island.', empty: 'No stays to book here yet. Most people visit on a day trip from Port Blair.',
    sorts: [['', 'Top rated'], ['price', 'Lowest price'], ['high', 'Highest price']] },
  trip: { all: 'All trips', find: 'Search a place or an activity', top: '', none: 'Nothing yet. Try Havelock, scuba or Baratang.', empty: 'No trips of this length here. Try another length.',
    sorts: [['', 'Popular'], ['price', 'Lowest price'], ['short', 'Shortest'], ['long', 'Longest']] },
} as const;
const LENS: [string, string, (n: number) => boolean][] = [['all', 'Any length', () => true], ['short', '2–4 nights', (n) => n <= 4], ['mid', '5–6 nights', (n) => n === 5 || n === 6], ['long', '7+ nights', (n) => n >= 7]];
const price = (x: Item) => (x.p == null ? Infinity : x.p);

function sorted(list: Item[], s: string) {
  const out = list.slice();
  if (s === 'price') out.sort((a, b) => price(a) - price(b));
  else if (s === 'high') out.sort((a, b) => (b.p || 0) - (a.p || 0));
  else if (s === 'short') out.sort((a, b) => (a.d || 1e9) - (b.d || 1e9) || price(a) - price(b));
  else if (s === 'long') out.sort((a, b) => b.d - a.d);
  return out;
}

export function BrowseView({ kind, items, cats, isles, st, set }: BrowseProps & { st: St; set: (p: Partial<St>, push?: boolean) => void }) {
  const K = KIND[kind]; const byIsle = kind !== 'trip';
  const zn: Record<string, string> = Object.fromEntries(isles.map((i) => [i.id, i.n]));
  const lenOk = LENS.find((l) => l[0] === st.len)?.[2] || LENS[0][2];
  const pool = items.filter((x) => (byIsle ? st.z === 'all' || x.z === st.z : lenOk(x.d)));
  const link = st.date ? `?date=${st.date}` : '';
  const isleOf = (x: Item) => (byIsle && st.z === 'all' ? zn[x.z] : undefined);
  const where = byIsle && st.z !== 'all' ? ` on ${zn[st.z]}` : '';
  const q = st.q.trim().toLowerCase();
  const cat = cats.find((c) => c.k === st.c);

  let body;
  if (q) {
    const hits = pool.filter((x) => x.q.includes(q));
    body = (
      <>
        <p className="atp-fine atp-pad" role="status">{hits.length} result{hits.length === 1 ? '' : 's'}{where} for “{st.q.trim()}”</p>
        {hits.length ? <div className="atp-rows">{hits.slice(0, 60).map((x) => <Row key={x.id} it={x} isle={isleOf(x)} q={link} />)}</div> : <p className="atp-empty">{K.none}</p>}
      </>
    );
  } else if (cat) {
    const list = sorted(pool.filter((x) => x.cs.includes(cat.k)), st.s);
    body = (
      <>
        <div className="atp-foc">
          <button type="button" className="atp-btn is-text" onClick={() => set({ c: '', s: '' }, true)}><TideIcon n="back" s={16} />{K.all}</button>
          <h2>{cat.n}{where}<small>{list.length}</small></h2>
        </div>
        <div className="atp-listbar" role="group" aria-label="Sort">
          <span className="atp-listbar-i"><TideIcon n="sort" s={16} /></span>
          {K.sorts.map(([k, n]) => <button key={k} type="button" className="atp-chip2" aria-pressed={st.s === k} onClick={() => set({ s: k })}>{n}</button>)}
        </div>
        {list.length ? <div className="atp-rows">{list.map((x) => <Row key={x.id} it={x} isle={isleOf(x)} q={link} />)}</div> : <p className="atp-empty">{K.empty}</p>}
      </>
    );
  } else if (!pool.length) {
    body = <p className="atp-empty">{K.empty}</p>;
  } else {
    const groups = cats.map((c) => ({ c, list: pool.filter((x) => x.cs.includes(c.k)) })).filter((g) => g.list.length);
    const tiles = groups.filter((g) => g.c.k !== 'picks').slice(0, 8);
    /* the opening row: for stays the best rated; for things to do the best of each kind in turn, so it is never eight beaches */
    const top = kind === 'stay' ? pool.filter((x) => (x.rt || 0) >= 4.3).slice(0, 8)
      : kind === 'act' ? [0, 1].flatMap((i) => groups.map((g) => g.list[i]).filter(Boolean)).sort((a, b) => b.s - a.s).slice(0, 8) : [];
    body = (
      <>
        <div className="atp-cats" role="group" aria-label="Categories">
          {tiles.map(({ c, list }) => (
            <button key={c.k} type="button" className="atp-cat" onClick={() => set({ c: c.k, s: '' }, true)}>
              <TideIcon n={c.icon} s={22} /><b>{c.n}</b>
              <small>{list.length}{kind === 'stay' && <><br />{inr(Math.min(...list.map(price)))}+</>}</small>
            </button>
          ))}
        </div>
        {top.length > 2 && (
          <section className="atp-bsec">
            <div className="atp-bsec-h"><h2>{K.top}{where}</h2></div>
            <Rail label={K.top}>{top.map((x, i) => <Card key={x.id} it={x} isle={isleOf(x)} q={link} eager={i < 2} />)}</Rail>
          </section>
        )}
        {groups.map(({ c, list }, gi) => (
          <section key={c.k} className="atp-bsec">
            <div className="atp-bsec-h"><h2>{c.n}<small>{list.length}</small></h2>
              {list.length > 3 && <button type="button" className="atp-btn is-text" aria-label={`See all ${list.length}: ${c.n}`} onClick={() => set({ c: c.k, s: '' }, true)}>See all</button>}</div>
            <Rail label={c.n}>
              {list.slice(0, 8).map((x) => <Card key={x.id} it={x} isle={isleOf(x)} q={link} wide={kind === 'trip' && gi === 0} notag={!(kind === 'trip' && gi === 0)} />)}
              {list.length > 8 && <button type="button" className="atp-bc atp-more" onClick={() => set({ c: c.k, s: '' }, true)}><b>See all {list.length}</b><small>{c.n}</small><TideIcon n="arrow" /></button>}
            </Rail>
          </section>
        ))}
      </>
    );
  }

  const count = (z: string) => items.filter((x) => z === 'all' || x.z === z).length;
  return (
    <div className="atp-br">
      <div className="atp-bbar">
        <label className="atp-bsearch">
          <TideIcon n="search" />
          <input type="search" value={st.q} placeholder={K.find} aria-label={K.find} enterKeyHint="search" onChange={(e) => set({ q: e.target.value })} />
          {st.q && <button type="button" className="atp-iconbtn" aria-label="Clear search" onClick={() => set({ q: '' })}><TideIcon n="x" s={18} /></button>}
        </label>
        <div className="atp-seg2" role="group" aria-label={byIsle ? 'Island' : 'Trip length'}>
          {byIsle
            ? [{ id: 'all', n: 'All islands' }, ...isles.filter((i) => count(i.id))].map((i) => <button key={i.id} type="button" aria-pressed={st.z === i.id} onClick={() => set({ z: i.id })}>{i.n}<small>{count(i.id)}</small></button>)
            : LENS.map(([k, n, ok]) => <button key={k} type="button" aria-pressed={st.len === k} onClick={() => set({ len: k })}>{n}<small>{items.filter((x) => ok(x.d)).length}</small></button>)}
        </div>
      </div>
      {body}
    </div>
  );
}

/** What the server sends (and Google reads): the first view, before any choice is made. */
export function BrowseStatic(props: BrowseProps) { return <BrowseView {...props} st={DEF} set={() => {}} />; }

export default function Browse(props: BrowseProps) {
  const params = useSearchParams(); const path = usePathname();
  const zones = props.isles.map((i) => i.id);
  const z = (params.get('island') || params.get('zone') || 'all').toUpperCase();
  const c = params.get('cat') || (params.get('k') === 'scuba' ? 'scuba' : '');
  const st: St = { z: zones.includes(z) ? z : 'all', c: props.cats.some((x) => x.k === c) ? c : '', s: params.get('sort') || '', q: params.get('q') || '', len: params.get('len') || 'all', date: params.get('date') || '' };
  const key = `${st.z}|${st.c}|${st.len}`;
  /* where the page was scrolled to before "See all", so Back lands on the same row */
  const pos = useRef(new Map<string, number>()); const cur = useRef(st); cur.current = st;
  const set = useCallback((p: Partial<St>, push?: boolean) => {
    const n = { ...cur.current, ...p }; const u = new URLSearchParams();
    if (n.z !== 'all') u.set('island', n.z.toLowerCase()); if (n.c) u.set('cat', n.c); if (n.s) u.set('sort', n.s); if (n.len !== 'all') u.set('len', n.len); if (n.q) u.set('q', n.q); if (n.date) u.set('date', n.date);
    const url = path + (u.toString() ? '?' + u.toString() : '');
    if (push) { pos.current.set(`${cur.current.z}|${cur.current.c}|${cur.current.len}`, window.scrollY); window.history.pushState(null, '', url); window.scrollTo(0, 0); } else window.history.replaceState(null, '', url);
  }, [path]);
  const popped = useRef(false);
  useEffect(() => { const on = () => { popped.current = true; }; window.addEventListener('popstate', on); return () => window.removeEventListener('popstate', on); }, []);
  useEffect(() => { const y = pos.current.get(key); if (popped.current && y != null) window.scrollTo(0, y); popped.current = false; }, [key]);
  return <BrowseView {...props} st={st} set={set} />;
}
