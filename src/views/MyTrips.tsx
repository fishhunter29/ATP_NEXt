'use client';
/* My trips: every pass (QR) after payment, saved on the phone and readable offline; plus saved itineraries. */
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { commit, useEngine } from '@/engine/client';
import { Art, Ic, Loading, Raw } from '@/components/ui';

export default function MyTrips() {
  const E = useEngine();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  if (!E) return <Loading />;
  const { S } = E;
  const saved: any[] = S.trips || [];
  const paid = params.get('paid') === '1';

  if (open) {
    const p = S.booked.find((x: any) => x.code === open);
    if (p) return (
      <div className="wrap"><div className="sec" style={{ alignItems: 'stretch' }}>
        <button className="link" onClick={() => setOpen(null)}>← All passes</button>
        {S.offline && <div className="offline"><Ic n="wifioff" s={18} /> No network. This pass still works.</div>}
        <div className="pass" style={{ cursor: 'default' }}>
          <div className="band" style={{ ['--zc' as any]: E.ZC(p.zone) }}><b>{p.title}</b><span className="mono" style={{ fontSize: 12 }}>{E.fD(p.date)}</span></div>
          <div style={{ padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}><Raw className="bigqr" as="div" html={E.qr(p.code, 29)} /><div className="mono" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '.08em' }}>{p.code}</div></div>
          <div className="pf" style={{ flexDirection: 'column', gap: 6 }}><div className="kv" style={{ width: '100%' }}>
            <div><small>When</small><b>{E.fD(p.date)} · {p.time}</b></div><div><small>Report</small><b>{p.report}</b></div><div><small>Travellers</small><b>{p.pax}</b></div><div><small>Partner</small><b>{p.vendor}</b></div>{p.seats && <div><small>Seats</small><b>{p.seats}</b></div>}
          </div></div>
        </div>
        <p className="note"><Ic n="shield" s={14} /> The code is signed when you pay, so staff can check it on their phone without internet. Turn up brightness at the gate.</p>
      </div></div>
    );
  }

  const list = S.booked.slice().sort((a: any, b: any) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  let last: string | null = null;
  return (
    <div className="wrap"><div className="sec">
      {paid && <div className="health ok"><span className="hi"><Ic n="check" s={18} w={2.6} /></span><span><b>Paid and confirmed</b>Your {S.booked.length} passes are saved on this phone and work offline.</span></div>}
      {saved.length > 0 && (
        <>
          <div className="sechd"><h2>Saved itineraries</h2><span className="sub">{saved.length} on this phone</span></div>
          <div className="menu">{saved.map((t: any) => (
            <button key={t.id} onClick={() => { E.openTrip ? E.openTrip(t.id) : null; commit(); router.push('/trip'); }}><Ic n="trip" s={22} /><div><b>{t.name || 'My trip'}</b><small>{t.cart ? `${t.cart.length} items` : ''}{t.saved ? ` · saved ${new Date(t.saved).toLocaleDateString('en-IN')}` : ''}</small></div></button>
          ))}</div>
        </>
      )}
      <div className="sechd"><h2>My trips</h2><span className="sub">{list.length ? `${list.length} passes saved offline` : 'Passes appear here after payment'}</span></div>
      {!list.length ? (
        <div className="empty"><span className="art"><Art z="PBL" icon="ferry" seed="SAIL-001" /></span><h2>No passes yet</h2><p>After payment, every ferry, stay, transfer and activity receives its own QR pass, saved on your phone.</p><button className="btn primary" onClick={() => router.push('/trip')}>Go to my trip <Ic n="arrow" s={18} w={2.2} /></button></div>
      ) : (
        <>
          <button className="offline" role="switch" aria-checked={!!S.offline} style={{ width: '100%', textAlign: 'left' }} onClick={() => { S.offline = !S.offline; commit(); }}><Ic n="wifioff" s={18} /><span style={{ flex: 1 }}>{S.offline ? 'No network. Passes still open and scan.' : 'Try it: switch off the network'}</span><span className="toggle" aria-hidden="true" /></button>
          <div className="passgrid">
            {list.map((p: any) => { const head = p.date !== last ? <div className="eyebrow" style={{ marginTop: 8, gridColumn: '1/-1' }}>{E.fD(p.date)}</div> : null; last = p.date; const used = S.scans[p.code]; return (
              <div key={p.code} style={{ display: 'contents' }}>{head}
                <button className="pass" onClick={() => setOpen(p.code)}>
                  <div className="band" style={{ ['--zc' as any]: E.ZC(p.zone) }}><b>{E.ZN[p.zone].name}{p.to ? ' → ' + E.ZN[p.to].name : ''}</b><span className="mono" style={{ fontSize: 12 }}>{p.time}</span></div>
                  <div className="pb"><div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}><h3>{p.title}</h3><span className="muted" style={{ fontSize: 12.5 }}>{p.sub}</span><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="tag ok"><Ic n="check" s={11} w={2.6} /> Works offline</span>{used && <span className="tag">Used {used}</span>}</span></div><Raw className="qr" html={E.qr(p.code, 21)} /></div>
                  <div className="pf"><span>{p.report}</span><span className="mono">{p.code}</span></div>
                </button></div>
            ); })}
          </div>
        </>
      )}
    </div></div>
  );
}
