'use client';
/* Loads the trip engine in the browser and lets React components re-render when it changes. */
import { useEffect, useSyncExternalStore } from 'react';

export type Engine = Record<string, any>;
let E: Engine | null = null;
let version = 0;
let loading: Promise<Engine> | null = null;
const subs = new Set<() => void>();
type Toast = { id: number; text: string; undo?: () => void };
let toastState: Toast | null = null;
const toastSubs = new Set<() => void>();

function notify() { version++; subs.forEach((f) => f()); }

/* Old engine actions move between screens by pushing onto S.stack. We turn that into a real page change. */
let navFn: ((v: any) => void) | null = null;
let lastTop = '';
export function registerNav(fn: (v: any) => void) { navFn = fn; }
function watchStack(m: Engine) {
  const st = m.S.stack || []; const top = st[st.length - 1]; const key = JSON.stringify(top || null);
  if (key !== lastTop) { lastTop = key; if (top && navFn) navFn(top); }
}

export function loadEngine(): Promise<Engine> {
  if (E) return Promise.resolve(E);
  if (!loading) {
    loading = (async () => {
      const data = (await import('@/data/catalogue.json')).default;
      (globalThis as any).__ATP_DATA__ = data;
      const m: Engine = await import('./core.js');
      try { m.load(); } catch {}
      try { m.applyPO(); } catch {}
      lastTop = JSON.stringify((m.S.stack || [])[(m.S.stack || []).length - 1] || null);
      m.__setRender(() => { try { m.save(); } catch {} watchStack(m); notify(); });
      m.__setToast((text: string) => showToast(text), (text: string) => showToast(text, () => dispatch('undo')));
      E = m;
      (window as any).__ATP__ = m; // handy for scripts/photo-map.mjs and debugging
      notify();
      return m;
    })();
  }
  return loading;
}

/** The engine once it is loaded (null on the first paint). Re-renders on every engine change. */
export function useEngine(): Engine | null {
  useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => version, () => -1);
  useEffect(() => { loadEngine(); }, []);
  return E;
}

/** Call after changing engine state from React: saves the trip and re-renders. */
export function commit() { try { E?.save(); } catch {} notify(); }

export function showToast(text: string, undo?: () => void) {
  toastState = { id: Date.now(), text, undo };
  toastSubs.forEach((f) => f());
  const id = toastState.id;
  setTimeout(() => { if (toastState && toastState.id === id) { toastState = null; toastSubs.forEach((f) => f()); } }, undo ? 5000 : 3200);
}
export function useToast(): Toast | null {
  return useSyncExternalStore((cb) => { toastSubs.add(cb); return () => { toastSubs.delete(cb); }; }, () => toastState, () => null);
}

/** Where an old-engine screen lives in the Next.js app. */
export function routeFor(v: any): string | null {
  if (!v || !v.v) return null;
  const q = (o: Record<string, any>) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, x]) => { if (x != null && x !== '') u.set(k, String(x)); }); const s = u.toString(); return s ? '?' + s : ''; };
  switch (v.v) {
    case 'home': return '/';
    case 'trip': return '/trip';
    case 'checkout': return '/checkout';
    case 'passes': case 'paid': return '/my-trips';
    case 'profile': return '/profile';
    case 'gen': return '/plan';
    case 'charter': return '/charters';
    case 'pkgs': return '/trips';
    case 'pkg': return `/trips/${v.id}`;
    case 'adv': return '/things-to-do' + q({ k: v.k });
    case 'search': return '/search';
    case 'route': return v.editUid ? '/trip/edit' + q({ uid: v.editUid }) : `/ferries/${String(v.from || 'PBL').toLowerCase()}-${String(v.to || 'HAV').toLowerCase()}` + q({ date: v.date });
    case 'store': return v.aisle === 'stay' ? '/stays' + q({ zone: v.zone, date: v.date }) : v.aisle === 'move' ? '/cabs' + q({ zone: v.zone, date: v.date }) : `/islands/${String(v.zone || 'HAV').toLowerCase()}` + q({ date: v.date });
    case 'product': if (v.uid) return '/trip/edit' + q({ uid: v.uid });
      return (v.kind === 'stay' ? `/stays/${String(v.id).toLowerCase()}` : v.kind === 'act' ? `/things-to-do/${String(v.id).toLowerCase()}` : v.kind === 'cab' ? `/cabs` : '/ferries') + q({ date: v.date, uid: v.uid });
    default: return null;
  }
}

/** Run one of the engine's named actions (the same ones its old buttons used), e.g. dispatch('pace', { k: 'relaxed' }). */
export function dispatch(a: string, data: Record<string, any> = {}) {
  if (typeof document === 'undefined') return;
  const b = document.createElement('button');
  b.hidden = true; b.setAttribute('data-a', a);
  Object.entries(data).forEach(([k, v]) => {
    if (v == null || v === '') return;
    b.setAttribute('data-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  document.body.appendChild(b); b.click(); b.remove();
}

/** Keep the engine's idea of "the current screen" in step with the URL, without navigating. */
export function syncStack(path: string, params: URLSearchParams) {
  if (!E) return;
  const seg = path.split('/').filter(Boolean);
  const p = (k: string) => params.get(k) || undefined;
  let v: any = { v: 'home' };
  if (seg[0] === 'trip') v = { v: 'trip' };
  else if (seg[0] === 'checkout') v = { v: 'checkout' };
  else if (seg[0] === 'my-trips') v = { v: 'passes' };
  else if (seg[0] === 'profile') v = { v: 'profile' };
  else if (seg[0] === 'plan') v = { v: 'gen' };
  else if (seg[0] === 'charters') v = { v: 'charter' };
  else if (seg[0] === 'trips') v = seg[1] ? { v: 'pkg', id: seg[1].toUpperCase() } : { v: 'pkgs' };
  else if (seg[0] === 'things-to-do') v = seg[1] ? { v: 'product', kind: 'act', id: seg[1].toUpperCase(), date: p('date') } : { v: 'adv', k: p('k') };
  else if (seg[0] === 'stays') v = seg[1] ? { v: 'product', kind: 'stay', id: seg[1].toUpperCase(), date: p('date') } : { v: 'store', zone: p('zone') || 'HAV', aisle: 'stay', date: p('date') };
  else if (seg[0] === 'cabs') v = { v: 'store', zone: p('zone') || 'PBL', aisle: 'move', date: p('date') };
  else if (seg[0] === 'ferries') v = { v: 'route', from: p('from') || 'PBL', to: p('to') || 'HAV', date: p('date') };
  else if (seg[0] === 'islands') v = { v: 'store', zone: (seg[1] || 'hav').toUpperCase(), aisle: 'do', date: p('date') };
  else if (seg[0] === 'search') v = { v: 'search' };
  const root = ['home', 'trip', 'passes', 'profile'].includes(v.v);
  E.S.stack = root ? [v] : [{ v: 'home' }, v];
  E.S.sheet = null;
  lastTop = JSON.stringify(v);
}
