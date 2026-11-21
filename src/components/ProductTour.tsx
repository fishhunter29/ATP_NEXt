'use client';
/* First-visit tour. Mounted once in the root layout; renders nothing itself.

   Starts on its own only when all of these hold:
   - this is Home ("/"), opened plainly (no ?query or #hash, so links into a booking or a shared trip never get it);
   - the tour has not been finished or skipped at this version (localStorage TOUR_KEY);
   - there is no trip in progress on this phone (someone with a trip is not new here);
   - about a second after the page has settled, with no sheet open and nobody typing.
   "Take the tour" (TourLink) replays it at any time: on Home straight away, elsewhere by going to /?tour=1.
   The tour code (Driver.js) is loaded only when a tour actually starts. */
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { TOUR_KEY } from '@/lib/tour/steps';

const REPLAY = 'atp:tour';

function read(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function write(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} }

function hasTrip() { try { const o = JSON.parse(localStorage.getItem('atp_v6') || 'null'); return !!(o && Array.isArray(o.cart) && o.cart.length); } catch { return false; } }

/** Something on screen the tour must not cover: an open sheet or dialog, or a field being typed in. */
function busy() {
  if (document.querySelector('[aria-modal="true"]:not(.driver-popover), dialog[open]')) return true;
  const a = document.activeElement as HTMLElement | null;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
}

let loaded = false;
async function start() {
  loaded = true;
  const { runTour, tourActive } = await import('@/lib/tour/run');
  if (tourActive()) return;
  runTour({ onEnd: (how) => write(TOUR_KEY, how) });
}

export default function ProductTour() {
  const path = usePathname();

  useEffect(() => {
    if (path !== '/') return;
    const q = new URLSearchParams(location.search);
    const asked = q.get('tour') === '1';
    if (asked) { q.delete('tour'); const rest = q.toString(); try { history.replaceState(history.state, '', location.pathname + (rest ? `?${rest}` : '') + location.hash); } catch {} }
    else if (read(TOUR_KEY) || location.search || location.hash || hasTrip()) return;

    let off = false, timer: ReturnType<typeof setTimeout> | undefined, tries = 0;
    const attempt = () => {
      if (off) return;
      if (busy() && tries++ < 20) { timer = setTimeout(attempt, 1000); return; }
      if (!busy()) start();
    };
    const settled = () => {
      const idle = (window as any).requestIdleCallback as undefined | ((f: () => void, o?: any) => number);
      const later = () => { timer = setTimeout(attempt, asked ? 300 : 1000); };
      if (idle) idle(later, { timeout: 1500 }); else later();
    };
    /* settled = loaded, or 3 seconds at most on a slow connection (photos still coming in) */
    let once = false; const go = () => { if (once || off) return; once = true; clearTimeout(cap); settled(); };
    const cap = setTimeout(go, 3000);
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    return () => { off = true; clearTimeout(timer); clearTimeout(cap); window.removeEventListener('load', go); };
  }, [path]);

  /* replay from "Take the tour" while already on Home */
  useEffect(() => { const h = () => { start(); }; window.addEventListener(REPLAY, h); return () => window.removeEventListener(REPLAY, h); }, []);

  /* leaving Home ends the tour */
  useEffect(() => { if (path === '/' || !loaded) return; import('@/lib/tour/run').then((m) => { if (m.tourActive()) m.stopTour(); }).catch(() => {}); }, [path]);

  return null;
}

/** "Take the tour". On Home it starts the tour in place; anywhere else it goes to Home and starts it there. */
export function TourLink({ className, children }: { className?: string; children?: ReactNode }) {
  const path = usePathname(); const router = useRouter();
  return (
    <a href="/?tour=1" rel="nofollow" className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (path === '/') { window.scrollTo({ top: 0 }); window.dispatchEvent(new Event(REPLAY)); } else router.push('/?tour=1');
      }}>
      {children ?? 'Take the tour'}
    </a>
  );
}
