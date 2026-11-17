'use client';
/* Home: island photo, quick start, categories, planned trips and islands. */
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { commit, useEngine } from '@/engine/client';
import { Art, Ic, Loading, Photo, Section } from '@/components/ui';

const TILES = [
  { href: '/ferries', icon: 'ferry', title: 'Ferries', sub: 'Private and government boats', z: 'HAV', seed: 'SC:ferry' },
  { href: '/stays', icon: 'bed', title: 'Stays', sub: 'Simple rooms to beach resorts', z: 'HAV', seed: 'SC:stay' },
  { href: '/cabs', icon: 'car', title: 'Cabs & scooters', sub: 'Airport, jetty and sightseeing rides', z: 'PBL', seed: 'SC:move' },
  { href: '/things-to-do', icon: 'camera', title: 'Things to do', sub: 'Beaches, history, sunsets', z: 'HAV', seed: 'SC:do' },
  { href: '/trips', icon: 'trip', title: 'Planned trips', sub: 'Pick one, change anything', z: 'NEI', seed: 'SC:trip' },
  { href: '/things-to-do?k=scuba', icon: 'mask', title: 'Adventures', sub: 'Scuba, sea walk, kayaking', z: 'HAV', seed: 'SC:adv' },
];
const PILLS = [
  { href: '/ferries', icon: 'ferry', label: 'Ferries', k: 'route' },
  { href: '/stays', icon: 'bed', label: 'Stays', k: 'stay' },
  { href: '/cabs', icon: 'car', label: 'Cabs', k: 'move' },
  { href: '/things-to-do', icon: 'camera', label: 'Experiences', k: 'adv' },
  { href: '/trips', icon: 'trip', label: 'Tours', k: 'pkgs' },
];
const PILL_ATTR: Record<string, Record<string, string>> = { route: { 'data-v': 'route' }, stay: { 'data-go': 'stay' }, move: { 'data-go': 'move' }, adv: { 'data-v': 'adv' }, pkgs: { 'data-v': 'pkgs' } };

