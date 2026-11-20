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
};

export function TideIcon({ n, s = 20 }: { n: string; s?: number }) {
  return <Svg s={s}>{PATHS[n]}</Svg>;
}

/** The coral tile with three waves. */
export function Logo() {
  return <span className="atp-logo" aria-hidden="true"><TideIcon n="waves" s={18} /></span>;
}
