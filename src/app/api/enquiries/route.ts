/* Logs a query a visitor is sending us on WhatsApp, so none is lost if the chat is never sent or gets buried.
   Saved in Supabase → enquiries with the public (publishable) key: Row Level Security lets that key add a row and
   nothing else. Without the keys it answers stored:false and the site carries on as before. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;
function sb(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const int = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : null);

export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  const message = b && str(b.message, 6000);
  if (!b || !message) return Response.json({ error: 'A message is needed' }, { status: 400 });
  const ref = str(b.ref, 12) || (message.match(/\bATP-[A-Z0-9]{4,10}\b/) || [null])[0];
  const row = {
    kind: b.kind === 'trip' || b.kind === 'item' ? b.kind : 'general',
    ref: ref && /^ATP-[A-Z0-9]{4,10}$/.test(ref) ? ref : null,
    message,
    name: str(b.name, 120), phone: str(b.phone, 30), email: str(b.email, 200),
    start_date: day(b.start), end_date: day(b.end),
    travellers: int(b.travellers, 1, 60), total: typeof b.total === 'number' && b.total >= 0 && b.total < 1e9 ? b.total : null, items: int(b.items, 0, 500),
    page: str(b.page, 300), plan_url: str(b.plan, 4000),
  };
  const db = sb();
  if (!db) return Response.json({ ok: true, stored: false, note: 'Database not connected yet' });
  const r = await db.from('enquiries').insert(row);
  if (r.error) { console.error('enquiries', r.error.code, r.error.message); return Response.json({ ok: true, stored: false }); }
  return Response.json({ ok: true, stored: true });
}
