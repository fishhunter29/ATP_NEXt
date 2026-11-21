/* Server-side access to the catalogue, for pages Google can read (no trip engine needed). */
import data from '@/data/catalogue.json';
import photomap from '@/data/photomap.json';

export type Zone = { id: string; name: string; official: string; region: string; reach: string; notes: string; typN?: number; minN?: number; maxN?: number; jetty?: string };
export type Act = { id: string; fam: string; n: string; v: string; z: string; site?: string; b: string; d?: number; slot?: string; t?: string; p?: number; age?: number; cond?: string; sea?: string; note?: string; g?: { k?: string; pid?: string; rt?: number; rv?: number; n?: number }; steps?: [string, string][]; open?: string; close?: string; entry?: boolean; closed?: string[]; fixed?: boolean; slots?: string[] };
export type Hotel = { id: string; z: string; n: string; rt: number | null; rv: number | null; t: string; rooms: { n: string; mp: string; ma: number; s_hi?: number; s_ln?: number; s_pk?: number }[]; a?: string | null };
export type Sail = { id: string; op: string; f: string; to: string; dep: string; arr: string; gov: boolean; fare: number; cls: string; fromPt: string; toPt: string; rep: number };

const D = data as any;
export const ZONES: Zone[] = D.zones;
export const ACTS: Act[] = D.acts;
export const HOTELS: Hotel[] = D.hotels;
export const SAILS: Sail[] = D.sails;
export const ZN: Record<string, Zone> = Object.fromEntries(ZONES.map((z) => [z.id, z]));
const PM = photomap as { act: Record<string, string | null>; zone: Record<string, string | null>; sail: Record<string, string | null> };

export const inr = (n?: number | null) => (n == null ? 'On request' : '₹' + Math.round(n).toLocaleString('en-IN'));
export const slug = (id: string) => id.toLowerCase();
export const unslug = (s: string) => s.toUpperCase();
export const actPhoto = (id: string) => PM.act[id] || 'i179';
export const zonePhoto = (z: string) => PM.zone[z] || 'i179';
export const sailPhoto = (id: string) => PM.sail[id] || 'i153';
export const hotelFrom = (h: Hotel) => Math.min(...h.rooms.map((r) => r.s_hi || r.s_ln || r.s_pk || Infinity));
export const per = (b: string) => (b === 'per_pax' ? 'per person' : b === 'per_boat' ? 'per boat' : b === 'per_vehicle' ? 'per vehicle' : b === 'per_group' ? 'per group' : '');
export const durTxt = (m?: number) => (!m ? '' : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/** Ferry routes that actually run (from → to), with their sailings. */
export function ferryRoutes() {
  const map = new Map<string, Sail[]>();
  SAILS.forEach((s) => { const k = `${s.f}-${s.to}`; map.set(k, [...(map.get(k) || []), s]); });
  return [...map.entries()].map(([k, list]) => ({ key: k.toLowerCase(), from: list[0].f, to: list[0].to, list: list.sort((a, b) => a.dep.localeCompare(b.dep)) }));
}
