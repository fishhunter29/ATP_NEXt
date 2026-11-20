/* The ready-made trips as the server pages read them (written by scripts/pkg-index.mjs). */
import { ZN } from '@/lib/catalogue';
import PKGS from '@/data/packages.json';

export type Pkg = { id: string; n: string; hi: string | null; tag: string; nights: number; tier: string; pax: number[]; hl: string[]; route: [string, number][]; total: number; bookings: number; days: { t: string; kind: string; title: string; sub: string; ref: string; zone: string }[][] };
export const PACKAGES = PKGS as unknown as Pkg[];
export const routeTxt = (p: Pkg) => p.route.map(([z, n]) => `${ZN[z]?.name} ${n}N`).join(' → ');
export const paxTxt = (p: Pkg) => { const [a, k] = p.pax; return `${a} adult${a > 1 ? 's' : ''}${k ? `, ${k} child${k > 1 ? 'ren' : ''}` : ''}`; };
