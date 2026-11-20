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
  await page.locator('button.atp-fr').first().click();
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
  await page.locator('button.atp-fr').first().click();
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
  // the suggestions that appear under the new booking must not push the page wider than the phone
  await expect(page.locator('.lx-pair').first()).toBeVisible();
  expect(await page.evaluate(() => { const a = document.querySelector('.app')!; return a.scrollWidth - a.clientWidth; })).toBeLessThanOrEqual(1);
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
  await expect(page.locator('.toast')).toContainText('Two Hearts, Three Islands');
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

/* ---------- trip tools ---------- */
async function example(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
}
const S = (page: import('@playwright/test').Page, f: string): Promise<any> => page.evaluate(new Function('return (' + f + ')((window).__ATP__)') as any);

test('vehicle chip: switch the day\'s cab rides to another car', async ({ page }) => {
  await example(page);
  const chip = page.locator('.lx-dt-row button[aria-expanded]').filter({ hasText: '▾' }).first();
  await chip.click();
  const panel = page.locator('.lx-dt-panel').first();
  await expect(panel).toContainText('Vehicle for');
  const opt = panel.locator('.lx-vopt[aria-pressed="false"]').first();
  const car = await opt.locator('b').innerText();
  const t0 = await S(page, 'E => E.total()');
  await opt.click();
  await expect(page.locator('.toast')).toContainText(`${car} on`);
  await expect(page.locator('.lx-dt-panel')).toHaveCount(0);
  expect(await S(page, 'E => E.total()')).not.toBe(t0);
  await expect(page.locator('.lx-dt-row').first()).toContainText(car);
});

test('scooter for the day replaces sightseeing cabs, and back to cabs', async ({ page }) => {
  await example(page);
  const chip = page.getByRole('button', { name: /Scooter or bike for the day/ }).first();
  await chip.click();
  await page.locator('.lx-dt-panel .lx-vopt').first().click();
  await expect(page.locator('.toast')).toContainText('booked for');
  expect(await S(page, "E => E.S.cart.filter(i => i.kind === 'rent').length")).toBe(1);
  await page.getByRole('button', { name: 'Back to cabs' }).first().click();
  expect(await S(page, "E => E.S.cart.filter(i => i.kind === 'rent').length")).toBe(0);
});

test('add a day after and before the trip', async ({ page }) => {
  await example(page);
  const n0 = await page.locator('section.day').count();
  await page.getByRole('button', { name: /Add a day after/ }).click();
  await expect(page.locator('.toast')).toContainText('you now fly home');
  await expect(page.locator('section.day')).toHaveCount(n0 + 1);
  await page.getByRole('button', { name: /Add a day before/ }).click();
  await expect(page.locator('.toast')).toContainText('you now arrive');
  await expect(page.locator('section.day')).toHaveCount(n0 + 2);
});

