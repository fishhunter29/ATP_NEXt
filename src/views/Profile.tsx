'use client';
import { useRouter } from 'next/navigation';
import { commit, useEngine } from '@/engine/client';
import { Ic, Loading } from '@/components/ui';

export default function Profile() {
  const E = useEngine();
  const router = useRouter();
  if (!E) return <Loading />;
  const { S, D } = E;
  return (
    <div className="wrap"><div className="sec">
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}><Ic n="user" s={24} /></span>
        <div style={{ flex: 1 }}><b>{S.lead.name || 'Guest traveller'}</b><div className="muted" style={{ fontSize: 13 }}>{S.lead.phone || 'Sign in with your WhatsApp number (coming soon)'}</div></div>
      </div>
      <div className="eyebrow">Appearance</div>
      <div className="menu"><div><div><b>Theme</b><small>Day is the standard look</small></div></div>
        <div style={{ display: 'block' }}><div className="segm" role="group" aria-label="Theme">
          {[['light', 'Day'], ['dark', 'Night'], ['auto', 'Phone setting']].map(([k, l]) => <button key={k} aria-pressed={(S.theme === 'dark' || S.theme === 'auto' ? S.theme : 'light') === k} onClick={() => { S.theme = k; commit(); }}>{l}</button>)}
        </div></div></div>
      <div className="eyebrow">Try it out</div>
      <div className="menu">
        <button onClick={() => { E.sampleTrip(); S.booked = []; S.scans = {}; commit(); router.push('/trip'); }}><Ic n="trip" s={22} /><div><b>Load an example trip</b><small>6 days across Port Blair, Havelock and Neil, with a few things to fix</small></div></button>
        <button onClick={() => { S.cart = []; S.booked = []; S.win = null; S.fin = null; S.fout = null; S.scans = {}; commit(); router.push('/'); }}><Ic n="swap" s={22} /><div><b>Start over</b><small>Clears your trip, passes and dates</small></div></button>
      </div>
      <p className="note">Catalogue: {D.hotels.length} stays, {D.acts.filter(E.shown).length} things to do, {E.BOOKABLE.length} sailings, {D.routes.length} cab routes and {D.rentals.length} rentals. Prices are seasonal (Peak 15 Dec–15 Jan, Lean 16 May–30 Sep).</p>
    </div></div>
  );
}
