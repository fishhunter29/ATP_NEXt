import { expect, test } from '@playwright/test';

const PAGES = ['/', '/things-to-do', '/stays', '/cabs', '/charters', '/trips', '/plan', '/ferries', '/ferries/pbl-hav', '/islands/hav', '/things-to-do/acv-boat-eleph', '/stays/htl-hav-003', '/trips/p2', '/search', '/profile', '/my-trips'];

test('every main page opens without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const p of PAGES) {
    const r = await page.goto(p);
    expect(r?.status(), p).toBe(200);
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${p} is wider than the phone`).toBeLessThanOrEqual(2);
  }
  expect(errors).toEqual([]);
});

test('example trip loads and every day has a timeline', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.locator('section.day').first()).toBeVisible();
  expect(await page.locator('.ev').count()).toBeGreaterThan(10);
  await expect(page.locator('.tc-ferry').first()).toBeVisible();
});

test('build a trip, pay, and get passes', async ({ page }) => {
  await page.goto('/plan');
  await page.getByRole('button', { name: /Build my trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/checkout');
  await page.fill('#ln', 'Priya Sharma');
  await page.fill('#lp', '+91 9876543210');
  await page.fill('#le', 'priya@example.com');
  await page.getByRole('button', { name: /^Pay ₹/ }).click();
  await expect(page).toHaveURL(/my-trips/, { timeout: 10_000 });
  expect(await page.locator('.pass').count()).toBeGreaterThan(5);
});

test('add one thing from its page, then change and remove it', async ({ page }) => {
  await page.goto('/things-to-do/acv-boat-eleph');
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.locator('.tc-boat').first().click();
  await expect(page).toHaveURL(/trip\/edit/);
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page).toHaveURL(/\/trip$/);
});

test('pages for Google have titles, descriptions and a sitemap', async ({ page, request }) => {
  await page.goto('/islands/hav');
  await expect(page).toHaveTitle(/Havelock/);
  expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
  const sm = await request.get('/sitemap.xml');
  expect(sm.status()).toBe(200);
  expect((await sm.text()).split('<url>').length).toBeGreaterThan(400);
});

test('dates sheet: add a night and a child, totals and travellers update', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.getByRole('button', { name: 'Change' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Trip dates' })).toBeVisible();
  await page.getByRole('button', { name: 'One more night' }).click();
  await page.getByRole('button', { name: 'More Children' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.triphd .muted').first()).toContainText('1 child');
  await expect(page.locator('.triphd .eyebrow').first()).toContainText('6 nights');
});

test('price breakdown and fix-for-me sheets open and close', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await page.locator('.cta button.tot').click();
  await expect(page.getByRole('dialog', { name: 'Price breakdown' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('button.health.bad').click();
  await expect(page.getByRole('dialog', { name: 'Fixes' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
});

/* ---------- move & swap (the ⋮⋮ handle on a plan) ---------- */
const cartItem = (page: import('@playwright/test').Page, uid: string) =>
  page.evaluate((u) => { const it = (window as any).__ATP__.S.cart.find((x: any) => x.uid === u); return it ? { date: it.date, t: it.t, ref: it.ref } : null; }, uid);

async function openMove(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  const grip = page.locator('.lx-grip').first();
  const uid = (await grip.getAttribute('data-drag'))!;
  await grip.click();
  const dlg = page.getByRole('dialog', { name: 'Move or swap' });
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('We only show options that work');
  return { uid, dlg, before: (await cartItem(page, uid))! };
}

test('move sheet: move a plan to another day', async ({ page }) => {
  const { uid, dlg, before } = await openMove(page);
  const other = dlg.locator('.lx-mvrow.wrap .lx-mv').first();
  const label = (await other.locator('small').innerText()).split(' · ');
  await other.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = (await cartItem(page, uid))!;
  expect(after.date).not.toBe(before.date);
  expect(after.t).toBe(label[1]);
  expect(after.ref).toBe(before.ref);
});

test('move sheet: earlier or later on the same day', async ({ page }) => {
  const { uid, dlg, before } = await openMove(page);
  const btn = dlg.locator('.lx-mv:not([disabled])').first();
  const t = await btn.locator('small').innerText();
  await btn.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = (await cartItem(page, uid))!;
  expect(after.t).toBe(t);
});

test('move sheet: swap for something similar, then undo', async ({ page }) => {
  const { uid, dlg, before } = await openMove(page);
  const sw = dlg.locator('.lx-sw').first();
  const name = await sw.locator('b').innerText();
  await sw.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('Swapped for');
  expect((await cartItem(page, uid))!.ref).not.toBe(before.ref);
  await expect(page.locator('.ev', { hasText: name }).first()).toBeVisible();
  await page.locator('.toast').getByRole('button', { name: 'Undo' }).click();
  expect((await cartItem(page, uid))!.ref).toBe(before.ref);
});

test('move sheet: remove a plan', async ({ page }) => {
  const { uid, dlg } = await openMove(page);
  const n = await page.evaluate(() => (window as any).__ATP__.S.cart.length);
  await dlg.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('Removed');
  expect(await cartItem(page, uid)).toBeNull();
  expect(await page.evaluate(() => (window as any).__ATP__.S.cart.length)).toBeLessThan(n);
});

test('move sheet: open details goes to the edit page', async ({ page }) => {
  const { uid, dlg } = await openMove(page);
  await dlg.getByRole('button', { name: 'Open details' }).click();
  await expect(page).toHaveURL(new RegExp(`/trip/edit\\?uid=${uid}`));
});

/* ---------- after adding a ferry ---------- */
async function addFerry(page: import('@playwright/test').Page) {
  await page.goto('/ferries/pbl-hav');
  await page.locator('.lrow').first().click();
  await page.getByRole('button', { name: 'Add to trip' }).click();
  const dlg = page.getByRole('dialog', { name: 'Ferry added' });
  await expect(dlg).toBeVisible();
  return dlg;
}

test('ferry added: follow-up sheet offers stay, return and things to do', async ({ page }) => {
  const dlg = await addFerry(page);
  await expect(dlg).toContainText('Port Blair → Havelock');
  await expect(dlg.getByRole('button', { name: /Find a stay on Havelock/ })).toBeVisible();
  await expect(dlg.getByRole('button', { name: /Add return ferry/ })).toBeVisible();
  await expect(dlg.getByRole('button', { name: /Things to do on Havelock/ })).toBeVisible();
  const kinds = await page.evaluate(() => (window as any).__ATP__.S.cart.map((x: any) => x.kind));
  expect(kinds).toContain('ferry');
  await dlg.getByRole('button', { name: 'View my trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.locator('.tc-ferry').first()).toBeVisible();
});

test('ferry added: find a stay and add the return ferry', async ({ page }) => {
  let dlg = await addFerry(page);
  await dlg.getByRole('button', { name: /Find a stay on Havelock/ }).click();
  await expect(page).toHaveURL(/\/stays\?zone=HAV/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  dlg = await addFerry(page);
  await dlg.getByRole('button', { name: /Add return ferry/ }).click();
  await expect(page).toHaveURL(/\/ferries\/hav-pbl/);
  await page.goto('/ferries/pbl-hav');
  await page.locator('.lrow').first().click();
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await page.getByRole('dialog', { name: 'Ferry added' }).getByRole('button', { name: 'Keep browsing' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/ferries\/pbl-hav/);
});

/* ---------- day plans (half-day / full-day blocks) ---------- */
test('day plan: open from a free slot, pick another day, add it', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  const card = page.locator('.idc.blk').first();
  await expect(card).toBeVisible();
  const name = await card.locator('.idc-b b').innerText();
  await card.locator('.idc-art').click();
  const dlg = page.getByRole('dialog', { name });
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.pkrow').first()).toBeVisible();
  // another day re-times the plan (or explains why it does not fit)
  await dlg.locator('.daypick .dp[aria-pressed="false"]').first().click();
  await expect(dlg.locator('.pkrow').first()).toBeVisible();
  await dlg.locator('.daypick .dp').first().click();
  const n0 = await page.evaluate(() => (window as any).__ATP__.S.cart.length);
  const add = dlg.getByRole('button', { name: /^Add plan to / });
  if (await add.count()) {
    await add.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('bookings added to');
    expect(await page.evaluate(() => (window as any).__ATP__.S.cart.length)).toBeGreaterThan(n0);
  } else {
    await expect(dlg.locator('.fitbox.warn')).toBeVisible();
  }
});

test('day plan: add straight from the free slot, then undo', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  const n0 = await page.evaluate(() => (window as any).__ATP__.S.cart.length);
  await page.locator('.idc.blk').first().getByRole('button', { name: 'Add plan' }).click();
  await expect(page.locator('.toast')).toContainText('bookings added to');
  expect(await page.evaluate(() => (window as any).__ATP__.S.cart.length)).toBeGreaterThan(n0);
  await page.locator('.toast').getByRole('button', { name: 'Undo' }).click();
  expect(await page.evaluate(() => (window as any).__ATP__.S.cart.length)).toBe(n0);
});

/* ---------- planned trips: loading one over an existing trip asks first ---------- */
test('planned trip: replace my trip asks first, keep or replace', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/trips/p2');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  let dlg = page.getByRole('dialog', { name: 'Replace your current trip?' });
  await expect(dlg).toBeVisible();
  await dlg.getByRole('button', { name: 'Keep my trip' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/trips\/p2/);
  await page.getByRole('button', { name: /Use this trip/ }).click();
  dlg = page.getByRole('dialog', { name: 'Replace your current trip?' });
  await dlg.getByRole('button', { name: 'Replace with this plan' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.locator('.toast')).toContainText('Honeymoon by the lagoon');
});

test('planned trip: with an empty trip it loads straight away', async ({ page }) => {
  await page.goto('/trips/p1');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.locator('section.day').first()).toBeVisible();
});

test('plan for me replaces the trip instead of stacking on it', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/plan');
  await page.getByRole('button', { name: /Build my trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  const S = await page.evaluate(() => { const S = (window as any).__ATP__.S; return { ferries: S.cart.filter((i: any) => i.kind === 'ferry').length, saved: (S.trips || []).length }; });
  expect(S.ferries).toBeLessThanOrEqual(6);
  expect(S.saved).toBeGreaterThan(0);
});
