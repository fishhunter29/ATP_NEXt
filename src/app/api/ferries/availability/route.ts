/* One place for live ferry seats. Operators' APIs plug in here (keys stay on the server).
   Until then it returns the timetable from the catalogue, marked as not live. */
import { SAILS } from '@/lib/catalogue';
export const revalidate = 60;
export async function GET(req: Request) {
  const u = new URL(req.url); const from = (u.searchParams.get('from') || '').toUpperCase(); const to = (u.searchParams.get('to') || '').toUpperCase(); const date = u.searchParams.get('date');
  const list = SAILS.filter((s) => (!from || s.f === from) && (!to || s.to === to)).map((s) => ({ id: s.id, op: s.op, dep: s.dep, arr: s.arr, fare: s.fare, cls: s.cls, seats: null, live: false }));
  return Response.json({ date, live: false, sailings: list });
}
