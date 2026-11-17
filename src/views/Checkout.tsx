'use client';
/* Checkout: lead traveller, how to pay, where the money goes. Payment is simulated until Razorpay is connected (see /api/payments). */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { commit, lang, useEngine } from '@/engine/client';
import { Ic, Loading } from '@/components/ui';

const PAYS = [['upi', 'UPI', 'Pay from any UPI app', 'UPI', 'किसी भी UPI ऐप से भुगतान'], ['card', 'Debit or credit card', 'Visa, Mastercard, RuPay', 'डेबिट या क्रेडिट कार्ड', 'Visa, Mastercard, RuPay'], ['nb', 'Netbanking', 'All major Indian banks', 'नेटबैंकिंग', 'सभी बड़े भारतीय बैंक']];

export default function Checkout() {
  const E = useEngine(); const tr = lang(E);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lead, setLead] = useState<{ name: string; phone: string; email: string } | null>(null);
  if (!E) return <Loading />;
  const { S } = E;
  const L = lead || S.lead || { name: '', phone: '', email: '' };
  if (busy) return <div className="wrap"><div className="empty"><div className="spin" /><h2>{tr('Confirming with partners…', 'पार्टनर से पुष्टि हो रही है…')}</h2><p>{tr('Sending each booking to its operator.', 'हर बुकिंग उसके ऑपरेटर को भेजी जा रही है।')}</p></div></div>;
  if (!S.cart.length) return <div className="wrap"><div className="empty"><h2>{tr('Nothing to pay for yet', 'अभी भुगतान के लिए कुछ नहीं')}</h2><p>{tr('Add something to your trip first.', 'पहले अपनी यात्रा में कुछ जोड़ें।')}</p><button className="btn primary" onClick={() => router.push('/')}>{tr('Start exploring', 'खोजना शुरू करें')}</button></div></div>;

  const groups: Record<string, { items: any[]; sum: number }> = {};
  S.cart.forEach((it: any) => { const I = E.info(it); if (I.own) return; const g = (groups[I.vendor] = groups[I.vendor] || { items: [], sum: 0 }); g.items.push({ it, I }); g.sum += I.price || 0; });
  const sub = E.subtotal(), gst = E.gstTotal(), tot = E.total(); const ferries = S.cart.filter((x: any) => x.kind === 'ferry' && !x.own).length;
  const set = (k: 'name' | 'phone' | 'email', v: string) => setLead({ ...L, [k]: v });
  const pay = () => {
    S.lead = { name: L.name.trim(), phone: L.phone.trim(), email: L.email.trim() };
    if (!E.checkLead()) { commit(); return; }
    E.bookAll(); setBusy(true); commit();
    setTimeout(() => { S.cart = []; S.win = null; commit(); router.push('/my-trips?paid=1'); }, 1400);
  };

  return (
    <>
      <div className="wrap"><div className="sec">
        <div className="steps" aria-label={tr('Checkout steps', 'चेकआउट के चरण')}><span className="done"><i><Ic n="check" s={14} w={3} /></i>{tr('Trip', 'यात्रा')}</span><hr /><span className="on"><i>2</i>{tr('Details & payment', 'जानकारी और भुगतान')}</span><hr /><span><i>3</i>{tr('My trips', 'मेरी यात्राएँ')}</span></div>
        <div className="co"><div className="co-main">
          <div className="card"><h3><span className="stepno">1</span>{tr('Lead traveller', 'मुख्य यात्री')}</h3><div className="form">
            <div className="field"><label htmlFor="ln">{tr('Full name (as on ID)', 'पूरा नाम (पहचान पत्र जैसा)')}</label><input id="ln" value={L.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Priya Sharma" autoComplete="name" /></div>
            <div className="two">
              <div className="field"><label htmlFor="lp">{tr('WhatsApp number', 'WhatsApp नंबर')}</label><input id="lp" value={L.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98xxx xxxxx" inputMode="tel" /></div>
              <div className="field"><label htmlFor="le">{tr('Email', 'ईमेल')}</label><input id="le" value={L.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" inputMode="email" /></div>
            </div>
            <p className="note">Passes and live updates come on WhatsApp.{ferries ? ' Ferry operators need each passenger’s name, age and ID for the manifest; we’ll ask for these right after payment.' : ''}</p>
          </div></div>
          <div className="card"><h3><span className="stepno">2</span>{tr('Pay with', 'भुगतान का तरीका')}</h3>
            {PAYS.map(([k, b, s, bh, sh]) => <button key={k} className="pay" aria-pressed={S.pay === k} onClick={() => { S.pay = k; commit(); }}><span className="rd" /><div><b>{tr(b, bh)}</b><small>{tr(s, sh)}</small></div></button>)}
          </div>
          <p className="note"><Ic n="shield" s={14} /> {tr('Prototype: no real payment is taken yet.', 'प्रोटोटाइप: अभी कोई असली भुगतान नहीं लिया जाता।')}</p>
        </div>
        <aside className="co-side">
          <div className="card"><h3><span className="stepno">3</span>{tr('Where your money goes', 'आपका पैसा कहाँ जाता है')}</h3><p className="note">{tr('One payment. Each partner is paid their share directly.', 'एक भुगतान। हर पार्टनर को उसका हिस्सा सीधे मिलता है।')}</p>
            <div className="split">
              {Object.entries(groups).map(([v, g]) => (
                <div key={v} style={{ display: 'contents' }}><span><b>{v}</b></span><span className="v">{g.sum ? E.inr(g.sum) : E.t('onReq')}</span>
                  <span className="sub">{g.items.map((x, i) => <span key={i}>{x.I.title.length > 34 ? x.I.title.slice(0, 32) + '…' : x.I.title} · {E.fD(x.it.date)}<br /></span>)}</span></div>
              ))}
              <span className="hr" /><span>{tr('Subtotal', 'उप-योग')}</span><span className="v">{E.inr(sub)}</span><span>GST</span><span className="v">{E.inr(gst)}</span>
              <span className="sub">{tr('5% on ferries, cabs and hotels up to ₹7,500 a night; 18% on activities and rentals; none on government fees.', 'फ़ेरी, कैब और ₹7,500 प्रति रात तक के होटल पर 5%; एक्टिविटी और किराये पर 18%; सरकारी शुल्क पर कुछ नहीं।')}</span>
              <span className="hr" /><span><b>{tr('Total', 'कुल')}</b></span><span className="v" style={{ font: '800 24px var(--f-display)' }}>{E.inr(tot)}</span>
              {E.onReq() > 0 && <span className="sub">{E.onReq()} item(s) confirmed by the partner before you’re charged</span>}
            </div>
            <button className="btn primary block co-paybtn" onClick={pay}>Pay {E.inr(tot)}</button>
          </div>
        </aside></div>
      </div></div>
      <div className="cta wrap abovenav co-cta">
        <span className="tot"><b>{E.inr(tot)}</b><small>{S.cart.length} item{S.cart.length === 1 ? '' : 's'} · incl. GST</small></span>
        <button className="btn primary" onClick={pay}>Pay {E.inr(tot)}</button>
      </div>
    </>
  );
}
