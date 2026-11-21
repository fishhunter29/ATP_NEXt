/* Checks a booking sent from checkout before it is saved. Plain checks, no library: shape, sizes, and that the
   totals add up. (Re-pricing every item on the server from the catalogue is the next step of stage 3.) */
export type BookingItem = { code: string; kind: 'ferry' | 'stay' | 'cab' | 'act' | 'rent'; ref?: string; title: string; sub?: string; zone?: string; date: string; time?: string; report?: string; vendor?: string; price: number | null; net: number | null; pax?: number; seats?: string };
export type BookingIn = {
  lead: { name: string; phone: string; email?: string };
  pay: 'upi' | 'card' | 'nb' | 'simulated';
  pax: { adults: number; kids: number; infants: number };
  start?: string; end?: string;
  subtotal: number; gst: number; total: number; fee?: number;
  items: BookingItem[];
  trip?: unknown;
};

const KINDS = ['ferry', 'stay', 'cab', 'act', 'rent'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Returns the cleaned booking, or a reason it was refused. */
export function checkBooking(b: any): { ok: true; value: BookingIn } | { ok: false; error: string } {
  if (!b || typeof b !== 'object') return { ok: false, error: 'Send the booking as JSON' };
  const L = b.lead || {};
  if (!str(L.name, 120)) return { ok: false, error: 'Lead traveller name is missing' };
  if (typeof L.phone !== 'string' || !/^\+?[0-9 ]{8,20}$/.test(L.phone.trim())) return { ok: false, error: 'Lead traveller phone is not valid' };
  if (L.email && (typeof L.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(L.email.trim()))) return { ok: false, error: 'Email is not valid' };
  if (!['upi', 'card', 'nb', 'simulated'].includes(b.pay)) return { ok: false, error: 'Unknown payment method' };
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 80) return { ok: false, error: 'A booking needs 1 to 80 items' };
  for (const i of b.items) {
    if (!i || !str(i.code, 20) || !KINDS.includes(i.kind) || !str(i.title, 200) || typeof i.date !== 'string' || !DATE.test(i.date)) return { ok: false, error: 'An item is incomplete' };
    if (i.price != null && !num(i.price)) return { ok: false, error: 'An item has a bad price' };
  }
  if (new Set(b.items.map((i: any) => i.code)).size !== b.items.length) return { ok: false, error: 'Two items share a pass code' };
  if (![b.subtotal, b.gst, b.total].every(num)) return { ok: false, error: 'Totals are missing' };
  const sum = b.items.reduce((s: number, i: any) => s + (i.price || 0), 0);
  if (Math.abs(sum - b.subtotal) > 1) return { ok: false, error: 'Item prices do not add up to the subtotal' };
  if (b.fee != null && (!num(b.fee) || b.fee < 0 || b.fee > b.subtotal * 0.1 + 1)) return { ok: false, error: 'The fee is out of range' };
  const fee = num(b.fee) ? b.fee! : 0;   // the convenience fee; its GST is inside `gst`
  if (Math.abs(b.subtotal + fee + b.gst - b.total) > 1) return { ok: false, error: 'Subtotal, fee and GST do not add up to the total' };
  const pax = b.pax || {};
  const p = { adults: Math.max(1, Math.min(30, Math.round(+pax.adults || 1))), kids: Math.max(0, Math.min(30, Math.round(+pax.kids || 0))), infants: Math.max(0, Math.min(30, Math.round(+pax.infants || 0))) };
  const json = JSON.stringify(b.trip ?? {}); if (json.length > 200_000) return { ok: false, error: 'Trip is too large' };
  return { ok: true, value: {
    lead: { name: L.name.trim(), phone: L.phone.trim(), email: L.email ? L.email.trim() : undefined }, pay: b.pay, pax: p,
    start: DATE.test(b.start) ? b.start : undefined, end: DATE.test(b.end) ? b.end : undefined,
    subtotal: b.subtotal, gst: b.gst, total: b.total,
    items: b.items.map((i: any) => ({ code: i.code, kind: i.kind, ref: i.ref, title: i.title, sub: i.sub, zone: i.zone, date: i.date, time: /^[0-2]\d:[0-5]\d$/.test(i.time) ? i.time : undefined, report: i.report, vendor: i.vendor, price: i.price ?? null, net: num(i.net) ? i.net : null, pax: Number.isFinite(i.pax) ? i.pax : undefined, seats: i.seats || undefined })),
    trip: b.trip ?? {},
  } };
}
