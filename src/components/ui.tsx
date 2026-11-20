'use client';
/* Small building blocks shared by every screen. Icons and photo art come from the engine as SVG text. */
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { useEngine } from '@/engine/client';

type RawProps = { html: string; as?: 'span' | 'div'; className?: string; style?: CSSProperties; 'aria-hidden'?: boolean };
export function Raw({ html, as = 'span', className, style, ...rest }: RawProps) {
  const Tag = as as any;
  return <Tag className={className} style={style} {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** One line icon from the app's icon set. */
export function Ic({ n, s = 18, w = 2 }: { n: string; s?: number; w?: number }) {
  const E = useEngine();
  if (!E) return <span style={{ display: 'inline-block', width: s, height: s }} aria-hidden="true" />;
  return <Raw html={E.ic(n, s, w)} style={{ display: 'contents' }} aria-hidden />;
}

/* Photos inside the engine's SVG art load only when they come near the screen. */
let io: IntersectionObserver | null = null;
function reveal(svg: Element) {
  const im = svg.querySelector('image[data-src]');
  if (im) {
    let src = String(im.getAttribute('data-src')).replace(/^img\//, '/img/');
    // thumbnails are 560 px wide: wherever the photo shows bigger than that on this screen, load the full-size one so it stays sharp
    const w = (svg as SVGElement).getBoundingClientRect().width * (window.devicePixelRatio || 1);
    if (w > 520) src = src.replace('/img/t/', '/img/f/');
    im.setAttribute('href', src); im.removeAttribute('data-src');
  }
  svg.setAttribute('data-on', '1');
}
function observe(svg: Element) {
  if (typeof IntersectionObserver !== 'function') return reveal(svg);
  if (!io) io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io!.unobserve(e.target); reveal(e.target); } }), { rootMargin: '300px 300px' });
  io.observe(svg);
}

/** A photo (or illustrated scene) for a place or product. `big` loads the full-size photo. */
export function Art({ z, icon, seed, big, className }: { z: string; icon?: string; seed?: string; big?: boolean; className?: string }) {
  const E = useEngine();
  const ref = useRef<HTMLSpanElement>(null);
  let html: string = E ? E.art(z, icon, seed) || '' : '';
  if (big) html = html.replace(/img\/t\//g, 'img/f/');
  useEffect(() => { ref.current?.querySelectorAll('svg.ph,svg[data-k]').forEach(observe); }, [html]);
  /* The same object while the markup is the same: React 19 writes innerHTML again whenever this object is new,
     which threw away the loaded photo on every redraw and left the box empty. */
  const inner = useMemo(() => ({ __html: html }), [html]);
  return <span ref={ref} className={className} style={{ display: 'contents' }} dangerouslySetInnerHTML={inner} />;
}

export function Photo({ id, alt = '', className, full = true }: { id: string; alt?: string; className?: string; full?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} alt={alt} src={`/img/${full ? 'f' : 't'}/${id}.webp`} loading="lazy" decoding="async" />;
}

export function Loading({ label = 'Getting the islands ready…' }: { label?: string }) {
  return <div className="wrap" style={{ padding: '80px 0', textAlign: 'center', opacity: 0.7 }} role="status">{label}</div>;
}

export function Section({ title, sub, action, children }: { title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="sec">
      <div className="sechd"><h2>{title}</h2>{sub && <span className="sub">{sub}</span>}{action}</div>
      {children}
    </div>
  );
}
