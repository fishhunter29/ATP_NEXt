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
/* the first-visit tour has its own tests (tour.spec.ts); everywhere else it has already been seen */
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem('atp_tour_v1', 'done'); if (!sessionStorage.getItem('atp_days')) sessionStorage.setItem('atp_days', 'all'); } catch {} }); });

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

test('health says the site is up, and nothing about what is connected', async ({ request }) => {
  const j = await (await request.get('/api/health')).json();
  expect(j).toEqual({ ok: true });
  expect(JSON.stringify(j)).not.toMatch(/key|secret/i);
});

/* Checkout is in "confirm first" mode: the trip goes to the team on WhatsApp and nothing is posted to /api/bookings
   until payments are switched on. The checks on what a booking must contain are the tests above. */

/* /api/enquiries: every WhatsApp query is logged. Without a database it accepts the query and says it stored nothing. */
test('enquiries: a message is needed, and a good one is accepted', async ({ request }) => {
  expect((await request.post('/api/enquiries', { data: {} })).status()).toBe(400);
  expect((await request.post('/api/enquiries', { data: { message: '   ' } })).status()).toBe(400);
  const r = await request.post('/api/enquiries', { data: { kind: 'trip', message: 'Hi Andaman Travel Planner, please confirm this trip for me.\nRef: ATP-TEST01', total: 12345, travellers: 2 } });
  expect(r.status()).toBe(200);
  expect((await r.json()).ok).toBe(true);
});

test('tapping a WhatsApp link logs the query before the chat opens', async ({ page }) => {
  const seen: any[] = [];
  await page.route('**/api/enquiries', async (route) => { seen.push(route.request().postDataJSON()); await route.fulfill({ json: { ok: true, stored: false } }); });
  await page.goto('/stays');
  await page.evaluate(() => { window.open = () => null; document.addEventListener('click', (e) => { if ((e.target as Element).closest('a[href^="https://wa.me/"]')) e.preventDefault(); }); });
  await page.locator('footer a[href^="https://wa.me/"]').first().click();
  await expect.poll(() => seen.length).toBe(1);
  expect(seen[0].message).toContain('Andaman trip');
  expect(seen[0].page).toBe('/stays');
});

test('enquiries: a flood from one visitor is refused, and so is an oversized body', async ({ request }) => {
  const h = { 'x-forwarded-for': '203.0.113.77' }; const codes: number[] = [];
  for (let i = 0; i < 10; i++) codes.push((await request.post('/api/enquiries', { data: { message: 'again' }, headers: h })).status());
  expect(codes.slice(0, 8).every((c) => c === 200)).toBe(true);
  expect(codes[9]).toBe(429);
  const big = await request.post('/api/enquiries', { data: { message: 'x'.repeat(30000) }, headers: { 'x-forwarded-for': '203.0.113.78' } });
  expect(big.status()).toBe(413);
});

test('security headers are set, photos are cached, and an uppercase address goes to the lowercase page', async ({ request }) => {
  const r = await request.get('/');
  expect(r.headers()['x-content-type-options']).toBe('nosniff');
  expect(r.headers()['x-frame-options']).toBe('SAMEORIGIN');
  expect(r.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect((await request.get('/brand/atp-mark.svg')).headers()['cache-control']).toContain('max-age=86400');
  const up = await request.get('/Stays', { maxRedirects: 0 });
  expect(up.status()).toBe(308); expect(up.headers()['location']).toMatch(/\/stays$/);
  expect((await request.get('/favicon.ico')).status()).toBe(200);
});
