'use client';
/* Change or remove one booking in the trip (opened by tapping a card on the timeline). */
import { useRouter, useSearchParams } from 'next/navigation';
import AddPanel from '@/components/AddPanel';
import { useEngine } from '@/engine/client';
import { Art, Loading } from '@/components/ui';

export default function EditItem() {
  const E = useEngine(); const router = useRouter(); const uid = useSearchParams().get('uid') || '';
  if (!E) return <Loading />;
  const it = E.S.cart.find((x: any) => x.uid === uid);
  if (!it) return <div className="wrap"><div className="empty"><h2>That booking is no longer in your trip</h2><button className="btn primary" onClick={() => router.push('/trip')}>Back to my trip</button></div></div>;
  const I = E.info(it); const z = I.zone || (E.ACT[it.ref] || E.HOT[it.ref] || {}).z || 'PBL';
  return (
    <div className="wrap">
      <div className="pg-plain"><span className="eyebrow">{E.fD(it.date)}{it.t ? ' · ' + it.t : ''}</span><h1>{I.title}</h1><p className="muted">{I.sub}</p></div>
      {it.kind === 'act' && <div style={{ position: 'relative', height: 180, borderRadius: 18, overflow: 'hidden', marginBottom: 14 }} className="art"><Art z={z} seed={it.ref} big /></div>}
      <AddPanel kind={it.kind} id={it.ref} uid={uid} />
    </div>
  );
}
