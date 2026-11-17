'use client';
/* Shows the open bottom sheet. Every sheet is a React component (components/sheets); S.sheet names it. */
import { useEngine } from '@/engine/client';
import { REACT_SHEETS } from './sheets/Sheets';

export default function SheetHost() {
  const E = useEngine();
  const k: string | null = E?.S.sheet || null;
  const R = k ? REACT_SHEETS[k] : null;
  if (!E || !R) return null;
  return <R E={E} />;
}
