/* Uptime check. Also says whether the database and payments are connected (never the keys themselves). */
import { db } from '@/lib/db';

export async function GET() {
  const sb = db(); let database: 'not configured' | 'connected' | 'error' = 'not configured';
  if (sb) { const { error } = await sb.from('price_overrides').select('product_id', { head: true, count: 'exact' }); database = error ? 'error' : 'connected'; }
  return Response.json({ ok: true, service: 'andaman-travel-planner', time: new Date().toISOString(), database, payments: process.env.RAZORPAY_KEY_ID ? 'configured' : 'not configured' });
}
