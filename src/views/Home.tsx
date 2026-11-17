'use client';
/* Home: island photo, quick start, categories, planned trips and islands. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { commit, lang, loadEngine, useEngine } from '@/engine/client';
import { Art, Ic, Loading, Photo, Section } from '@/components/ui';
import DayPlans from '@/components/DayPlans';

const TILES = [
  { href: '/ferries', icon: 'ferry', title: 'Ferries', sub: 'Private and government boats', hiT: 'फ़ेरी', hiS: 'सरकारी और प्राइवेट नावें', z: 'HAV', seed: 'SC:ferry' },
  { href: '/stays', icon: 'bed', title: 'Stays', sub: 'Simple rooms to beach resorts', hiT: 'ठहरने की जगह', hiS: 'साधारण कमरों से बीच रिज़ॉर्ट तक', z: 'HAV', seed: 'SC:stay' },
  { href: '/cabs', icon: 'car', title: 'Cabs & scooters', sub: 'Airport, jetty and sightseeing rides', hiT: 'कैब और स्कूटर', hiS: 'एयरपोर्ट, जेट्टी और घूमने की सवारी', z: 'PBL', seed: 'SC:move' },
  { href: '/things-to-do', icon: 'camera', title: 'Things to do', sub: 'Beaches, history, sunsets', hiT: 'घूमना-फिरना', hiS: 'बीच, इतिहास, सूर्यास्त', z: 'HAV', seed: 'SC:do' },
  { href: '/trips', icon: 'trip', title: 'Planned trips', sub: 'Pick one, change anything', hiT: 'तैयार यात्राएँ', hiS: 'एक चुनें, कुछ भी बदलें', z: 'NEI', seed: 'SC:trip' },
  { href: '/things-to-do?k=scuba', icon: 'mask', title: 'Adventures', sub: 'Scuba, sea walk, kayaking', hiT: 'एडवेंचर', hiS: 'डाइव, सी वॉक, कयाक', z: 'HAV', seed: 'SC:adv' },
];
const PILLS = [
  { href: '/ferries', icon: 'ferry', label: 'Ferries', hi: 'फ़ेरी', k: 'route' },
  { href: '/stays', icon: 'bed', label: 'Stays', hi: 'होटल', k: 'stay' },
  { href: '/cabs', icon: 'car', label: 'Cabs', hi: 'कैब', k: 'move' },
  { href: '/things-to-do', icon: 'camera', label: 'Experiences', hi: 'अनुभव', k: 'adv' },
  { href: '/trips', icon: 'trip', label: 'Tours', hi: 'टूर', k: 'pkgs' },
];
const PILL_ATTR: Record<string, Record<string, string>> = { route: { 'data-v': 'route' }, stay: { 'data-go': 'stay' }, move: { 'data-go': 'move' }, adv: { 'data-v': 'adv' }, pkgs: { 'data-v': 'pkgs' } };

export default function Home() {
  const E = useEngine();
  const router = useRouter();
  /* the hero renders on the server (Google reads it); the clock and anything from the engine fill in on the phone */
  const [clock, setClock] = useState('');
  useEffect(() => { setClock(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).toLowerCase()); }, []);
  const S = E?.S; const L = lang(E);
  // the hero is on screen before the engine loads, so a quick tap waits for it instead of doing nothing
  const sample = async () => { const M = E || await loadEngine(); M.sampleTrip(); M.S.booked = []; M.S.scans = {}; M.S.vendorStatus = {}; commit(); router.push('/trip'); };
  const datesLabel = E && S.win ? `${E.fD(S.win.start)} – ${E.fD(S.win.end)}` : L('When are you coming?', 'आप कब आ रहे हैं?');

  return (
    <>
      <section className="hero lx-hero" aria-label="Andaman Travel Planner">
        <svg className="hero-l hero-ph" data-tod="all" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ross & Smith Islands, Diglipur, joined by a sandbar"><image href="/img/f/i179.webp" width="1440" height="600" preserveAspectRatio="xMidYMid slice" /></svg>
        <span className="hero-phcap">Ross &amp; Smith Islands, Diglipur, joined by a sandbar</span>
        <div className="hero-in wrap">
          <span className="eyebrow"><i />{L('Port Blair', 'पोर्ट ब्लेयर')}{clock ? ` · ${clock}` : ''} · {L('sunset', 'सूर्यास्त')} 4:51 pm</span>
          <h1>{L('The Andamans,', 'अंडमान,')}<em>{L('without the guesswork.', 'शुरू से अंत तक व्यवस्थित.')}</em></h1>
          <p>{L('Ferries, rooms, cabs and things to do, in one plan. We check that it all connects before you pay.', 'फ़ेरी, होटल, कैब और घूमना-फिरना, एक ही योजना में। भुगतान से पहले हम हर कनेक्शन की जाँच करते हैं।')}</p>
        </div>
      <div className="wrap starter lx-starter in-hero">
          <nav className="lx-entry" aria-label="Book one thing">
            {PILLS.map((p) => (
              <Link key={p.k} {...PILL_ATTR[p.k]} href={p.href} prefetch={false}><Ic n={p.icon} s={18} /><span>{L(p.label, p.hi)}</span></Link>
            ))}
          </nav>
          <div className="starter-card">
            <button className="st-f" onClick={() => router.push('/plan?step=dates')}>
              <span className="sti"><Ic n="cal" s={20} /></span>
              <span><small>{L('Dates, flights and travellers', 'तारीखें, उड़ान और यात्री')}</small><b className={S?.win ? '' : 'ph'}>{datesLabel}</b></span>
            </button>
            <span className="st-sep" aria-hidden="true" />
            <button className="st-f wide" onClick={() => router.push('/search')}>
              <span className="sti"><Ic n="search" s={20} /></span>
              <span><small>{L('Find', 'खोजें')}</small><b className="ph">{L('Search beaches, dives, hotels…', 'बीच, डाइव, होटल खोजें…')}</b></span>
            </button>
            <Link className="btn primary" href="/plan" prefetch={false}>{L('Plan my trip for me', 'मेरी यात्रा बनाएँ')} <Ic n="arrow" s={18} w={2.2} /></Link>
          </div>
          <div className="st-alt">
            <span><Ic n="check" s={14} w={2.6} />{L('Planning is free. Pay when you are sure', 'योजना बनाना मुफ़्त। पक्का होने पर भुगतान करें')}</span>
            <span><Ic n="check" s={14} w={2.6} />{L('Every ferry and check-in timed', 'हर फ़ेरी और चेक-इन का समय तय')}</span>
            <span><Ic n="check" s={14} w={2.6} />{L('No surprise charges', 'कोई छिपा शुल्क नहीं')}</span>
            {E && S.cart.length ? <Link className="link" href="/trip">{L('Continue my trip', 'मेरी यात्रा जारी रखें')} · {E.inr(E.total())}</Link> : <button className="link" onClick={sample}>{L('Show me an example trip', 'नमूना यात्रा देखें')}</button>}
          </div>
        </div>
      </section>
      {/* before the engine loads, the day plans still render (they come from the server data), so Google reads them */}
      {E ? <HomeBody E={E} /> : <><div className="wrap"><DayPlans /></div><Loading /></>}
    </>
  );
}

