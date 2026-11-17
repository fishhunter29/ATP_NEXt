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
