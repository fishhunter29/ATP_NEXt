/* The tour itself. Loaded only when a tour is about to start (ProductTour imports it on demand), so Driver.js and
   its styles add nothing to the first page load. Browser only. */
import { driver, type Driver, type DriveStep, type PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/tide-tour.css';
import { TOUR_LABELS, TOUR_STEPS, type TourStep } from './steps';

export type TourEnd = 'done' | 'skipped';

const mq = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;
const reduced = () => mq('(prefers-reduced-motion: reduce)');
const phone = () => mq('(max-width: 640px)');

/** The first [data-tour=name] that is actually on the screen at this width (the Trip tab is in the dock on phones and
    in the header on wide screens). Null when none is shown. */
export function findTarget(name: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`))) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0) return el;
  }
  return null;
}

/** Is the element (or a parent) fixed to the screen? Those are never scrolled to. */
function pinned(el: Element) {
  for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; }
  return false;
}

/** Scroll so the target sits just under the header on a phone (the card is a sheet at the bottom) and in the middle
    on a wide screen (the card is beside it). */
function bringIntoView(el: HTMLElement) {
  if (pinned(el)) return;
  const r = el.getBoundingClientRect(); const head = document.querySelector('header')?.getBoundingClientRect().bottom || 0;
  const top = phone() ? r.top + scrollY - Math.max(head, 0) - 12 : r.top + scrollY - Math.max(head + 16, (innerHeight - r.height) / 2);
  window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
}

let active: Driver | null = null;
export const tourActive = () => !!active?.isActive();
export function stopTour() { active?.destroy(); }

export function runTour({ onEnd }: { onEnd?: (how: TourEnd) => void } = {}) {
  if (active?.isActive()) return;
  /* Steps whose target is not on the screen are left out, so the count ("2 of 6") stays true. */
  const steps: (TourStep & { el?: HTMLElement })[] = [];
  for (const s of TOUR_STEPS) { if (!s.target) { steps.push(s); continue; } const el = findTarget(s.target); if (el) steps.push({ ...s, el }); }
  const total = steps.length; if (!total) return;
  let how: TourEnd = 'skipped';
  const still = reduced();

  /* the coral ring and the beacon, drawn over the highlighted thing */
  const ring = document.createElement('div'); ring.className = 'atp-tour-ring'; ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = '<span class="atp-tour-beacon"></span>';
  let raf = 0;
  const track = () => {
    const el = active?.getActiveElement() as HTMLElement | undefined;
    const real = el && el.id !== 'driver-dummy-element' && document.contains(el);
    if (real) { const r = el!.getBoundingClientRect(); const p = 6, vw = document.documentElement.clientWidth;
      /* kept on the screen, so the beacon on a full-width thing is not cut off at the edge */
      const x0 = Math.max(3, r.left - p), x1 = Math.min(vw - 3, r.right + p);
      ring.style.transform = `translate(${Math.round(x0)}px,${Math.round(r.top - p)}px)`; ring.style.width = `${Math.round(x1 - x0)}px`; ring.style.height = `${Math.round(r.height + 2 * p)}px`; ring.dataset.on = '1';
    } else ring.dataset.on = '';
    raf = requestAnimationFrame(track);
  };

  /* No scrolling the page under the tour (Driver sets overflow:hidden; this covers touch on older phones). */
  const block = (e: Event) => { if (!(e.target instanceof Element) || !e.target.closest('.driver-popover')) e.preventDefault(); };

  const build = (s: (typeof steps)[number], i: number): DriveStep => {
    const first = i === 0, last = i === total - 1;
    return {
      element: s.el,
      data: { id: s.id },
      popover: {
        title: s.title, description: s.body,
        showButtons: first ? ['next', 'close'] : ['next', 'previous', 'close'],
        side: s.el ? 'bottom' : undefined, align: 'center',
        popoverClass: `atp-tour${s.el ? '' : ' is-card'}${first ? ' is-first' : ''}${last ? ' is-last' : ''}`,
      },
      onHighlightStarted: (el) => { if (el instanceof HTMLElement && el.id !== 'driver-dummy-element') bringIntoView(el); },
    };
  };

  const d = driver({
    steps: steps.map(build),
    animate: !still, smoothScroll: !still, duration: 260,
    scrollIntoView: false,            // we scroll ourselves, to leave room for the sheet on phones
    allowScroll: false,
    allowClose: true, overlayClickBehavior: 'none',
    disableActiveInteraction: true,    // a tap on the highlighted thing does not leave the tour
    allowKeyboardControl: true,        // ← → and Esc
    skipMissingElement: true,          // a target that disappears mid-tour is skipped, not shown as an empty card
    overlayColor: '#212529', overlayOpacity: 0.66,
    stagePadding: 6, stageRadius: 12, popoverOffset: 18,
    showProgress: true, progressText: '{{current}} of {{total}}',
    nextBtnText: TOUR_LABELS.next, prevBtnText: TOUR_LABELS.back, doneBtnText: TOUR_LABELS.done, closeBtnLabel: TOUR_LABELS.close,
    onPopoverRender: (pop: PopoverDOM, { state }) => decorate(pop, state.activeIndex ?? 0, total, () => d.destroy()),
    onPopoverPositioned: (pop: PopoverDOM, { state }) => place(pop, state.activeElement as HTMLElement | undefined),
    onDoneClick: () => { how = 'done'; d.destroy(); },
    onDestroyed: () => {
      cancelAnimationFrame(raf); ring.remove(); active = null;
      document.removeEventListener('touchmove', block, { capture: true } as any); document.removeEventListener('wheel', block, { capture: true } as any);
      document.documentElement.classList.remove('atp-touring');
      try { onEnd?.(how); } catch {}
      if (how === 'done') { const p = findTarget('plan'); if (p) { window.scrollTo({ top: Math.max(0, p.getBoundingClientRect().top + scrollY - 72), behavior: still ? 'auto' : 'smooth' }); (p.querySelector<HTMLElement>('button, a, input, select') || p).focus({ preventScroll: true }); } }
    },
  });
  active = d;
  document.documentElement.classList.add('atp-touring');
  if (still) document.documentElement.classList.add('atp-still'); else document.documentElement.classList.remove('atp-still');
  document.addEventListener('touchmove', block, { passive: false, capture: true }); document.addEventListener('wheel', block, { passive: false, capture: true });
  d.drive();
  /* Driver draws in the top layer; the ring has to be in there too to sit above the dimmed page */
  (document.querySelector('.driver-layer') || document.body).appendChild(ring);
  raf = requestAnimationFrame(track);
}

/** Our parts of the card: an eyebrow, progress dots, a Skip button, the photo on the first card. */
function decorate(pop: PopoverDOM, i: number, total: number, skip: () => void) {
  const w = pop.wrapper;
  w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-roledescription', 'tour step');
  pop.progress.setAttribute('aria-label', `Step ${i + 1} of ${total}`);
  const first = i === 0, last = i === total - 1;

  if (first && !w.querySelector('.atp-tour-hero')) {
    const hero = document.createElement('div'); hero.className = 'atp-tour-hero'; hero.setAttribute('aria-hidden', 'true');
    hero.innerHTML = '<img src="/img/f/i179.webp" alt="" width="640" height="320" decoding="async"><img class="atp-tour-badge" src="/brand/atp-logo.svg" alt="" width="64" height="64"><span>Quick tour · 1 minute</span>';
    w.insertBefore(hero, pop.title);
  }
  if (last && !w.querySelector('.atp-tour-tick')) {
    const t = document.createElement('div'); t.className = 'atp-tour-tick'; t.setAttribute('aria-hidden', 'true');
    t.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    w.insertBefore(t, pop.title);
  }

  const dots = document.createElement('div'); dots.className = 'atp-tour-dots'; dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = Array.from({ length: total }, (_, k) => `<i${k === i ? ' class="is-on"' : k < i ? ' class="is-past"' : ''}></i>`).join('');
  pop.progress.insertAdjacentElement('afterbegin', dots);

  if (!last) {
    const s = document.createElement('button'); s.type = 'button'; s.className = 'atp-tour-skip'; s.textContent = TOUR_LABELS.skip;
    s.addEventListener('click', skip);
    pop.footerButtons.insertAdjacentElement('afterbegin', s);
  }
  pop.nextButton.classList.add('atp-tour-next');
  pop.previousButton.classList.add('atp-tour-back');
  /* the main button takes the focus, so Enter moves on and a screen reader starts at the card */
  requestAnimationFrame(() => { if (w.isConnected && !w.contains(document.activeElement)) pop.nextButton.focus({ preventScroll: true, focusVisible: false } as FocusOptions); });
}

/** On a phone the card is a sheet on the bottom edge, unless the highlighted thing is down there (the Trip tab in the
    dock): then the sheet sits just above it. */
function place(pop: PopoverDOM, el?: HTMLElement) {
  const w = pop.wrapper;
  let lift = 0;
  if (phone() && el && el.id !== 'driver-dummy-element') { const r = el.getBoundingClientRect(); if (r.top > innerHeight * 0.6) lift = Math.max(0, innerHeight - r.top + 22); }
  w.style.setProperty('--atp-tour-lift', `${lift}px`);
  w.classList.toggle('is-lifted', lift > 0);
}