function HomeBody({ E }: { E: any }) {
  const { ZN, PKGS } = E; const pkgs = PKGS.slice(0, 8); const L = lang(E);
  return (
    <>
      <div className="wrap">
        <Section title={L('Need one thing, or the whole trip?', 'आपको क्या चाहिए: एक चीज़ या पूरी यात्रा?')} sub={L('Add anything. We will show you what goes with it', 'कुछ भी जोड़ें। हम बताएँगे उसके साथ क्या जाता है')}>
          <div className="shortcuts">
            {TILES.map((t) => (
              <Link key={t.title} className="sc" href={t.href} prefetch={false}>
                <span className="art"><Art z={t.z} icon={t.icon} seed={t.seed} /></span>
                <b>{L(t.title, t.hiT)}</b><small>{L(t.sub, t.hiS)}</small>
              </Link>
            ))}
          </div>
          <Link className="lx-chtile" href="/charters" prefetch={false}>
            <span className="art"><Photo id="i179" /></span>
            <span className="lx-chtile-b"><em><Ic n="ferry" s={13} w={2.2} />{L('BOAT CHARTERS', 'बोट चार्टर')}</em><b>{L('Hire a whole boat', 'पूरी नाव किराए पर लें')}</b><small>{L('Private boats, speedboats, fishing and sunset cruises', 'प्राइवेट नाव, स्पीडबोट, मछली पकड़ना और सूर्यास्त क्रूज़')}</small></span>
            <span className="lx-chtile-go"><Ic n="arrow" s={18} w={2.2} /></span>
          </Link>
        </Section>
        <DayPlans />
        <Section title={L('Trips we have planned', 'तैयार टूर')} action={<Link className="link" href="/trips">{L('See all', 'सभी देखें')} {PKGS.length}</Link>}>
          <p className="note" style={{ marginTop: -8 }}>{L('Full trips from 2 to 11 nights. We have checked every ferry.', '2 से 11 रातों की पूरी यात्राएँ। हर फ़ेरी की जाँच हो चुकी है।')}</p>
          <div className="railwrap"><div className="pkgrail">{pkgs.map((p: any) => <PkgCard key={p.id} p={p} />)}</div></div>
        </Section>
        <Section title={L('Signature adventures', 'ज़िंदगी में एक बार')} action={<Link className="link" href="/things-to-do">{L('See all', 'सभी देखें')}</Link>}>
          <p className="note" style={{ marginTop: -8 }}>{L('The ones people fly in for. We time them around tides, ferries and daylight.', 'जिनके लिए लोग यहाँ आते हैं। हम इन्हें ज्वार, फ़ेरी और दिन की रोशनी के हिसाब से रखते हैं।')}</p>
          <div className="railwrap"><div className="sigrail">{E.SIGNATURE.map((id: string) => <SigCard key={id} id={id} />)}</div></div>
        </Section>
        <Section title={L('The islands', 'द्वीप')} sub={L('Stays, cabs and things to do on each', 'हर द्वीप पर होटल, कैब और घूमना-फिरना')}>
          <div className="lx-isles">
            {E.NS.map((x: string) => (
              <Link key={x} className="lx-isle" style={{ ['--zc' as any]: E.ZC(x) }} href={`/islands/${x.toLowerCase()}`} prefetch={false}>
                <span className="art"><Art z={x} seed={x + 'hero'} /></span>
                <span className="lx-isle-b"><b>{ZN[x].name}</b><small>{E.ISLE_LINE[x] || ''}</small><em>{E.D.hotels.filter((h: any) => h.z === x).length} {L('stays', 'होटल')} · {E.D.acts.filter((a: any) => a.z === x && E.shown(a)).length} {L('experiences', 'अनुभव')}</em></span>
              </Link>
            ))}
          </div>
        </Section>
        <Section title={L('Why trips booked here work', 'यहाँ बुक की गई यात्राएँ क्यों चलती हैं')}>
          <div className="lx-how">
            {[['route', L('One itinerary', 'एक ही योजना'), L('Start with a ferry, a hotel or a single dive. Add the rest as you go; everything sits on one timeline.', 'फ़ेरी, होटल या एक डाइव से शुरू करें। बाकी धीरे-धीरे जोड़ें; सब एक ही समय-रेखा पर रहता है।')],
              ['check', L('Checked as you build', 'बनाते समय ही जाँच'), L(`Reporting times, travel between places, opening hours and seasons are tested against ${E.RULES.length} island rules on every change.`, `रिपोर्टिंग समय, जगहों के बीच का सफ़र, खुलने का समय और मौसम: हर बदलाव पर ${E.RULES.length} द्वीप नियमों से जाँच।`)],
              ['spark', L('Completed for you', 'आपके लिए पूरा'), L(`Stays, ferries and door-to-door transfers are suggested first, then the days are filled the way ${E.EVD.n || 89} real Andaman itineraries run them.`, `पहले होटल, फ़ेरी और घर-से-घर तक की सवारी सुझाई जाती है, फिर दिन वैसे भरे जाते हैं जैसे ${E.EVD.n || 89} असली अंडमान यात्राओं में होते हैं।`)]].map(([i, h, t]) => (
              <div key={h}><span className="n"><Ic n={i} s={20} w={1.9} /></span><b>{h}</b><p>{t}</p></div>
            ))}
          </div>
          <div className="facts3">
            {[[E.BOOKABLE.length, L('sailings from operator timetables', 'फ़ेरी, ऑपरेटर की समय-सारणी से')], [PKGS.length, L('ready-made tours', 'तैयार टूर')], [E.D.hotels.length, L('stays across ten islands', 'दस द्वीपों पर होटल')]].map(([n, l]) => <div key={String(l)}><b>{n}</b><span>{l}</span></div>)}
          </div>
        </Section>
      </div>
    </>
  );
}

