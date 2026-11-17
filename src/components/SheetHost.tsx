'use client';
/* Bottom sheets that still come from the engine (dates & flights, price breakdown, fix menu, move/swap, help).
   They are scheduled to become React components in stage 2; their buttons already work through the engine. */
import { useEffect } from 'react';
import { useEngine } from '@/engine/client';

const MAP: Record<string, string> = { pkgload: 'pkgSheet', dates: 'datesSheet', help: 'helpSheet', breakdown: 'breakdownSheet', fixmenu: 'fixMenuSheet', autofix: 'autoFixSheet', ferryadded: 'ferryAddedSheet', block: 'blockSheet', move: 'moveSheet' };

export default function SheetHost() {
  const E = useEngine();
  const k = E?.S.sheet;
  const fn = k && MAP[k] && E ? E[MAP[k]] : null;
  let html = '';
  if (fn) { try { html = fn() || ''; } catch (e) { console.warn('sheet', k, e); } }
  useEffect(() => { document.body.style.overflow = html ? 'hidden' : ''; }, [html]);
  if (!html) return null;
  return <div className="sheet-host" dangerouslySetInnerHTML={{ __html: html }} />;
}
