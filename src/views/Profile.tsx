'use client';
/* Profile: who the traveller is (if they have booked), their trips, the look of the site and a short tour.
   Contact, policies and company details live in the site footer just below. No sign-in yet: the trip lives in this browser, and the page says so plainly. */
import { useRouter } from 'next/navigation';
import { commit, useEngine } from '@/engine/client';
import { Ic, Loading } from '@/components/ui';

export default function Profile() {
  const E = useEngine();
  const router = useRouter();
  if (!E) return <Loading />;
  const { S } = E;
  const lead = S.lead || {};
  const hasTrip = !!(S.cart && S.cart.length);
  const hasAny = hasTrip || !!(S.booked && S.booked.length);
  const theme = S.theme === 'dark' || S.theme === 'auto' ? S.theme : 'light';
  return (
    <div className="wrap"><div className="sec">
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 48, height: 48, flex: 'none', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}><Ic n="user" s={24} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ font: 'inherit', fontWeight: 700, margin: 0 }}>{lead.name || 'Welcome'}</h1>
          <div className="muted" style={{ fontSize: 13 }}>{lead.phone || 'No account needed. Your plan stays saved in this browser.'}</div>
        </div>
      </div>

      <div className="eyebrow">Your trips</div>
      <div className="menu">
        <button onClick={() => router.push('/trip')}><Ic n="trip" s={22} /><div><b>{hasTrip ? 'Your plan' : 'Plan a trip'}</b><small>{hasTrip ? `${S.cart.length} thing${S.cart.length > 1 ? 's' : ''} added so far` : 'Stays, ferries, cabs and things to do'}</small></div></button>
        <button onClick={() => router.push('/my-trips')}><Ic n="ticket" s={22} /><div><b>Bookings</b><small>Ferry passes, stays and booking codes</small></div></button>
      </div>

      <div className="eyebrow">Appearance</div>
      <div className="menu"><div style={{ display: 'block' }}><div className="segm" role="group" aria-label="Theme">
        {[['light', 'Day'], ['dark', 'Night'], ['auto', 'Auto']].map(([k, l]) => <button key={k} aria-pressed={theme === k} onClick={() => { S.theme = k; commit(); }}>{l}</button>)}
      </div></div></div>

      <div className="menu" style={{ marginTop: 24 }}>
        <button onClick={() => router.push('/?tour=1')}><Ic n="explore" s={22} /><div><b>How the site works</b><small>A one-minute tour</small></div></button>
      </div>

      {hasAny && (
        <div className="menu" style={{ marginTop: 12 }}>
          <button onClick={() => { if (!window.confirm('Clear your plan, passes and dates from this browser?')) return; S.cart = []; S.booked = []; S.win = null; S.fin = null; S.fout = null; S.scans = {}; commit(); router.push('/'); }}><Ic n="swap" s={22} /><div><b>Clear my plan</b><small>Start a fresh trip on this browser</small></div></button>
        </div>
      )}
    </div></div>
  );
}
