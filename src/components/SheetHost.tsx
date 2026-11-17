'use client';
/* Shows the open bottom sheet. Most are React components (components/sheets); the few not yet ported
   (day plan, planned-trip loader) still come from the engine and work through its actions. */
import { useEffect } from 'react';
import { useEngine } from '@/engine/client';
import { REACT_SHEETS } from './sheets/Sheets';

const LEGACY: Record<string, string> = { pkgload: 'pkgSheet', block: 'blockSheet' };

export default function SheetHost() {
  const E = useEngine();
  const k: string | null = E?.S.sheet || null;
  const R = k ? REACT_SHEETS[k] : null;
  let html = '';
  if (E && k && !R && LEGACY[k]) { try { html = E[LEGACY[k]]() || ''; } catch (e) { console.warn('sheet', k, e); } }
  useEffect(() => { if (!R) document.body.style.overflow = html ? 'hidden' : ''; }, [html, R]);
  if (!E || !k) return null;
  if (R) return <R E={E} />;
  if (!html) return null;
  return <div className="sheet-host" dangerouslySetInnerHTML={{ __html: html }} />;
}
