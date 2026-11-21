/* Razorpay calls this when a payment changes. We check the signature, keep every event, and mark the booking paid.
   Needs RAZORPAY_WEBHOOK_SECRET (and the database keys to save anything). */
import crypto from 'node:crypto';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook not configured', { status: 501 });
  const body = await req.text();
  const sig = req.headers.get('x-razorpay-signature') || '';
  const want = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return new Response('Bad signature', { status: 401 });
  const event = JSON.parse(body);
  const pay = event?.payload?.payment?.entity || {};
  const orderId: string | undefined = pay.order_id || event?.payload?.order?.entity?.id;
  const sb = db();
  if (!sb) { return Response.json({ ok: true, stored: false }); }
  await sb.from('payment_events').insert({ event: String(event.event || 'unknown'), order_id: orderId ?? null, payment_id: pay.id ?? null, payload: event });
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && orderId) {
    const { error } = await sb.from('bookings').update({ status: 'paid', razorpay_payment_id: pay.id ?? null }).eq('razorpay_order_id', orderId).eq('status', 'pending');
    if (error) { console.error('mark paid', error.message); return new Response('Could not update the booking', { status: 500 }); } // Razorpay retries on a 5xx
  }
  return Response.json({ ok: true });
}
