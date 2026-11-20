'use client';
/* App frame (Tide): header with the DPIIT line, four-tab dock, toast. Theme and language are chosen in Profile
   and live in the engine state (saved on the phone). */
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
import { commit, lang, registerNav, routeFor, syncStack, useEngine, useToast } from '@/engine/client';
import { DPIIT_LINE } from '@/lib/company';
import { Logo, TideIcon } from './Brand';
import { Raw } from './ui';
import SheetHost from './SheetHost';

const TABS = [
  { href: '/', label: 'Explore', hi: 'देखें', icon: 'explore' },
  { href: '/trip', label: 'Trip', hi: 'यात्रा', icon: 'trip' },
  { href: '/my-trips', label: 'My trips', hi: 'मेरी यात्राएँ', icon: 'ticket' },
  { href: '/profile', label: 'Profile', hi: 'प्रोफ़ाइल', icon: 'user' },
];

/* Day is the default. Night ('dark'), or following the phone ('auto'), is a choice made in Profile.
   The engine's own starting value, 'system', was never a choice, so it counts as Day. */
function useTheme(theme: string | undefined, ready: boolean) {
  useEffect(() => {
    if (!ready) return; // until the saved choice is known, keep what the page started with
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'dark' || (theme === 'auto' && mq.matches) ? 'dark' : 'light'; };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme, ready]);
}

/* Kept in its own Suspense: reading the query string must not stop the page itself from rendering on the server
   (Google reads that HTML). */
function StackSync({ E }: { E: any }) {
  const path = usePathname(); const params = useSearchParams();
  useEffect(() => { if (E) syncStack(path, new URLSearchParams(params.toString())); }, [E, path, params]);
  return null;
}

export default function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const E = useEngine();
  const path = usePathname();
  const router = useRouter();
  const toast = useToast();
  const S = E?.S; const L = lang(E);
  useTheme(S?.theme, !!E);
  useEffect(() => { registerNav((v) => { const r = routeFor(v); if (r && r.split('?')[0] !== window.location.pathname) router.push(r); }); }, [router]);
  /* the site is in English; a phone that once chose Hindi is brought back, since the switch is gone */
  useEffect(() => { if (S && S.lang !== 'en') { S.lang = 'en'; commit(); } }, [S, S?.lang]);

  const isRoot = TABS.some((t) => t.href === path);
  // a tab is active on its own page and the pages under it: /trip and /trip/edit, but not /trips
  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  const n = S ? S.cart.length : 0;

  return (
    <div className="app" data-tod="day">
      <Suspense fallback={null}><StackSync E={E} /></Suspense>
      {E && <Raw html={E.artDefs()} as="div" aria-hidden style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} />}
      <header className="atp-brandbar">
        <div className={`atp-brandin${isRoot ? '' : ' has-back'}`}>
          {!isRoot && (
            <button type="button" className="atp-iconbtn atp-back" aria-label={L('Back', 'पीछे')} onClick={() => router.back()}><TideIcon n="back" s={22} /></button>
          )}
          <Link className="atp-brandl" href="/" prefetch={false}>
            <Logo />
            <span className="atp-brandn"><b>Andaman Travel Planner</b><span className="atp-dpiit">{DPIIT_LINE}</span></span>
          </Link>
          <nav className="dnav" aria-label="Main">
            {TABS.map((t) => <Link key={t.href} href={t.href} prefetch={false} aria-current={active(t.href) ? 'page' : undefined}>{L(t.label, t.hi)}{t.href === '/trip' && n > 0 && <span className="atp-count">{n}</span>}</Link>)}
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      {path !== '/checkout' && footer}
      <nav className="atp-dock" aria-label="Main">
        <div className="atp-tabs">
          {TABS.map((t) => (
            <Link key={t.href} className="atp-tab" href={t.href} prefetch={false} aria-current={active(t.href) ? 'page' : undefined}>
              <TideIcon n={t.icon} />
              <span>{L(t.label, t.hi)}</span>
              {t.href === '/trip' && n > 0 && <span className="atp-count">{n}</span>}
              {t.href === '/my-trips' && S && S.booked.length > 0 && <span className="atp-count">{S.booked.length}</span>}
            </Link>
          ))}
        </div>
      </nav>
      <SheetHost />
      {toast && (
        <div className="toast" role="status">{toast.undo ? <><span>{toast.text}</span><button onClick={() => { const u = toast.undo; u && u(); }}>{L('Undo', 'वापस लें')}</button></> : toast.text}</div>
      )}
    </div>
  );
}
