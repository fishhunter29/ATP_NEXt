'use client';
/* On wide screens the footer's link lists are columns, always open. They are <details> so phones can fold them;
   this opens them once the page is on a wide screen (CSS already shows them where the browser allows it). */
import { useEffect } from 'react';

export default function FootOpen() {
  useEffect(() => {
    const mq = matchMedia('(min-width: 1024px)');
    const set = () => document.querySelectorAll<HTMLDetailsElement>('details.af-col').forEach((d) => { d.open = mq.matches; });
    set(); mq.addEventListener('change', set); return () => mq.removeEventListener('change', set);
  }, []);
  return null;
}
