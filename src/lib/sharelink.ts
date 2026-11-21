/* A trip as a link. The plan travels in the part of the address after "#", which browsers never send to a server,
   so a shared plan is seen only by the people who have the link. It holds what is in the trip, the travellers and
   the dates; never a name, a phone number or anything from checkout.
   When the database is connected this becomes a short link; the page that opens it stays the same. */

const KINDS = ['stay', 'ferry', 'act', 'cab', 'rent'];
const SAFE = /^[\p{L}\p{N} \-_.:&'’()\/,+→]{0,60}$/u;
const b64 = (u8: Uint8Array) => { let s = ''; u8.forEach((c) => { s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (s: string) => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/')); const u8 = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u8[i] = t.charCodeAt(i); return u8; };
async function pipe(u8: Uint8Array, stream: any): Promise<Uint8Array> {
  const out = new Response(new Blob([u8 as any]).stream().pipeThrough(stream)); return new Uint8Array(await out.arrayBuffer());
}

export type Shared = { name: string; cart: any[]; pax: { adults: number; kids: number; infants: number; ages: number[]; sen?: boolean }; win: { start: string; end: string } | null; guess: boolean };

/** The trip on screen, packed into the text that goes after "#". */
export async function packTrip(S: any): Promise<string> {
  const o = { v: 1, n: S.tripName || '', c: S.cart, p: S.pax, w: S.trip ? { start: S.trip.start, end: S.trip.end } : S.win, g: !!S.datesAssumed };
  const raw = new TextEncoder().encode(JSON.stringify(o));
  try { if (typeof (globalThis as any).CompressionStream === 'function') return 'z' + b64(await pipe(raw, new (globalThis as any).CompressionStream('deflate-raw'))); } catch {}
  return 'j' + b64(raw);
}

/** Read a link back. Everything in it is checked: a link is text from outside, so nothing is trusted as it comes. */
export async function unpackTrip(code: string, E: any): Promise<Shared | null> {
  try {
    if (!code || code.length > 60000) return null;
    const body = unb64(code.slice(1));
    const raw = code[0] === 'z' ? await pipe(body, new (globalThis as any).DecompressionStream('deflate-raw')) : code[0] === 'j' ? body : null;
    if (!raw || raw.length > 400000) return null;
    const o = JSON.parse(new TextDecoder().decode(raw));
    if (!o || o.v !== 1 || !Array.isArray(o.c) || o.c.length > 250) return null;
    const isDate = (d: any) => typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d) && !isNaN(Date.parse(d));
    const known = (it: any) => (it.kind === 'stay' && E.HOT[it.ref]) || (it.kind === 'ferry' && E.SAIL[it.ref]) || (it.kind === 'act' && E.ACT[it.ref]) || (it.kind === 'cab' && E.ROUTE[it.ref]) || (it.kind === 'rent' && E.RENT[it.ref]);
    const cart: any[] = [];
    for (const x of o.c) {
      if (!x || typeof x !== 'object' || !KINDS.includes(x.kind) || typeof x.ref !== 'string' || !isDate(x.date) || !known(x)) continue;
      const it: any = {};
      for (const [k, v] of Object.entries(x)) {
        if (!/^[a-zA-Z]{1,12}$/.test(k)) continue;
        if (typeof v === 'boolean') it[k] = v;
        else if (typeof v === 'number') { if (Number.isFinite(v) && Math.abs(v) < 1e7) it[k] = v; }
        else if (typeof v === 'string') { if (SAFE.test(v)) it[k] = v; }
        else if (Array.isArray(v) && v.length <= 12 && v.every((s) => typeof s === 'string' && /^[\w-]{1,6}$/.test(s))) it[k] = v;
      }
      if (typeof it.uid !== 'string' || !/^[\w-]{1,24}$/.test(it.uid)) continue;
      if (it.kind === 'stay') it.nights = Math.max(1, Math.min(30, Math.round(Number(it.nights) || 1)));
      cart.push(it);
    }
    if (!cart.length) return null;
    const num = (v: any, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
    const p = o.p || {}; const kids = num(p.kids, 0, 8);
    const pax = { adults: num(p.adults, 1, 12), kids, infants: num(p.infants, 0, 4), ages: (Array.isArray(p.ages) ? p.ages : []).slice(0, kids).map((a: any) => num(a, 2, 17)), sen: !!p.sen };
    const win = o.w && isDate(o.w.start) && isDate(o.w.end) && o.w.start <= o.w.end ? { start: o.w.start, end: o.w.end } : null;
    const name = typeof o.n === 'string' ? o.n.replace(/[^\p{L}\p{N} \-.,·&'’()]/gu, '').slice(0, 60) : '';
    return { name, cart, pax, win, guess: !!o.g };
  } catch { return null; }
}

/** Work something out for a shared plan with the engine, then put the traveller's own trip back exactly as it was.
    Nothing is saved in between. */
export function withShared<T>(E: any, t: Shared, fn: () => T): T {
  const S = E.S; const keep = { cart: S.cart, pax: S.pax, win: S.win, trip: S.trip, datesAssumed: S.datesAssumed };
  try { S.cart = t.cart; S.pax = t.pax; S.win = t.win; S.datesAssumed = t.guess; return fn(); }
  finally { S.cart = keep.cart; S.pax = keep.pax; S.win = keep.win; S.trip = keep.trip; S.datesAssumed = keep.datesAssumed; }
}
