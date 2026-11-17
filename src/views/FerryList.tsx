'use client';
import { Suspense, useState } from 'react';
import AddPanel from '@/components/AddPanel';
import { useEngine } from '@/engine/client';
import { Art, Ic } from '@/components/ui';

type Sailing = { id: string; op: string; to: string; dep: string; arr: string; gov: boolean; fare: number; cls: string; fromPt: string };
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/* Sailings come from the server (so the times and fares are in the page Google reads); the engine only adds the booking panel. */
export default function FerryList({ sails }: { sails: Sailing[] }) {
  const E = useEngine();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="lst">
      {sails.map((s) => {
        const id = s.id;
        return (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="lrow" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
              <span className="art">{E && <Art z={s.to} icon="ship" seed={id} />}</span>
              <span className="lb">
                <b>{s.dep} → {s.arr} · {s.op}</b>
                <small>{s.gov ? 'Government ship' : 'Private ferry'} · {s.cls} · from {s.fromPt}</small>
                <span className="price">{inr(s.fare)}<small style={{ display: 'inline', marginLeft: 6 }}>per person</small> <Ic n={open === id ? 'x' : 'plus'} s={14} /></span>
              </span>
            </button>
            {open === id && E && <Suspense><AddPanel kind="ferry" id={id} /></Suspense>}
          </div>
        );
      })}
    </div>
  );
}
