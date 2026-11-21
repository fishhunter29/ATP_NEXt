import { expect, test } from '@playwright/test';

/* /api/bookings without a database: it checks what it gets, and says it stored nothing. */
const good = () => ({
  lead: { name: 'Priya Sharma', phone: '+91 98765 43210', email: 'priya@example.com' }, pay: 'simulated',
  pax: { adults: 2, kids: 0, infants: 0 }, start: '2026-12-07', end: '2026-12-12', subtotal: 3000, gst: 150, total: 3150,
  items: [
    { code: 'ATP-AAA001', kind: 'ferry', title: 'Port Blair → Havelock', date: '2026-12-08', time: '08:00', price: 2000, net: 1912 },
    { code: 'ATP-AAA002', kind: 'act', title: 'Elephant Beach boat', date: '2026-12-09', price: 1000, net: 930 },
  ],
  trip: { cart: [] },
});

/* Long trips open folded, one line a day. Most tests look inside the days, so they start with every day open;
   the test for folding itself asks for the normal behaviour ('auto'). */
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { if (!sessionStorage.getItem('atp_days')) sessionStorage.setItem('atp_days', 'all'); } catch {} }); });

test('bookings API checks what it is sent', async ({ request }) => {
  const send = (b: any) => request.post('/api/bookings', { data: b });
  const bad = async (b: any, msg: RegExp) => { const r = await send(b); expect(r.status(), JSON.stringify(b).slice(0, 80)).toBe(400); expect((await r.json()).error).toMatch(msg); };
  await bad({ ...good(), lead: { name: '', phone: '+91 98765 43210' } }, /name/);
  await bad({ ...good(), lead: { name: 'A', phone: 'call me' } }, /phone/);
  await bad({ ...good(), lead: { name: 'A', phone: '+91 98765 43210', email: 'nope' } }, /Email/);
  await bad({ ...good(), pay: 'cash' }, /payment/);
  await bad({ ...good(), items: [] }, /1 to 80/);
  await bad({ ...good(), items: [{ ...good().items[0], date: 'tomorrow' }, good().items[1]] }, /incomplete/);
  await bad({ ...good(), items: [good().items[0], { ...good().items[1], code: 'ATP-AAA001' }] }, /share a pass code/);
  await bad({ ...good(), subtotal: 2500, total: 2650 }, /add up to the subtotal/);
  await bad({ ...good(), total: 9999 }, /add up to the total/);
  await bad({ ...good(), fee: 2000, total: 5150 }, /fee is out of range/);
  const r = await send(good()); expect(r.status()).toBe(200);
  expect(await r.json()).toMatchObject({ ok: true, stored: false, items: 2 });   // no database in CI
});

test('health says what is connected, never the keys', async ({ request }) => {
  const j = await (await request.get('/api/health')).json();
  expect(j).toMatchObject({ ok: true, database: 'not configured' });
  expect(JSON.stringify(j)).not.toMatch(/key|secret/i);
});

/* Checkout is in "confirm first" mode: the trip goes to the team on WhatsApp and nothing is posted to /api/bookings
   until payments are switched on. The checks on what a booking must contain are the tests above. */