export default function Home() {
  const E = useEngine();
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  if (!E) return <Loading />;
  const { S, ZN, PKGS } = E;
  const clock = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).toLowerCase();
  const sample = () => { E.sampleTrip(); S.booked = []; S.scans = {}; S.vendorStatus = {}; commit(); router.push('/trip'); };
  const pkgs = PKGS.slice(0, 8);
  const datesLabel = S.win ? `${E.fD(S.win.start)} – ${E.fD(S.win.end)}` : 'When are you coming?';

  return (
    <>
      <section className="hero lx-hero" aria-label="Andaman Travel Planner">
        <svg className="hero-l hero-ph" data-tod="all" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ross & Smith Islands, Diglipur, joined by a sandbar"><image href="/img/f/i179.webp" width="1440" height="600" preserveAspectRatio="xMidYMid slice" /></svg>
        <span className="hero-phcap">Ross &amp; Smith Islands, Diglipur, joined by a sandbar</span>
        <div className="hero-in wrap">
          <span className="eyebrow"><i />Port Blair · {clock} · sunset 4:51 pm</span>
          <h1>The Andamans,<em>without the guesswork.</em></h1>
          <p>Ferries, rooms, cabs and things to do, in one plan. We check that it all connects before you pay.</p>
        </div>
      <div className="wrap starter lx-starter in-hero">
          <nav className="lx-entry" aria-label="Book one thing">
            {PILLS.map((p) => (
              <button key={p.k} {...PILL_ATTR[p.k]} onClick={() => router.push(p.href)}><Ic n={p.icon} s={18} /><span>{p.label}</span></button>
            ))}
          </nav>
          <div className="starter-card">
            <button className="st-f" onClick={() => router.push('/plan?step=dates')}>
              <span className="sti"><Ic n="cal" s={20} /></span>
              <span><small>Dates, flights and travellers</small><b className={S.win ? '' : 'ph'}>{datesLabel}</b></span>
            </button>
            <span className="st-sep" aria-hidden="true" />
            <button className="st-f wide" onClick={() => router.push('/search')}>
              <span className="sti"><Ic n="search" s={20} /></span>
              <span><small>Find</small><b className="ph">Search beaches, dives, hotels…</b></span>
            </button>
            <button className="btn primary" onClick={() => router.push('/plan')}>Plan my trip for me <Ic n="arrow" s={18} w={2.2} /></button>
          </div>
          <div className="st-alt">
            <span><Ic n="check" s={14} w={2.6} />Planning is free. Pay when you are sure</span>
            <span><Ic n="check" s={14} w={2.6} />Every ferry and check-in timed</span>
            <span><Ic n="check" s={14} w={2.6} />No surprise charges</span>
            {S.cart.length ? <button className="link" onClick={() => router.push('/trip')}>Continue my trip · {E.inr(E.total())}</button> : <button className="link" onClick={sample}>Show me an example trip</button>}
          </div>
        </div>
      </section>
      <div className="wrap">
        <Section title="Need one thing, or the whole trip?" sub="Add anything. We will show you what goes with it">
          <div className="shortcuts">
            {TILES.map((t) => (
              <button key={t.title} className="sc" onClick={() => router.push(t.href)}>
                <span className="art"><Art z={t.z} icon={t.icon} seed={t.seed} /></span>
                <b>{t.title}</b><small>{t.sub}</small>
              </button>
            ))}
          </div>
          <button className="lx-chtile" onClick={() => router.push('/charters')}>
            <span className="art"><Photo id="i179" /></span>
            <span className="lx-chtile-b"><em><Ic n="ferry" s={13} w={2.2} />BOAT CHARTERS</em><b>Hire a whole boat</b><small>Private boats, speedboats, fishing and sunset cruises</small></span>
            <span className="lx-chtile-go"><Ic n="arrow" s={18} w={2.2} /></span>
          </button>
        </Section>
        <Section title="Trips we have planned" action={<button className="link" onClick={() => router.push('/trips')}>See all {PKGS.length}</button>}>
          <p className="note" style={{ marginTop: -8 }}>Full trips from 2 to 11 nights. We have checked every ferry.</p>
          <div className="railwrap"><div className="pkgrail">{pkgs.map((p: any) => <PkgCard key={p.id} p={p} />)}</div></div>
        </Section>
        <Section title="Signature adventures" action={<button className="link" onClick={() => router.push('/things-to-do')}>See all</button>}>
          <p className="note" style={{ marginTop: -8 }}>The ones people fly in for. We time them around tides, ferries and daylight.</p>
          <div className="railwrap"><div className="sigrail">{E.SIGNATURE.map((id: string) => <SigCard key={id} id={id} />)}</div></div>
        </Section>
        <Section title="The islands" sub="Stays, cabs and things to do on each">
          <div className="lx-isles">
            {E.NS.map((x: string) => (
              <button key={x} className="lx-isle" style={{ ['--zc' as any]: E.ZC(x) }} onClick={() => router.push(`/islands/${x.toLowerCase()}`)}>
                <span className="art"><Art z={x} seed={x + 'hero'} /></span>
                <span className="lx-isle-b"><b>{ZN[x].name}</b><small>{E.ISLE_LINE[x] || ''}</small><em>{E.D.hotels.filter((h: any) => h.z === x).length} stays · {E.D.acts.filter((a: any) => a.z === x && E.shown(a)).length} experiences</em></span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Why trips booked here work">
          <div className="lx-how">
            {[['route', 'One itinerary', 'Start with a ferry, a hotel or a single dive. Add the rest as you go; everything sits on one timeline.'],
              ['check', 'Checked as you build', `Reporting times, travel between places, opening hours and seasons are tested against ${E.RULES.length} island rules on every change.`],
              ['spark', 'Completed for you', `Stays, ferries and door-to-door transfers are suggested first, then the days are filled the way ${E.EVD.n || 89} real Andaman itineraries run them.`]].map(([i, h, t]) => (
              <div key={h}><span className="n"><Ic n={i} s={20} w={1.9} /></span><b>{h}</b><p>{t}</p></div>
            ))}
          </div>
          <div className="facts3">
            {[[E.BOOKABLE.length, 'sailings from operator timetables'], [PKGS.length, 'ready-made tours'], [E.D.hotels.length, 'stays across ten islands']].map(([n, l]) => <div key={String(l)}><b>{n}</b><span>{l}</span></div>)}
          </div>
        </Section>
        <footer className="foot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '46ch' }}>
            <span className="brand"><span>Andaman<small>Travel Planner</small></span></span>
            <span>Ferries, stays, transfers and experiences across the Andaman Islands, booked as one itinerary.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="foot-l"><a href="/ferries">Ferries</a><a href="/trips">Planned trips</a><a href="/plan">Build my itinerary</a><a href="https://wa.me/" rel="nofollow">WhatsApp help</a></div>
            <span>© 2026 Andaman Travel Planner Private Limited · Sri Vijaya Puram (Port Blair)</span>
          </div>
        </footer>
      </div>
    </>
  );
}

export function PkgCard({ p, big }: { p: any; big?: boolean }) {
  const E = useEngine();
  const router = useRouter();
  if (!E) return null;
  const pr = E.pkgPreview(p);
  const segs: [string, number][] = E.route(p);
  return (
    <button className={`pkg${big ? ' big' : ''}`} style={{ ['--zc' as any]: E.ZC(p.z) }} onClick={() => router.push(`/trips/${p.id}`)}>
      <span className="art"><Art z={p.z} seed={p.id} /><span className="pk-n">{p.nights}N · {p.nights + 1}D</span><span className="pk-t">{p.tag}</span></span>
      <span className="pk-b">
        <b>{E.S.lang === 'hi' ? p.hi : p.n}</b>
        <span className="pk-r">{segs.map(([z, n], i) => <span key={i} style={{ display: 'contents' }}>{i > 0 && <span aria-hidden="true">→</span>}<i style={{ ['--zc' as any]: E.ZC(z) }}>{E.ZN[z].name} {n}N</i></span>)}</span>
        <span className="pk-h">{p.hl.slice(0, big ? 3 : 2).map((h: string) => <small key={h}><Ic n="check" s={13} w={2.6} /> {h}</small>)}</span>
        <span className="pk-f"><span><span className="price">{E.inr(pr.total)}</span><small>for {E.paxLabel(p)} · {E.inr(pr.pp)} / person</small></span><span className="go" aria-hidden="true"><Ic n="arrow" s={18} w={2.2} /></span></span>
      </span>
    </button>
  );
}

function SigCard({ id }: { id: string }) {
  const E = useEngine();
  const router = useRouter();
  if (!E) return null;
  const a = E.ACT[id]; if (!a) return null;
  const p = E.actUnit(a, E.baseDate()); const off = E.offSeason(a, E.baseDate());
  return (
    <button className="sig" style={{ ['--zc' as any]: E.ZC(a.z) }} onClick={() => router.push(`/things-to-do/${a.id.toLowerCase()}`)}>
      <span className="art"><Art z={a.z} seed={a.id} /></span>
      <span className="sig-b">
        <span className="tag" style={{ background: E.ZC(a.z), color: 'var(--on-zone)' }}>{E.ZN[a.z].name}</span>
        <b>{a.n}</b><small>{a.v}</small>
        <span className="sig-f"><span className="price">{p ? <><small>from</small> {E.inr(p)}</> : 'On request'}</span>{off && <span className="tag">{off}</span>}</span>
      </span>
    </button>
  );
}
