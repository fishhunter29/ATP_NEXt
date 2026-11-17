'use client';
/* App frame: top bar, bottom tabs, toast. Theme and language live in the engine state (saved on the phone). */
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
import { commit, lang, loadEngine, registerNav, routeFor, syncStack, useEngine, useToast } from '@/engine/client';
import { Ic, Raw } from './ui';
import SheetHost from './SheetHost';

const TABS = [
  { href: '/', label: 'Explore', hi: 'देखें', icon: 'explore' },
  { href: '/trip', label: 'Trip', hi: 'यात्रा', icon: 'trip' },
  { href: '/my-trips', label: 'My trips', hi: 'मेरी यात्राएँ', icon: 'ticket' },
  { href: '/profile', label: 'Profile', hi: 'प्रोफ़ाइल', icon: 'user' },
];

function useTheme(theme: string | undefined) {
  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme !== 'light' && !window.matchMedia('(prefers-color-scheme: light)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
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
  useTheme(S?.theme);
  useEffect(() => { registerNav((v) => { const r = routeFor(v); if (r && r.split('?')[0] !== window.location.pathname) router.push(r); }); }, [router]);
  useEffect(() => { document.documentElement.lang = S?.lang === 'hi' ? 'hi' : 'en'; }, [S?.lang]);

  const isRoot = TABS.some((t) => t.href === path);
  const over = path === '/';
  // a tab is active on its own page and the pages under it: /trip and /trip/edit, but not /trips
  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  // the header shows before the engine loads; an early tap waits for it rather than being lost
  const setLang = async (l: string) => { const M = E || await loadEngine(); M.S.lang = l; commit(); };
  const cycleTheme = async () => {
    const M = E || await loadEngine();
    const cur = document.documentElement.dataset.theme;
    M.S.theme = cur === 'light' ? 'dark' : 'light';
    commit();
  };
  const n = S ? S.cart.length : 0;

  return (
    <div className="app" data-tod="day">
      <Suspense fallback={null}><StackSync E={E} /></Suspense>
      {E && <Raw html={E.artDefs()} as="div" aria-hidden style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} />}
      <header className={`top${over ? ' over' : ''}`}>
        <div className="topin wrap">
          {!isRoot && (
            <button className="iconbtn back" aria-label="Back" style={{ marginLeft: -8 }} onClick={() => router.back()}><Ic n="back" s={22} w={2.2} /></button>
          )}
          <Link className="brand" href="/" aria-label="Andaman Travel Planner, home" prefetch={false}>
            <svg className="logo" width="36" height="36" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#F75940" /><circle cx="20" cy="18" r="8.5" fill="#FFD166" /><path d="M0 24q5 -5 10 0t10 0 10 0 10 0v16H0z" fill="#FFFFFF" /><path d="M0 31q5 -5 10 0t10 0 10 0 10 0v9H0z" fill="#FFC9BD" /></svg>
            <span>Andaman<small>Travel Planner</small></span>
          </Link>
          <span className="topttl" />
          <nav className="dnav" aria-label="Main">
            {TABS.map((t) => <Link key={t.href} href={t.href} prefetch={false} aria-current={active(t.href) ? 'page' : undefined}>{L(t.label, t.hi)}{t.href === '/trip' && n > 0 && <span className="badge">{n}</span>}</Link>)}
          </nav>
          <div className="tools">
            <div className="lang" role="group" aria-label="Language">
              <button aria-pressed={S?.lang !== 'hi'} onClick={() => setLang('en')}>EN</button>
              <button aria-pressed={S?.lang === 'hi'} onClick={() => setLang('hi')}>हिं</button>
            </div>
            <button className="iconbtn" aria-label="Switch between light and dark" onClick={cycleTheme}>
              <Ic n="theme" s={20} w={1.8} />
            </button>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      {path !== '/checkout' && footer}
      <nav className="nav" aria-label="Main">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} prefetch={false} aria-current={active(t.href) ? 'page' : undefined}>
            <Ic n={t.icon} s={22} />
            <span>{L(t.label, t.hi)}</span>
            {t.href === '/trip' && n > 0 && <span className="badge">{n}</span>}
            {t.href === '/my-trips' && S && S.booked.length > 0 && <span className="badge">{S.booked.length}</span>}
          </Link>
        ))}
      </nav>
      <SheetHost />
      {toast && (
        <div className="toast" role="status">{toast.undo ? <><span>{toast.text}</span><button onClick={() => { const u = toast.undo; u && u(); }}>{L('Undo', 'वापस लें')}</button></> : toast.text}</div>
      )}
    </div>
  );
}
