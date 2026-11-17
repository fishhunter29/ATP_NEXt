'use client';
import { Suspense, useState } from 'react';
import AddPanel from '@/components/AddPanel';
import { useEngine } from '@/engine/client';
import { Art, Ic } from '@/components/ui';

export default function FerryList({ ids }: { ids: string[] }) {
  const E = useEngine();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="lst">
      {ids.map((id) => {
        const s = E ? E.SAIL[id] : null;
        return (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="lrow" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
              <span className="art">{E && <Art z={s.to} icon="ship" seed={id} />}</span>
              <span className="lb">
                <b>{s ? `${s.dep} → ${s.arr}` : '…'} · {s?.op}</b>
                <small>{s ? `${s.gov ? 'Government ship' : 'Private ferry'} · ${s.cls} · from ${s.fromPt}` : ''}</small>
                <span className="price">{s ? E!.inr(s.fare) : ''}<small style={{ display: 'inline', marginLeft: 6 }}>per person</small> <Ic n={open === id ? 'x' : 'plus'} s={14} /></span>
              </span>
            </button>
            {open === id && E && <Suspense><AddPanel kind="ferry" id={id} /></Suspense>}
          </div>
        );
      })}
    </div>
  );
}
