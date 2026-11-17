/* Creates a Razorpay order for the trip total. Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (see .env.example).
   Until the keys are set it answers 501, and the app keeps using the simulated payment. */
export async function POST(req: Request) {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return Response.json({ error: 'Payments are not connected yet' }, { status: 501 });
  const { amount, receipt } = (await req.json()) as { amount: number; receipt: string };
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'Bad amount' }, { status: 400 });
  // Never trust the browser's total in production: recompute it from the saved trip on the server first.
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt }),
  });
  return Response.json(await r.json(), { status: r.status });
}
