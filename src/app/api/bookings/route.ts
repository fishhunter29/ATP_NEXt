/* Receives a trip from checkout and saves it (customer, booking, one pass per item) in one transaction.
   Without the database keys it answers stored:false and checkout carries on as before. */
import { db } from '@/lib/db';
import { checkBooking } from '@/lib/booking';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const c = checkBooking(body);
  if (!c.ok) return Response.json({ error: c.error }, { status: 400 });
  const sb = db();
  if (!sb) return Response.json({ ok: true, stored: false, note: 'Database not connected yet', items: c.value.items.length });
  // a pass code taken at the same moment by another booking (unique_violation) is retried once; the function renames it
  let r = await sb.rpc('create_booking', { p: c.value });
  if (r.error && r.error.code === '23505') r = await sb.rpc('create_booking', { p: c.value });
  if (r.error) { console.error('create_booking', r.error.code, r.error.message); return Response.json({ error: 'Could not save the booking' }, { status: 500 }); }
  const out = r.data as { code: string; renamed: Record<string, string> };
  return Response.json({ ok: true, stored: true, code: out.code, renamed: out.renamed || {} });
}
