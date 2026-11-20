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
  for (const y of [0]) { // DEBUG
    await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(600);
    console.log('DEBUG', JSON.stringify(await page.evaluate(() => { const t = document.querySelector('.toast') as HTMLElement; if (!t) return 'no toast'; const b = t.querySelector('button')!; const r = (e: Element) => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map(Math.round); }; const br = b.getBoundingClientRect(); const hit = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2) as HTMLElement; const cs = getComputedStyle(t); const chain: string[] = []; for (let e: HTMLElement | null = t.parentElement; e; e = e.parentElement) { const c = getComputedStyle(e); chain.push(e.tagName + '.' + e.className + ':' + [c.transform, c.filter, c.backdropFilter, c.contain, c.willChange, c.overflow].join('/')); } return { toast: r(t), btn: r(b), hit: hit && hit.tagName + '.' + hit.className, hitText: hit && hit.textContent!.slice(0, 40), pos: cs.position, z: cs.zIndex, bottom: cs.bottom, anim: cs.animationName, text: t.textContent, inner: [innerWidth, innerHeight], vv: [visualViewport!.width, visualViewport!.height, visualViewport!.offsetLeft, visualViewport!.offsetTop, visualViewport!.scale], sw: document.documentElement.scrollWidth, sy: scrollY, chain, wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > 413 || e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 300).slice(0, 12).map((e) => e.tagName + '.' + (e as HTMLElement).className + ' ' + r(e) + ' sw' + e.scrollWidth), cta: [...document.querySelectorAll('.cta')].map((e) => r(e) + ' ' + getComputedStyle(e).zIndex), dock: r(document.querySelector('.atp-dock')!) }; })));
  }
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

/* ---------- Hindi ---------- */
for (const [w, h] of [[360, 780], [1440, 900]]) {
  test(`Hindi: main screens switch language and fit at ${w}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const fits = async (where: string) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${where} at ${w}px`).toBeLessThanOrEqual(1);
    // the language is chosen in Profile and remembered on the phone
    await page.goto('/profile');
    await page.getByRole('button', { name: 'हिंदी', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('अंडमान');
    await expect(page.getByRole('link', { name: /यात्रा/ }).first()).toBeVisible();
    await expect(page.getByText('आधे दिन और पूरे दिन की योजनाएँ')).toBeVisible();
    await fits('home');
    await page.getByText('नमूना यात्रा देखें').click();
    await expect(page).toHaveURL(/\/trip$/);
    await expect(page.locator('section.day').first()).toContainText('दिन');
    await expect(page.getByRole('button', { name: /यात्रा सेव करें/ })).toBeVisible();
    await fits('trip');
    await page.getByRole('button', { name: 'बदलें' }).first().click();
    await expect(page.getByRole('dialog', { name: 'यात्रा की तारीखें' })).toBeVisible();
    await fits('dates sheet');
    await page.keyboard.press('Escape');
    await page.goto('/checkout');
    await expect(page.getByText('मुख्य यात्री')).toBeVisible();
    await fits('checkout');
    // and back to English
    await page.goto('/profile');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/checkout');
    await expect(page.getByText('Lead traveller')).toBeVisible();
    await page.close();
  });
}

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