test('quick compare stays and switch hotel', async ({ page }) => {
  await example(page);
  await page.getByRole('button', { name: 'Quick compare' }).first().click();
  const panel = page.locator('.lx-dt-panel').filter({ hasText: 'Other stays on' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('trip total');
  const name = await panel.locator('.lx-vopt b').first().innerText();
  await panel.locator('.lx-vopt').first().click();
  await expect(page.locator('.toast')).toContainText(`Now staying at ${name}`);
  await expect(page.locator('.ev', { hasText: name }).first()).toBeVisible();
});

test('pairing rail appears after adding something, and hides', async ({ page }) => {
  await example(page);
  await page.goto('/things-to-do/ent-radhanagar');
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  const rail = page.locator('.lx-pair');
  await expect(rail).toBeVisible();
  await expect(rail).toContainText('Goes well with');
  const n = await S(page, 'E => E.S.cart.length');
  // tap it where a person would: rail in the middle of the screen. (Playwright's own click re-scrolls on a phone
  // and lands the button under the sticky price bar, then the rail's scroll-snap moves it, so it never settles.)
  await rail.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const add = rail.getByRole('button', { name: 'Add' }).first();
  const box = (await add.boundingBox())!;
  expect(await add.evaluate((b) => { const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('.toast')).toContainText('Added');
  expect(await S(page, 'E => E.S.cart.length')).toBeGreaterThan(n);
  // add something else from its page: a rail for it appears, and Hide removes it
  await page.goto('/things-to-do/ent-kalapathar');
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  if (await page.locator('.lx-pair').count()) {
    await page.locator('.lx-pair').getByRole('button', { name: 'Hide' }).evaluate((b: HTMLElement) => b.click());
    await expect(page.locator('.lx-pair')).toHaveCount(0);
  }
});

test('home and island pages list day plans, and one opens its sheet', async ({ page, request }) => {
  const home = await (await request.get('/')).text();
  expect(home).toContain('Half-day and full-day plans');
  expect(home).toContain('Elephant Beach with snorkelling');
  const hav = await (await request.get('/islands/hav')).text();
  expect(hav).toContain('Day plans on Havelock');
  expect(hav).not.toContain('Neil in a day');
  await page.goto('/islands/hav');
  await page.locator('.blkt').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('.pkrow').first()).toBeVisible();
});

/* ---------- light mode ---------- */
test('light mode: tabs, small labels and pass cards', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await page.goto('/trips');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // /trips is not the Trip tab
  await expect(page.locator('.dnav [aria-current="page"]')).toHaveCount(0);
  // faint text (tabs, step labels) is readable on the light background: at least 4.5:1
  const ratio = await page.evaluate(() => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = (v: number[]) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
    const probe = document.createElement('span'); probe.style.color = 'var(--faint)'; document.body.appendChild(probe);
    const fg = lum(rgb(getComputedStyle(probe).color)); const bg = lum(rgb(getComputedStyle(document.body).backgroundColor)); probe.remove();
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
  // pass cards in a row start at the same height
  await page.goto('/plan');
  await page.getByRole('button', { name: /Build my trip/ }).click();
  await page.goto('/checkout');
  await page.fill('#ln', 'Priya Sharma'); await page.fill('#lp', '+91 9876543210'); await page.fill('#le', 'priya@example.com');
  await page.getByRole('button', { name: /^Pay ₹/ }).click();
  await expect(page).toHaveURL(/my-trips/, { timeout: 10_000 });
  const tops = await page.locator('.passgrid').first().locator('.pass').evaluateAll((els) => els.slice(0, 3).map((e) => Math.round((e.firstElementChild as HTMLElement).getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await page.close();
});

/* ---------- shell (Tide): header, dock, day and night ---------- */
test('shell: header with the DPIIT line and a four-tab dock on the phone', async ({ page }) => {
  await page.goto('/');
  const head = page.locator('header.atp-brandbar');
  await expect(head).toContainText('Andaman Travel Planner');
  await expect(head).toContainText('DPIIT Recognised Startup · DIPP222255');
  await expect(head.getByRole('button', { name: 'Back' })).toHaveCount(0);
  const tabs = page.locator('.atp-dock .atp-tab');
  await expect(tabs).toHaveText(['Explore', 'Trip', 'My trips', 'Profile']);
  await expect(page.locator('.atp-dock [aria-current="page"]')).toHaveText('Explore');
  // the dock sits on the bottom edge, full width, and the header is solid
  const box = await page.locator('.atp-dock').boundingBox();
  const vp = page.viewportSize()!;
  expect(Math.abs(box!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.width - vp.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.y + box!.height - vp.height)).toBeLessThanOrEqual(1);
  // pages outside the four tabs get Back, and no tab is marked
  await page.goto('/stays');
  await expect(page.locator('header.atp-brandbar').getByRole('button', { name: 'Back' })).toBeVisible();
  await expect(page.locator('.atp-dock [aria-current="page"]')).toHaveCount(0);
});

test('shell: day is the default, night is chosen in Profile and remembered', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
  await page.goto('/profile');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Night', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 24, 27)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Phone setting', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.close();
});

test('shell: on a wide screen the tabs move into the header', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('/my-trips');
  await expect(page.locator('.atp-dock')).toBeHidden();
  await expect(page.locator('.dnav a')).toHaveText(['Explore', 'Trip', 'My trips', 'Profile']);
  await expect(page.locator('.dnav [aria-current="page"]')).toHaveText('My trips');
  await page.close();
});

/* ---------- Home and browsing (rebuild R3) ---------- */
test('home: everything is in the server HTML, and the plan box works', async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  for (const t of ['Andaman, planned to the minute.', 'Book one thing', 'Ready-made trips', 'First Light in the Andamans', 'Most loved', 'Why trips hold together'])
    expect(html, t).toContain(t);
  expect((html.match(/class="atp-isl"/g) || []).length).toBe(10);
  await page.goto('/');
  await expect(page.locator('.atp-hhero .atp-eyebrow')).toContainText(/Port Blair now · \d\d:\d\d · sunset \d\d:\d\d/);
  await expect(page.locator('.atp-today')).toContainText(/Sunrise\s*0[45]:\d\d/);
  await page.getByRole('button', { name: /When/ }).click();
  await expect(page.getByRole('dialog', { name: 'Trip dates' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.atp-kb', { hasText: 'Stays' }).click();
  await expect(page).toHaveURL(/\/stays$/);
  // with a trip under way, Home offers to carry on with it
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/');
  await expect(page.locator('.atp-cont')).toContainText('Your trip');
  await expect(page.locator('.atp-cont')).toContainText('₹');
});

test('things to do: categories, a sorted list in the address, Back, and search', async ({ page, request }) => {
  const html = await (await request.get('/things-to-do')).text();
  expect((html.match(/class="atp-bc"/g) || []).length, 'cards in the server HTML').toBeGreaterThan(40);
  await page.goto('/things-to-do');
  await expect(page.locator('.atp-cat')).toHaveCount(8);
  await page.getByRole('button', { name: /^Havelock/ }).click();
  await expect(page).toHaveURL(/\?island=hav$/);
  await expect(page.locator('.atp-bsec h2').first()).toHaveText('Most loved on Havelock');
  await page.getByRole('button', { name: /^See all \d+: Scuba diving$/ }).click();
  await expect(page).toHaveURL(/island=hav&cat=scuba/);
  await expect(page.locator('.atp-foc h2')).toContainText('Scuba diving on Havelock');
  expect(await page.locator('.atp-lrow').count()).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Lowest price' }).click();
  await expect(page).toHaveURL(/sort=price/);
  const prices = await page.locator('.atp-lrow .atp-bc-p b').evaluateAll((els) => els.map((e) => Number((e.textContent || '').replace(/\D/g, ''))));
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
  // a row opens the page for that thing
  await page.locator('.atp-lrow').first().click();
  await expect(page).toHaveURL(/\/things-to-do\/[a-z0-9-]+$/);
  await page.goBack();
  await expect(page.locator('.atp-foc')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.atp-foc')).toHaveCount(0);
  await expect(page.locator('.atp-cats')).toBeVisible();
  await page.getByRole('searchbox').fill('kayak');
  await expect(page.getByRole('status')).toContainText('on Havelock for “kayak”');
  expect(await page.locator('.atp-lrow').count()).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.locator('.atp-cats')).toBeVisible();
});

test('stays and trips: island, date and length carry through', async ({ page }) => {
  await page.goto('/stays?zone=NEI&date=2026-12-20');
  await expect(page.locator('.atp-seg2 [aria-pressed="true"]')).toContainText('Neil');
  await expect(page.locator('a.atp-bc').first()).toHaveAttribute('href', /\/stays\/htl-nei-[a-z0-9]+\?date=2026-12-20$/);
  await page.getByRole('button', { name: /^Wandoor/ }).count().then((n) => expect(n).toBe(0)); // no stays there, so no button
  await page.goto('/trips');
  await expect(page.locator('.atp-bsec h2').first()).toContainText('Our picks');
  await page.getByRole('button', { name: /^7\+ nights/ }).click();
  await expect(page).toHaveURL(/len=long/);
  await page.locator('.atp-cat').first().click();
  const nights = await page.locator('.atp-lrow').evaluateAll((els) => els.map((e) => Number((e.textContent || '').match(/· (\d+) nights|(\d+) days/)?.[2] || 0)));
  expect(nights.length).toBeGreaterThan(0);
  expect(Math.min(...nights)).toBeGreaterThanOrEqual(8); // 7 nights is 8 days
});

test('ferries, cabs and island pages', async ({ page }) => {
  await page.goto('/ferries');
  await expect(page.locator('.atp-route')).toHaveCount(6);
  await page.locator('.atp-route').first().click();
  await expect(page).toHaveURL(/\/ferries\/pbl-hav$/);
  const all = await page.locator('button.atp-fr').count();
  await page.getByRole('button', { name: /^Midday/ }).click();
  expect(await page.locator('button.atp-fr').count()).toBeLessThan(all);
  await page.goto('/cabs?zone=HAV');
  await expect(page.locator('.atp-seg2 [aria-pressed="true"]')).toContainText('Havelock');
  await page.locator('#cab-rent button.atp-fr').first().click();
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/islands/hav');
  await expect(page.locator('h1')).toHaveText('Havelock');
  await expect(page.locator('.atp-facts')).toContainText('Best for');
  await page.getByRole('link', { name: /^All \d+$/ }).first().click();
  await expect(page).toHaveURL(/\/things-to-do\?island=hav$/);
  await expect(page.locator('.atp-seg2 [aria-pressed="true"]')).toContainText('Havelock');
});

test('detail pages: what is included, rooms and the day-by-day plan', async ({ page }) => {
  await page.goto('/things-to-do/acv-dsd-hav-shore');
  await expect(page.getByRole('heading', { name: 'How the day goes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Included', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to trip' })).toBeVisible();
  await page.goto('/stays/htl-hav-004');
  await expect(page.locator('.atp-rooms li').first()).toContainText('a night');
  await page.goto('/trips/p2');
  await expect(page.locator('.atp-fits')).toContainText('0 clashes');
  expect(await page.locator('.atp-dd-h').count()).toBe(6);
});
