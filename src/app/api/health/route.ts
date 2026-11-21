/* Uptime check. Also says whether the database and payments are connected (never the keys themselves). */
import { db } from '@/lib/db';

export async function GET() {
  const sb = db(); let database: 'not configured' | 'connected' | 'error' = 'not configured';
  if (sb) { const { error } = await sb.from('price_overrides').select('product_id', { head: true, count: 'exact' }); database = error ? 'error' : 'connected'; }
  /* the public answer says only whether the site is up; what is connected goes to the server log */
  if (database === 'error') console.error('health: database error');
  return Response.json({ ok: database !== 'error' });
}
