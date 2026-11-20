'use client';
/* A row of cards that scrolls sideways. On a phone you swipe; with a mouse there are arrows, which switch off at each end. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { TideIcon } from '@/components/Brand';

export default function Rail({ children, label, className = 'atp-rail3' }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<[boolean, boolean]>([true, false]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const on = () => setAt([el.scrollLeft < 8, el.scrollLeft + el.clientWidth > el.scrollWidth - 8]);
    on(); el.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { el.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [children]);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <div className="atp-railw">
      <div className={className} ref={ref} role="group" aria-label={label}>{children}</div>
      <button type="button" className="atp-railb is-prev" aria-label={`${label}: back`} disabled={at[0]} onClick={() => go(-1)}><TideIcon n="back" /></button>
      <button type="button" className="atp-railb is-next" aria-label={`${label}: more`} disabled={at[1]} onClick={() => go(1)}><TideIcon n="chev" /></button>
    </div>
  );
}