export function PkgCard({ p, big }: { p: any; big?: boolean }) {
  const E = useEngine();
  if (!E) return null;
  const pr = E.pkgPreview(p);
  const segs: [string, number][] = E.route(p);
  return (
    <Link className={`pkg${big ? ' big' : ''}`} style={{ ['--zc' as any]: E.ZC(p.z) }} href={`/trips/${p.id.toLowerCase()}`} prefetch={false}>
      <span className="art"><Art z={p.z} seed={p.id} /><span className="pk-n">{p.nights}N · {p.nights + 1}D</span><span className="pk-t">{p.tag}</span></span>
      <span className="pk-b">
        <b>{E.S.lang === 'hi' ? p.hi : p.n}</b>
        <span className="pk-r">{segs.map(([z, n], i) => <span key={i} style={{ display: 'contents' }}>{i > 0 && <span aria-hidden="true">→</span>}<i style={{ ['--zc' as any]: E.ZC(z) }}>{E.ZN[z].name} {n}N</i></span>)}</span>
        <span className="pk-h">{p.hl.slice(0, big ? 3 : 2).map((h: string) => <small key={h}><Ic n="check" s={13} w={2.6} /> {h}</small>)}</span>
        <span className="pk-f"><span><span className="price">{E.inr(pr.total)}</span><small>{E.S.lang === 'hi' ? `${E.paxLabel(p)} के लिए · ${E.inr(pr.pp)} / व्यक्ति` : `for ${E.paxLabel(p)} · ${E.inr(pr.pp)} / person`}</small></span><span className="go" aria-hidden="true"><Ic n="arrow" s={18} w={2.2} /></span></span>
      </span>
    </Link>
  );
}

function SigCard({ id }: { id: string }) {
  const E = useEngine();
  if (!E) return null;
  const a = E.ACT[id]; if (!a) return null;
  const p = E.actUnit(a, E.baseDate()); const off = E.offSeason(a, E.baseDate());
  return (
    <Link className="sig" style={{ ['--zc' as any]: E.ZC(a.z) }} href={`/things-to-do/${a.id.toLowerCase()}`} prefetch={false}>
      <span className="art"><Art z={a.z} seed={a.id} /></span>
      <span className="sig-b">
        <span className="tag" style={{ background: E.ZC(a.z), color: 'var(--on-zone)' }}>{E.ZN[a.z].name}</span>
        <b>{a.n}</b><small>{a.v}</small>
        <span className="sig-f"><span className="price">{p ? <><small>{E.S.lang === 'hi' ? 'से शुरू' : 'from'}</small> {E.inr(p)}</> : E.t('onReq')}</span>{off && <span className="tag">{off}</span>}</span>
      </span>
    </Link>
  );
}
