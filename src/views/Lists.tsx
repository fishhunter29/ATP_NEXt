'use client';
/* Search across things to do and stays. (The browse screens are in src/components/browse.) */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useEngine } from '@/engine/client';
import { Art, Loading } from '@/components/ui';

export function Search() {
  const E = useEngine(); const router = useRouter();
  const [q, setQ] = useState('');
  if (!E) return <Loading />;
  const s = q.trim().toLowerCase();
  const acts = s.length > 1 ? E.D.acts.filter((a: any) => E.shown(a) && (a.n + ' ' + a.v + ' ' + a.fam + ' ' + E.ZN[a.z].name).toLowerCase().includes(s)).slice(0, 30) : [];
  const stays = s.length > 1 ? E.D.hotels.filter((h: any) => (h.n + ' ' + E.ZN[h.z].name).toLowerCase().includes(s)).slice(0, 20) : [];
  return (
    <div className="wrap"><div className="pg-plain"><h1>Search</h1></div>
      <input className="srch" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search beaches, dives, hotels…" aria-label="Search" />
      <div className="lst" style={{ marginTop: 12 }}>
        {acts.map((a: any) => <button key={a.id} className="lrow" onClick={() => router.push(`/things-to-do/${a.id.toLowerCase()}`)}><span className="art"><Art z={a.z} seed={a.id} /></span><span className="lb"><b>{a.n}</b><small>{E.ZN[a.z].name} · {a.v}</small></span></button>)}
        {stays.map((h: any) => <button key={h.id} className="lrow noimg" onClick={() => router.push(`/stays/${h.id.toLowerCase()}`)}><span className="lb"><b>{h.n}</b><small>Stay · {E.ZN[h.z].name} · {h.t}</small></span></button>)}
        {s.length > 1 && !acts.length && !stays.length && <p className="note">Nothing found for “{q}”.</p>}
      </div>
    </div>
  );
}
