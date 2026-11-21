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

test('checkout: the booking code and any renamed pass codes come back to the phone', async ({ page }) => {
  let sent: any = null;
  await page.route('**/api/bookings', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true, stored: true, code: 'ATP-TEST01', renamed: { [sent.items[0].code]: 'ATP-RENAMD' } } });
  });
  await page.goto('/plan');
  await page.getByRole('button', { name: /Build my trip/ }).click();
  await page.goto('/checkout');
  await page.locator('.atp-trav').first().waitFor();
  const n = await page.locator('.atp-trav').count();
  for (let i = 0; i < n; i++) { const t = page.locator('.atp-trav').nth(i); await t.locator('input').first().fill(['Priya Sharma', 'Arjun Sharma'][i] || `Guest ${i + 1}`); if (await t.getByLabel('Age').count()) await t.getByLabel('Age').fill('34'); await t.getByRole('radio', { name: 'Female', exact: true }).click(); }
  await page.fill('#lp', '+91 9876543210'); await page.fill('#le', 'priya@example.com');
  await page.getByRole('button', { name: /^Pay ₹/ }).click();
  await expect(page).toHaveURL(/my-trips/, { timeout: 10_000 });
  // what checkout sent adds up, with the trip's dates and every pass
  expect(sent.start).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(sent.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(Math.abs(sent.items.reduce((s: number, i: any) => s + (i.price || 0), 0) - sent.subtotal)).toBeLessThanOrEqual(1);
  expect(Math.abs(sent.subtotal + sent.fee + sent.gst - sent.total)).toBeLessThanOrEqual(1);
  expect(Math.abs(sent.fee - Math.round(sent.subtotal * 0.05))).toBeLessThanOrEqual(1); // the convenience fee
  expect(new Set(sent.items.map((i: any) => i.code)).size).toBe(sent.items.length);
  await expect(page.locator('.atp-rcpt')).toContainText('ATP-TEST01');
  // only the contact goes in `lead`; every traveller goes with the trip
  expect(Object.keys(sent.lead).sort()).toEqual(['email', 'name', 'phone']);
  expect(sent.trip.travellers.length).toBe(n);
  const codes = await page.evaluate(() => (window as any).__ATP__.S.booked.map((b: any) => b.code));
  expect(codes).toContain('ATP-RENAMD');
  expect(codes).not.toContain(sent.items[0].code);
});
