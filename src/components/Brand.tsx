/* The brand mark and the shell's icons, as plain SVG so they are in the server HTML (no wait for the engine).
   Tide icons: 24px grid, 2px stroke, square caps. */
import type { ReactNode } from 'react';

function Svg({ s, children }: { s: number; children: ReactNode }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{children}</svg>
  );
}

const PATHS: Record<string, ReactNode> = {
  waves: <path d="M3 8c2 0 2-2 4.5-2S10 8 12 8s2-2 4.5-2S19 8 21 8M3 13c2 0 2-2 4.5-2s2.5 2 4.5 2 2-2 4.5-2 2.5 2 4.5 2M3 18c2 0 2-2 4.5-2s2.5 2 4.5 2 2-2 4.5-2 2.5 2 4.5 2" />,
  back: <path d="M15 5l-7 7 7 7" />,
  explore: <><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  trip: <path d="M5 8h14v12H5zM9 8V5h6v3" />,
  ticket: <path d="M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" />,
  user: <path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0" />,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>,
  users: <path d="M9 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2 20a7 7 0 0 1 14 0M16 4.500a3.5 3.5 0 0 1 0 6.500M18 14a6 6 0 0 1 4 6"/>,
  kid: <path d="M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 21l1-7h8l1 7M8 14l-3-3M16 14l3-3"/>,
  mask: <path d="M3 9h18v5a3 3 0 0 1-3 3h-2l-2-2h-4l-2 2H6a3 3 0 0 1-3-3zM12 9v4"/>,
  crown: <path d="M4 18h16M5 15L4 7l5 4 3-6 3 6 5-4-1 8z"/>,
  wallet: <path d="M4 7h15v12H4zM4 7l11-3v3M15 13h4"/>,
  brief: <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16"/>,
  map: <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>,
  tree: <path d="M12 3l6 9h-4l4 6H6l4-6H6zM12 18v3"/>,
  fish: <><path d="M3 12c3-5 9-6 13-2l4-3v10l-4-3c-4 4-10 3-13-2z"/><path d="M14 11h.01"/></>,
  jet: <path d="M3 17h13l5-4H9L7 9H4zM3 20c2 0 2-1 4.5-1s2.5 1 4.5 1 2-1 4.5-1 2.5 1 4.5 1"/>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></>,
  wave: <path d="M3 8c2 0 2-2 4.5-2S10 8 12 8s2-2 4.5-2S19 8 21 8M3 13c2 0 2-2 4.5-2s2.5 2 4.5 2 2-2 4.5-2 2.5 2 4.5 2M3 18c2 0 2-2 4.5-2s2.5 2 4.5 2 2-2 4.5-2 2.5 2 4.5 2"/>,
  boat: <path d="M3 16l2 4h14l2-4M5 16v-4h14v4M9 12V8h6v4M12 8V4"/>,
  pin: <><path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10z"/><path d="M12 11h.01"/></>,
  bed: <><path d="M3 19V6M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5"/><path d="M7 11h.01"/></>,
  compass: <><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/><path d="M15.5 8.500l-2 5-5 2 2-5z"/></>,
  star: <path d="M12 4l2.4 5 5.6.700-4.1 3.8 1.1 5.500L12 16.3 6.9 19l1.1-5.500L4 9.7 9.6 9z"/>,
  sunset: <path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 4v4M5 9l2 2M19 9l-2 2M9 5l3 3 3-3"/>,
  leaf: <path d="M5 19C5 9 11 5 20 4c-1 9-5 15-15 15zM5 19l7-7"/>,
  check: <path d="M5 12l5 5 9-10"/>,
  clock: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2"/>,
  sort: <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>,
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4"/>,
  chev: <path d="M9 6l6 6-6 6"/>,
  car: <><path d="M4 17v-6l2-5h12l2 5v6M4 11h16M4 17h16M7 17v2M17 17v2"/><path d="M8 14h.01M16 14h.01"/></>,
  plane: <><path d="M21 4L3 11l6 3 3 6z"/><path d="M9 14l5-4"/></>,
  cal: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  swap: <path d="M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>,
  alert: <><path d="M12 4l9 16H3zM12 10v4"/><path d="M12 17h.01"/></>,
  starf: <path d="M12 4l2.4 5 5.6.700-4.1 3.8 1.1 5.500L12 16.3 6.9 19l1.1-5.500L4 9.7 9.6 9z" fill="currentColor" stroke="none"/>,
  sunrise: <path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 9V4M9 6l3-3 3 3M5 10l1.5 1.5M19 10l-1.5 1.5" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16v4M17 18h4" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export function TideIcon({ n, s = 20 }: { n: string; s?: number }) {
  return <Svg s={s}>{PATHS[n]}</Svg>;
}

/** The coral tile with three waves. */
export function Logo() {
  return <span className="atp-logo" aria-hidden="true"><TideIcon n="waves" s={18} /></span>;
}
