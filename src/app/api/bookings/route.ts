/* Receives a paid trip from checkout. Stage 3 stores it in the database (Supabase) and notifies partners. */
export async function POST(req: Request) {
  const trip = await req.json().catch(() => null);
  if (!trip || !Array.isArray(trip.items)) return Response.json({ error: 'Send { items: [...] }' }, { status: 400 });
  return Response.json({ ok: true, stored: false, note: 'Database not connected yet', items: trip.items.length });
}
