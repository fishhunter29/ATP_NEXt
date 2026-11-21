'use client';
/* Text on photos, with no box behind it. Each caption that sits on a photo is read against the part of the photo
   right under it: over a light patch (sand, sky, surf) the text turns dark, over a dark patch (forest, deep water,
   night) it stays white. The CSS sets white as the starting colour; this only switches to dark ink where the photo
   is light. Runs once the photos load and again whenever new photos appear on the page. */
import { useEffect } from 'react';

export const PHOTO_TEXT = [
  '.atp-hhero-b', '.atp-isl-b', '.atp-thead-b', '.atp-banner > span', '.atp-pk-tag', '.atp-smp', '.hgal-n',
  '.atp-tour-hero > span', '.atp-done-tag', '.atp-boat-b',
].join(',');

const LIGHT = 0.6; // average brightness (0–1) above which the text turns dark

function photoFor(el: Element): HTMLImageElement | SVGImageElement | null {
  let p: Element | null = el.parentElement;
  for (let i = 0; p && i < 3; i++, p = p.parentElement) {
    const img = p.querySelector('img:not(.atp-tour-badge), svg image');
    if (img) return img as HTMLImageElement | SVGImageElement;
  }
  return null;
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
function load(src: string) {
  if (!cache.has(src)) cache.set(src, new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  return cache.get(src)!;
}

/* Brightness of the photo under the text box, with the photo drawn as it is shown (cover-cropped). */
async function inkFor(el: HTMLElement, ph: HTMLImageElement | SVGImageElement): Promise<'dark' | 'light' | null> {
  const src = ph instanceof HTMLImageElement ? ph.currentSrc || ph.src : ph.getAttribute('href') || ph.getAttribute('xlink:href') || '';
  if (!src || src.startsWith('data:image/svg')) return null;
  const im = await load(src); if (!im || !im.naturalWidth) return null;
  const box = (ph instanceof SVGImageElement ? ph.ownerSVGElement || ph : ph).getBoundingClientRect();
  const r = el.getBoundingClientRect(); if (!box.width || !box.height || !r.width || !r.height) return null;
  const sc = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight);
  const ox = (box.width - im.naturalWidth * sc) / 2, oy = (box.height - im.naturalHeight * sc) / 2;
  const sx = Math.max(0, (r.left - box.left - ox) / sc), sy = Math.max(0, (r.top - box.top - oy) / sc);
  const sw = Math.min(im.naturalWidth - sx, r.width / sc), sh = Math.min(im.naturalHeight - sy, r.height / sc);
  if (sw <= 0 || sh <= 0) return null;
  const c = document.createElement('canvas'); c.width = 24; c.height = 12;
  const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return null;
  try {
    g.drawImage(im, sx, sy, sw, sh, 0, 0, 24, 12);
    const d = g.getImageData(0, 0, 24, 12).data; let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    return sum / (d.length / 4) > LIGHT ? 'dark' : 'light';
  } catch { return null; } // a photo from another site that does not allow reading: keep white text
}

export default function PhotoInk() {
  useEffect(() => {
    let t = 0;
    const run = () => {
      document.querySelectorAll<HTMLElement>(PHOTO_TEXT).forEach((el) => {
        const ph = photoFor(el); if (!ph) return;
        const key = (ph instanceof HTMLImageElement ? ph.currentSrc || ph.src : ph.getAttribute('href')) + '|' + Math.round(el.getBoundingClientRect().width);
        if (el.dataset.inkKey === key) return; el.dataset.inkKey = key;
        if (ph instanceof HTMLImageElement && !ph.complete) { ph.addEventListener('load', () => { delete el.dataset.inkKey; later(); }, { once: true }); return; }
        inkFor(el, ph).then((ink) => { if (ink) el.dataset.ink = ink; });
      });
    };
    const later = () => { window.clearTimeout(t); t = window.setTimeout(run, 150); };
    /* start only once the page has loaded and React has taken it over, so marking the captions never trips hydration */
    const mo = new MutationObserver(later);
    let s0 = 0;
    const start = () => { s0 = window.setTimeout(() => { run(); mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'src'] }); }, 400); };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
    window.addEventListener('resize', later);
    return () => { mo.disconnect(); window.removeEventListener('load', start); window.removeEventListener('resize', later); window.clearTimeout(t); window.clearTimeout(s0); };
  }, []);
  return null;
}
