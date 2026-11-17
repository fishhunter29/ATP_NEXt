/* Razorpay calls this when a payment succeeds. We check the signature, then mark the booking paid. */
import crypto from 'node:crypto';
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook not configured', { status: 501 });
  const body = await req.text();
  const sig = req.headers.get('x-razorpay-signature') || '';
  const want = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return new Response('Bad signature', { status: 401 });
  const event = JSON.parse(body);
  // TODO (stage 3): save to the bookings table and send WhatsApp vouchers.
  console.log('razorpay event', event.event);
  return Response.json({ ok: true });
}
