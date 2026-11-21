import { expect, test } from '@playwright/test';

const PAGES = ['/', '/things-to-do', '/stays', '/cabs', '/charters', '/trips', '/plan', '/ferries', '/ferries/pbl-hav', '/islands/hav', '/things-to-do/acv-boat-eleph', '/stays/htl-hav-003', '/trips/p2', '/search', '/profile', '/my-trips'];

/* Long trips open folded, one line a day. Most tests look inside the days, so they start with every day open;
   the test for folding itself asks for the normal behaviour ('auto'). */
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { if (!sessionStorage.getItem('atp_days')) sessionStorage.setItem('atp_days', 'all'); } catch {} }); });

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
  await expect(page.locator('section.atp-dsec').first()).toBeVisible();
  expect(await page.locator('.atp-item').count()).toBeGreaterThan(10);
  await expect(page.locator('.atp-pass').first()).toBeVisible();
});

/* Checkout asks for every traveller when the trip has a ferry (the operators' passenger list). */
async function fillTravellers(page: import('@playwright/test').Page) {
  const names = ['Priya Sharma', 'Arjun Sharma', 'Mira Sharma', 'Dev Sharma', 'Asha Sharma', 'Ravi Sharma'];
  await page.locator('.atp-trav').first().waitFor();
  const n = await page.locator('.atp-trav').count();
  for (let i = 0; i < n; i++) {
    const t = page.locator('.atp-trav').nth(i);
    await t.locator('input').first().fill(names[i] || `Guest ${i + 1}`);
    if (await t.getByLabel('Age').count()) await t.getByLabel('Age').fill(String(36 - i));
    if (await t.getByRole('radiogroup').count()) await t.getByRole('radio', { name: i % 2 ? 'Male' : 'Female', exact: true }).click();
  }
  await page.fill('#lp', '+91 9876543210');
  await page.fill('#le', 'priya@example.com');
}

/* Checkout opens WhatsApp in a new tab; the tests keep the address it would open instead. */
const catchWhatsApp = (page: import('@playwright/test').Page) => page.addInitScript(() => { (window as any).open = (u: string) => { (window as any).__opened = u; return null; }; });
const opened = async (page: import('@playwright/test').Page) => decodeURIComponent(String(await page.evaluate(() => (window as any).__opened || '')).split('text=')[1] || '');
/* Tickets as they will be once a trip is confirmed and paid: made straight from the trip, the way checkout will. */
const seedTickets = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const E = (window as any).__ATP__; const cart = E.S.cart.slice(); E.bookAll();
  E.S.booked.forEach((b: any, i: number) => { const it = cart[i]; if (!it) return; b.ref = it.ref; if (it.cls) b.cls = it.cls; if (it.nights) b.nights = it.nights; if (it.kind === 'ferry' && E.SAIL[it.ref]) b.arr = E.SAIL[it.ref].arr; });
  E.S.cart = []; E.S.win = null; E.save();
});

test('build a trip and send it for confirmation: nothing is paid, the whole trip goes on WhatsApp', async ({ page }) => {
  await catchWhatsApp(page);
  let posted = false; await page.route('**/api/bookings', (r) => { posted = true; return r.abort(); });
  await page.goto('/plan');
  await page.getByRole('button', { name: /Build my trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/checkout');
  // the promise is on the page before anything is asked for
  await expect(page.locator('.atp-promisebox')).toContainText('Confirmed in 30 minutes. Nothing to pay now.');
  for (const t of ['Confirmed in 30 minutes', 'The best price in India', 'No sales calls', 'With you all the way']) await expect(page.locator('.atp-promisebox')).toContainText(t);
  await expect(page.getByRole('button', { name: /^Pay/ })).toHaveCount(0);
  await expect(page.locator('.atp-co')).not.toContainText('Test mode');
  await fillTravellers(page);
  const total = (await page.locator('.atp-tl.is-total b').textContent())!.trim();
  await page.getByRole('button', { name: 'Send for confirmation' }).click();
  // the message is complete: reference, dates, route, total, every traveller, contact and the link to the plan
  const msg = await opened(page);
  expect(await page.evaluate(() => (window as any).__opened)).toMatch(/^https:\/\/wa\.me\/919933270842\?text=/);
  expect(msg).toMatch(/^Hi Andaman Travel Planner, please confirm this trip\. Ref ATP-[2-9A-Z]{6}\n/);
  expect(msg).toContain(`Total ${total} including GST and fee`);
  expect(msg).toContain('Travellers: Priya Sharma (36, F); Arjun Sharma (35, M)');
  expect(msg).toContain('Contact: +91 9876543210 · priya@example.com');
  expect(msg).toMatch(/Plan: http[^\s]+\/trip\/shared#[zj][\w-]+$/);
  expect(msg).not.toMatch(/passport/i);
  // what the traveller sees next: one tap left, then what happens and when
  await expect(page.getByRole('heading', { name: 'Press Send in WhatsApp and you are done' })).toBeVisible();
  const ref = (await page.locator('.atp-sent .atp-sh-tag').innerText()).replace(/ref /i, '');
  expect(msg).toContain(ref);
  await expect(page.locator('.atp-track')).toContainText('Every booking confirmed within 30 minutes');
  await expect(page.locator('.atp-track')).toContainText('You pay once, after it is all confirmed');
  expect(await page.getByRole('link', { name: 'Open WhatsApp' }).getAttribute('href')).toContain('wa.me/919933270842');
  expect(await page.getByRole('link', { name: 'Send it by email instead' }).getAttribute('href')).toMatch(/^mailto:info@andamantravelplanner\.com\?subject=/);
  // it survives a reload, the trip is still in the planner, and nothing was booked or posted
  await page.reload();
  await expect(page.locator('.atp-sent .atp-sh-tag')).toContainText(ref);
  expect(await S(page, '(E) => E.S.cart.length')).toBeGreaterThan(5);
  expect(await S(page, '(E) => E.S.booked.length')).toBe(0);
  expect(posted).toBe(false);
  // My trips shows it as waiting, with the same reference
  await page.goto('/my-trips');
  await expect(page.locator('.atp-reqcard')).toContainText('Waiting for our confirmation');
  await expect(page.locator('.atp-reqcard')).toContainText(ref);
  await expect(page.locator('.atp-vch')).toHaveCount(0);
  // changing the trip brings the form back, and the reference is kept for the new version
  await page.goto('/things-to-do/acv-boat-eleph');
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Who’s travelling' })).toBeVisible();
  await expect(page.locator('#ln')).toHaveValue('Priya Sharma');
  await page.getByRole('button', { name: 'Send for confirmation' }).click();
  expect(await opened(page)).toContain(ref);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('my trips: tickets day by day, ferries as boarding passes, cab rides as one row, a calendar file', async ({ page }) => {
  await page.goto('/plan');
  await page.getByRole('button', { name: /Build my trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await seedTickets(page);
  await page.goto('/my-trips');
  await expect(page.getByRole('heading', { name: 'My trips' })).toBeVisible();
  expect(await page.locator('.atp-vch').count()).toBeGreaterThan(5);
  // ferries are boarding passes; a tap shows the code to scan
  const pass = page.locator('.atp-vch .atp-pass').first();
  await pass.click();
  await expect(page.locator('.atp-vopen .atp-qr svg')).toBeVisible();
  await expect(page.locator('.atp-vcode')).toHaveText(/^ATP-/);
  // the day's cab rides are one row
  const cab = page.locator('.atp-vrow', { hasText: /Cab · \d+ rides?/ }).first();
  await cab.click();
  expect(await page.locator('.atp-rides li').count()).toBeGreaterThan(0);
  // the whole trip as a calendar file
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add to calendar' }).click()]);
  expect(file.suggestedFilename()).toBe('andaman-trip.ics');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('checkout: missing details are marked, the price opens by kind, and one contact is enough without a ferry', async ({ page }) => {
  await catchWhatsApp(page);
  await page.goto('/plan');
  await page.getByRole('button', { name: /Build my trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Who’s travelling' })).toBeVisible();
  // the Pay bar sits on the screen, joined to the dock, not at the end of the page (same on the Trip page)
  const joined = async () => { await page.waitForTimeout(400); const bar = await page.locator('.cta').boundingBox(); const dock = await page.locator('.atp-dock').boundingBox(); return Math.abs(bar!.y + bar!.height - dock!.y); };
  expect(await joined()).toBeLessThanOrEqual(2);
  await page.goto('/trip');
  await expect(page.locator('.cta')).toBeVisible();
  expect(await joined()).toBeLessThanOrEqual(2);
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Who’s travelling' })).toBeVisible();
  expect(await page.locator('.atp-trav').count()).toBeGreaterThan(1);
  // nothing filled: every missing detail is named, and nothing is booked
  await page.getByRole('button', { name: 'Send for confirmation' }).click();
  await expect(page.locator('.toast')).toContainText('missing');
  expect(await page.locator('.atp-err').count()).toBeGreaterThan(3);
  await expect(page.locator('#ln')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/checkout/);
  // the price by kind of booking, each line with its partner
  const stays = page.locator('.atp-brk-h', { hasText: 'Stays' });
  await stays.click();
  await expect(stays).toHaveAttribute('aria-expanded', 'true');
  expect(await page.locator('.atp-brk-l li').count()).toBeGreaterThan(0);
  const money = (t: string | null) => Number((t || '').replace(/[^0-9]/g, ''));
  const sub = money(await page.locator('.atp-tl', { hasText: 'Subtotal' }).locator('b').textContent());
  const gst = money(await page.locator('.atp-tl', { hasText: 'GST' }).locator('b').textContent());
  const fee = money(await page.locator('.atp-tl', { hasText: 'Convenience fee' }).locator('b').textContent());
  const tot = money(await page.locator('.atp-tl.is-total b').textContent());
  expect(Math.abs(sub + fee + gst - tot)).toBeLessThanOrEqual(1);
  // the fee is shown as an amount, with what it pays for; the rate is not printed
  expect(Math.abs(fee - Math.round(sub * 0.05))).toBeLessThanOrEqual(1);
  await expect(page.locator('.atp-feenote')).toContainText('We manage everything on the ground');
  await expect(page.locator('.atp-feenote')).not.toContainText('%');
  await expect(page.locator('.atp-tl', { hasText: 'Convenience fee' })).not.toContainText('%');
  await expect(page.locator('.atp-co')).toContainText('If plans change');
  await expect(page.locator('.atp-co')).toContainText('You pay once, when everything is confirmed');
  // foreign travellers are not asked for passport numbers here; the team asks on WhatsApp
  await page.getByRole('switch', { name: /Indian national/ }).click();
  await expect(page.getByLabel('Passport number')).toHaveCount(0);
  // a business trip asks for a GSTIN and checks its shape
  await page.getByRole('switch', { name: /Business trip/ }).click();
  await page.getByLabel('Company GSTIN').fill('123');
  await page.getByRole('button', { name: 'Send for confirmation' }).click();
  await expect(page.locator('[data-f="gstin"] .atp-err')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  // one activity, no ferry: one contact is enough
  await page.evaluate(() => localStorage.clear());
  await page.goto('/things-to-do/acv-boat-eleph');
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/checkout');
  await expect(page.locator('.atp-trav')).toHaveCount(1);
  await expect(page.getByLabel('Age')).toHaveCount(0);
  await fillTravellers(page);
  await page.getByRole('button', { name: 'Send for confirmation' }).click();
  await expect(page.getByRole('heading', { name: 'Press Send in WhatsApp and you are done' })).toBeVisible();
  expect(await opened(page)).toMatch(/Travellers: Priya Sharma\n/);
});

test('search: results stay in their groups and the words stay in the address', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByRole('searchbox', { name: 'Search' })).toBeFocused();
  await expect(page.locator('.atp-srch-g')).toHaveCount(0);
  await page.getByRole('button', { name: 'Scuba', exact: true }).click();
  await expect(page.locator('.atp-srch-g').first()).toBeVisible();
  await expect(page).toHaveURL(/q=Scuba/);
  await page.getByRole('searchbox', { name: 'Search' }).fill('beach');
  await expect(page.getByRole('region', { name: 'Things to do' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Stays' })).toBeVisible();
  expect(await page.getByRole('region', { name: 'Things to do' }).locator('.atp-lrow').count()).toBeLessThanOrEqual(5);
  await page.getByRole('link', { name: /See all \d+ in things to do/ }).click();
  await expect(page).toHaveURL(/things-to-do\?q=beach/);
  await page.goBack();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('beach');
  await page.getByRole('searchbox', { name: 'Search' }).fill('zzzz');
  await expect(page.getByRole('status')).toContainText('Nothing found');
});

test('add one thing from its page, then change and remove it', async ({ page }) => {
  await page.goto('/things-to-do/acv-boat-eleph');
  await page.getByRole('button', { name: 'Add to trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.locator('.atp-item[data-c="boat"] .atp-row').first().click();
  // a tap opens every way to change it; the full page is one step further
  await page.getByRole('dialog', { name: 'Move or swap' }).getByRole('button', { name: 'Open details' }).click();
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
  await expect(page.locator('.atp-thead .atp-pax')).toContainText('1 child');
  await expect(page.locator('.atp-thead .atp-eyebrow')).toContainText('6 nights');
});

test('price breakdown and fix-for-me sheets open and close', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await page.locator('.cta button.tot').click();
  await expect(page.getByRole('dialog', { name: 'Price breakdown' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // the close button does the same, and focus goes back to what opened the sheet
  await page.locator('.cta button.tot').click();
  await page.getByRole('dialog', { name: 'Price breakdown' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.cta button.tot')).toBeFocused();
  await page.getByRole('button', { name: 'Review the fixes' }).click();
  await expect(page.getByRole('dialog', { name: 'Fixes' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
});

/* ---------- move & swap (the ⋮⋮ handle on a plan) ---------- */
const cartItem = (page: import('@playwright/test').Page, uid: string) =>
  page.evaluate((u) => { const it = (window as any).__ATP__.S.cart.find((x: any) => x.uid === u); return it ? { date: it.date, t: it.t, ref: it.ref } : null; }, uid);

/* free-time ideas are one line until asked for: open every one on the page */
async function showIdeas(page: import('@playwright/test').Page) {
  const more = page.getByRole('button', { name: /^See \d+ ideas?$/ });
  await expect(more.first()).toBeVisible();
  for (let n = await more.count(); n > 0; n--) await more.first().click();
}

async function openMove(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  const grip = page.locator('.atp-grip').first();
  const uid = (await grip.locator('xpath=..').getAttribute('data-uid'))!;
  // moving is never a drag: sliding a finger from the Move button does nothing
  expect(await page.locator('[data-drag]').count()).toBe(0);
  const gb = (await grip.boundingBox())!;
  await page.mouse.move(gb.x + 10, gb.y + 10); await page.mouse.down(); await page.mouse.move(gb.x + 10, gb.y + 260, { steps: 6 }); await page.mouse.up();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.locator('.lx-ghost, .lx-dropline').count()).toBe(0);
  await grip.click();
  const dlg = page.getByRole('dialog', { name: 'Move or swap' });
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('Nothing changes until you do');
  return { uid, dlg, before: (await cartItem(page, uid))! };
}

test('move sheet: move a plan to another day', async ({ page }) => {
  const { uid, dlg, before } = await openMove(page);
  const move = dlg.getByRole('button', { name: /^(Move to Day|Choose another day or time)/ });
  await expect(move).toBeDisabled(); // nothing chosen yet, nothing to move
  const i = await dlg.locator('.atp-mvday').evaluateAll((els) => els.findIndex((e) => !(e as HTMLButtonElement).disabled && e.getAttribute('aria-checked') === 'false'));
  expect(i, 'another day can take it').toBeGreaterThanOrEqual(0);
  const other = dlg.locator('.atp-mvday').nth(i);
  await other.click();
  await expect(other).toHaveAttribute('aria-checked', 'true');
  // every time the plan can run on that day is listed; one is already chosen
  expect(await dlg.locator('.atp-mvt').count()).toBeGreaterThan(1);
  const t = (await dlg.locator('.atp-mvt[aria-checked="true"]').innerText()).slice(0, 5);
  await expect(move).toHaveText(new RegExp(`^Move to Day \\d+ · ${t}$`));
  expect((await cartItem(page, uid))!.date).toBe(before.date); // still not moved
  await move.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = (await cartItem(page, uid))!;
  expect(after.date).not.toBe(before.date);
  expect(after.t).toBe(t);
  expect(after.ref).toBe(before.ref);
});

test('move sheet: earlier or later on the same day', async ({ page }) => {
  const { uid, dlg, before } = await openMove(page);
  const btn = dlg.locator('.atp-mvt:not([disabled])[aria-checked="false"]').first();
  const t = (await btn.innerText()).slice(0, 5);
  await btn.click();
  await dlg.getByRole('button', { name: `Move to Day ${(await dlg.locator('.atp-mvday[aria-checked="true"] b').innerText()).replace('Day ', '')} · ${t}` }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = (await cartItem(page, uid))!;
  expect(after.t).toBe(t);
  expect(after.date).toBe(before.date);
  // a time can be typed where the plan is not tied to set departures; one that clashes is refused with the reason
  await page.locator(`.atp-item[data-uid="${uid}"] .atp-grip`).click();
  const again = page.getByRole('dialog', { name: 'Move or swap' });
  const typed = again.getByLabel('Type a time');
  if (await typed.count()) {
    await typed.fill('02:15');
    await again.getByRole('button', { name: /^Move to Day \d+ · 02:15$/ }).click();
    await expect(again.getByRole('alert')).toContainText('02:15 is outside its hours');
    expect((await cartItem(page, uid))!.t).toBe(t);
  }
});

test('move sheet: swap for something similar, then undo', async ({ page }) => {
  const { uid, dlg, before } = await openMove(page);
  const sw = dlg.locator('.lx-sw').first();
  const name = await sw.locator('b').innerText();
  await sw.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('Swapped for');
  expect((await cartItem(page, uid))!.ref).not.toBe(before.ref);
  await expect(page.locator('.atp-item', { hasText: name }).first()).toBeVisible();
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
  await expect(page.locator('.atp-pass').first()).toBeVisible();
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
  await showIdeas(page);
  const card = page.locator('.atp-idea.is-plan').first();
  await expect(card).toBeVisible();
  const name = await card.locator('.atp-idea-b > b').innerText();
  await card.locator('.atp-idea-ph').click();
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
  await showIdeas(page);
  await page.locator('.atp-idea.is-plan').first().getByRole('button', { name: 'Add plan' }).click();
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
  await expect(page.locator('section.atp-dsec').first()).toBeVisible();
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
/* the engine loads after the page; wait for it before reading from it */
const S = async (page: import('@playwright/test').Page, f: string): Promise<any> => { await page.waitForFunction(() => !!(window as any).__ATP__); return page.evaluate(new Function('return (' + f + ')((window).__ATP__)') as any); };

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
  const n0 = await page.locator('section.atp-dsec').count();
  await page.getByRole('button', { name: /Add a day after/ }).click();
  await expect(page.locator('.toast')).toContainText('you now fly home');
  await expect(page.locator('section.atp-dsec')).toHaveCount(n0 + 1);
  await page.getByRole('button', { name: /Add a day before/ }).click();
  await expect(page.locator('.toast')).toContainText('you now arrive');
  await expect(page.locator('section.atp-dsec')).toHaveCount(n0 + 2);
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
  await expect(page.locator('.atp-item', { hasText: name }).first()).toBeVisible();
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
test('light mode: tabs, small labels, checkout and My trips on a wide screen', async ({ browser }) => {
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
  // on a wide screen the price sits beside the form, and in My trips the days sit three in a row
  const price = await page.locator('.atp-coside').boundingBox(); const who = await page.locator('.atp-trav').first().boundingBox();
  expect(price!.x).toBeGreaterThan(who!.x + who!.width);
  await expect(page.locator('.atp-coside').getByRole('button', { name: 'Send for confirmation' })).toBeVisible();
  await seedTickets(page);
  await page.goto('/my-trips');
  await page.locator('.atp-vlist .atp-vday').nth(2).waitFor();
  const tops = await page.locator('.atp-vlist .atp-vday').evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(tops.length).toBe(3); expect(new Set(tops).size).toBe(1);
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
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 240, 228)'); // warm paper, not pure white
  await page.getByRole('button', { name: 'Night', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(25, 22, 19)');
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
  for (const t of ['Andaman, planned to the minute.', 'Book one thing', 'Signature experiences', 'Barren Island volcano', 'Ready-made trips', 'First Light in the Andamans', 'Most loved', 'Why trips hold together'])
    expect(html, t).toContain(t);
  expect((html.match(/class="atp-isl"/g) || []).length).toBe(10);
  await page.goto('/');
  await expect(page.locator('.atp-hhero .atp-eyebrow')).toContainText(/Port Blair now · \d\d:\d\d · sunset \d\d:\d\d/);
  await expect(page.locator('.atp-today')).toContainText(/Sunrise\s*0[45]:\d\d/);
  await page.getByRole('button', { name: 'Exact dates' }).click();
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
  // the list is re-sorted a moment after the address changes
  await expect.poll(async () => { const prices = await page.locator('.atp-lrow .atp-bc-p b').evaluateAll((els) => els.map((e) => Number((e.textContent || '').replace(/\D/g, '')))); return prices.length > 10 && prices.every((v, i) => i === 0 || prices[i - 1] <= v); }).toBe(true);
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

/* ---------- Trip page (rebuild R4) ---------- */
test('trip: cab loops, photos in the itinerary and the day rail', async ({ page }) => {
  await page.goto('/trips/p2');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.locator('.atp-fits')).toContainText('It all fits');
  await expect(page.locator('.atp-rail .atp-day')).toHaveCount(6);
  expect(await page.locator('.atp-banner').count()).toBeGreaterThanOrEqual(3); // one photo banner each time the island changes
  expect(await page.locator('.atp-pano').count()).toBeGreaterThan(4);
  // one cab's outing is one block: its stops inside, the rides on a tap, one price
  const loop = page.locator('.atp-loop').first();
  await expect(loop.locator('.atp-n').first()).toContainText(/One cab · \d stop/);
  await expect(loop.locator('.atp-lroute')).toContainText('→');
  await expect(loop.locator('.atp-p').first()).toContainText('₹');
  await loop.locator('.atp-row[aria-expanded]').click();
  await expect(loop.locator('.atp-legs button').first()).toBeVisible();
  expect(await page.evaluate(() => { const a = document.querySelector('.app')!; return a.scrollWidth - a.clientWidth; })).toBeLessThanOrEqual(1);
});

test('trip: the ferry pass opens the class, there are no seats to pick, and the total follows', async ({ page }) => {
  await page.goto('/trips/p2');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  const pass = page.locator('.atp-pass').first();
  await expect(pass).toContainText('Be there by');
  // no seat numbers: our team asks for them when it books the ticket
  await expect(pass.locator('.atp-pass-stub')).toContainText('We ask you');
  await expect(page.locator('.atp-item', { has: pass }).first()).toContainText('Booked by us within 15 min');
  const total = () => page.evaluate(() => (window as any).__ATP__.total());
  const before = await total();
  await pass.click();
  const dlg = page.getByRole('dialog', { name: 'Ferry class' });
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.atp-seat')).toHaveCount(0);
  await expect(dlg).toContainText('Booked by us within 15 minutes');
  await expect(dlg).toContainText('We ask you directly which seats');
  await dlg.getByRole('radio').nth(1).click();
  const cls = await dlg.getByRole('radio').nth(1).locator('b').innerText();
  await dlg.getByRole('button', { name: `Use ${cls}` }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(pass).toContainText(cls, { ignoreCase: true });
  expect(await total()).toBeGreaterThan(before);
  expect(await page.evaluate(() => (window as any).__ATP__.S.cart.filter((i: any) => i.kind === 'ferry')[0].seats)).toBeUndefined();
  // Escape closes without changing anything
  await pass.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // the photos in the itinerary are still there after the sheet has come and gone
  await page.locator('.atp-banner').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.atp-banner svg[data-on]').first()).toBeVisible();
});

test('trip: eating out is optional, timed into the day and paid there', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  const day = page.locator('section.atp-dsec').nth(2);
  await expect(day.locator('.atp-eat')).toContainText('Eat out?');
  await expect(day.locator('.atp-eatc', { hasText: 'Lunch' })).toContainText(/cab waits ~₹\d+/);
  const before = await page.evaluate(() => (window as any).__ATP__.total());
  await day.locator('.atp-eatc', { hasText: 'Lunch' }).click();
  await expect(page.locator('.toast')).toContainText('Lunch added at');
  await expect(day.locator('.atp-mealrow')).toContainText('Pay there');
  await expect(day.locator('.atp-mealrow')).toContainText('if the cab waits, about ₹');
  await expect(day.locator('.atp-eatc', { hasText: 'Lunch' })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__ATP__.total())).toBe(before); // a meal out adds nothing to what you pay us
});

test('trip: survives a reload, tips fold away, and one tap adds the missing cabs', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Show me an example trip').click();
  await expect(page).toHaveURL(/\/trip$/);
  const days = await page.locator('section.atp-dsec').count();
  await page.reload();
  await expect(page.locator('section.atp-dsec')).toHaveCount(days); // the trip is still there after a refresh
  // a tip is one line until opened; what does not fit is spelled out
  const tip = page.locator('details.atp-alert').first();
  await expect(tip.locator('.atp-acts')).toBeHidden();
  await tip.locator('summary').click();
  await expect(tip.locator('.atp-acts')).toBeVisible();
  await expect(page.locator('.atp-alert.is-hard').first()).toContainText('Does not fit');
  // stops with no ride: one button books a cab for each, and it can be undone
  await expect(page.locator('.atp-loop')).toHaveCount(0);
  await expect(page.locator('.atp-ride')).toContainText('no ride yet');
  const total = () => page.evaluate(() => (window as any).__ATP__.total());
  const before = await total();
  await page.locator('.atp-ride').getByRole('button', { name: 'Add cabs' }).click();
  await expect(page.locator('.toast')).toContainText('Cabs added for');
  await expect(page.locator('.atp-ride')).toHaveCount(0);
  expect(await page.locator('.atp-loop').count()).toBeGreaterThan(1);
  expect(await total()).toBeGreaterThan(before);
  // a tap on a plan opens every way to change it
  await page.locator('.atp-item[data-c="do"] .atp-row').first().click();
  await expect(page.getByRole('dialog', { name: 'Move or swap' })).toBeVisible();
});

/* ---------- R6: plan in three taps, folded days, sharing on the site, maps, WhatsApp ---------- */
const WA = 'https://wa.me/919933270842?text=';
const waText = async (l: import('@playwright/test').Locator) => decodeURIComponent(((await l.getAttribute('href')) || '').replace(WA, ''));

test('home: plan my trip in three taps builds the whole trip', async ({ page }) => {
  await page.goto('/');
  const plan = page.locator('.atp-plan');
  await expect(plan.getByRole('radiogroup', { name: 'When' }).getByRole('radio').first()).toBeVisible();
  // the button is on the first screen of a phone, above the tabs
  const box = await plan.getByRole('button', { name: 'Build my trip' }).boundingBox(); const dock = await page.locator('.atp-dock').boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(dock!.y);
  await plan.getByRole('radiogroup', { name: 'When' }).getByRole('radio').nth(2).click();
  await plan.getByRole('radio', { name: /Family/ }).click();
  await plan.getByRole('radio', { name: /Relaxed/ }).click();
  await plan.getByRole('button', { name: 'One night less' }).click();
  await expect(plan.locator('.atp-pnights')).toContainText('4 nights');
  await plan.getByRole('button', { name: 'Build my trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.locator('.atp-thead')).toContainText('2 adults · 2 children');
  await expect(page.locator('.atp-thead')).toContainText('4 nights');
  await expect(page.locator('.atp-nudge')).toContainText('These dates are a guess');
  expect(await S(page, '(E) => E.S.pace')).toBe('relaxed');
  expect(await page.locator('section.atp-dsec').count()).toBe(5);
  // the full page adds the kind of trip and the class of stay
  await page.goto('/plan');
  await expect(page.getByRole('radiogroup', { name: 'The kind of trip' })).toBeVisible();
  await page.getByRole('radio', { name: 'Premium' }).click();
  await page.getByRole('button', { name: 'Build my trip' }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await expect(page.locator('.toast')).toContainText('saved in My trips');
});

test('trip: a long trip opens as one line a day', async ({ page }) => {
  await page.addInitScript(() => { try { if (sessionStorage.getItem('atp_days') === 'all') sessionStorage.setItem('atp_days', 'auto'); } catch {} });
  await page.goto('/trips/p2');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  const days = page.locator('section.atp-dsec');
  await expect(days).toHaveCount(6);
  await expect(page.locator('section.atp-dsec.is-open')).toHaveCount(1);
  await expect(page.locator('section.atp-dsec.is-folded')).toHaveCount(5);
  // a folded day says what happens, how many plans and what it costs
  const sum = days.nth(1).locator('.atp-dsum');
  await expect(sum).toContainText('Ferry to Havelock');
  await expect(sum.locator('.atp-dsum-m')).toContainText(/\d plans? · \d\d:\d\d/);
  await expect(sum.locator('.atp-dsum-m')).toContainText('₹');
  expect(await days.nth(1).locator('.atp-item').count()).toBe(0);
  await sum.click();
  await expect(days.nth(1)).toHaveClass(/is-open/);
  expect(await days.nth(1).locator('.atp-item').count()).toBeGreaterThan(2);
  await expect(days.nth(1).locator('.atp-dtog')).toHaveAttribute('aria-expanded', 'true');
  // the day rail opens the day it jumps to
  await page.locator('.atp-rail .atp-day').nth(3).click();
  await expect(days.nth(3)).toHaveClass(/is-open/);
  // which days are open is remembered when you come back
  await page.goto('/my-trips'); await page.goto('/trip');
  await expect(page.locator('section.atp-dsec.is-open')).toHaveCount(3);
  await page.getByRole('button', { name: 'Open all days' }).click();
  await expect(page.locator('section.atp-dsec.is-folded')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close all days' }).click();
  await expect(page.locator('section.atp-dsec.is-folded')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('sharing: the link opens the plan on the site, and it can become your own trip', async ({ page, browser }) => {
  await page.goto('/trips/p2');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  const total = (await page.locator('.cta button.tot b').first().textContent())!.trim();
  await page.getByRole('button', { name: /Planning with others/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Share this plan' });
  await expect(sheet).toBeVisible();
  const url = await sheet.getByLabel('The link to this plan').inputValue();
  expect(url).toMatch(/\/trip\/shared#[zj][\w-]+$/);
  expect(url.length).toBeLessThan(2500);
  // nothing personal travels in the link's address path or query, only after the #
  expect(new URL(url).search).toBe('');
  expect(await sheet.getByRole('link', { name: 'Send on WhatsApp' }).getAttribute('href')).toContain(encodeURIComponent(url));
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  // someone else opens it: a new phone with nothing saved
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); const other = await ctx.newPage();
  await other.goto(url);
  await expect(other.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(other.locator('.atp-sh-tag')).toContainText('Shared with you');
  await expect(other.locator('.atp-shared .atp-tl.is-total b')).toHaveText(total);
  await expect(other.locator('.atp-vday')).toHaveCount(6);
  await expect(other.locator('.atp-dock .atp-tab[aria-current="page"]')).toContainText('Trip'); // inside the site, on the Trip tab
  expect(await other.locator('.atp-sh-say').first().getAttribute('href')).toContain('wa.me/?text=');
  expect(await other.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await other.getByRole('button', { name: 'Open it in my planner' }).click();
  await expect(other).toHaveURL(/\/trip$/);
  await expect(other.locator('.cta button.tot b').first()).toHaveText(total);
  // a link that was cut short says so and offers a way on
  await other.goto('/trip/shared#zAAAA');
  await expect(other.getByRole('heading', { name: 'This link does not open a plan' })).toBeVisible();
  await ctx.close();
});

test('WhatsApp: every page opens a chat with the question already written', async ({ page }) => {
  await page.goto('/things-to-do/acv-boat-eleph');
  const act = page.locator('.atp-dbuy .atp-wa');
  expect(await act.getAttribute('href')).toContain(WA);
  await expect.poll(async () => waText(act)).toContain('/things-to-do/acv-boat-eleph');
  expect(await waText(act)).toMatch(/^Hi Andaman Travel Planner, I have a question about “.+” on Havelock\./);
  await expect.poll(async () => waText(act)).toContain('Travellers: 2 adults');
  await expect(act.locator('img')).toHaveAttribute('src', '/img/logos/whatsapp.png');
  await page.goto('/stays/htl-hav-003');
  expect(await waText(page.locator('.atp-dbuy .atp-wa'))).toContain('staying at');
  await page.goto('/ferries/pbl-hav');
  expect(await waText(page.locator('main .atp-wa').first())).toContain('the ferry from Port Blair to Havelock');
  await page.goto('/cabs');
  expect(await waText(page.locator('main .atp-wa').first())).toContain('a cab or a rental');
  await page.goto('/islands/hav');
  expect(await waText(page.locator('main .atp-wa').first())).toContain('planning to visit Havelock');
  // the browse screens carry what is chosen
  await page.goto('/things-to-do?island=hav&cat=scuba');
  await expect.poll(async () => waText(page.locator('.atp-br-wa .atp-wa'))).toContain('things to do on Havelock (scuba diving)');
  // the footer of every page, with the number shown
  await expect(page.locator('.sitefoot .atp-wa')).toContainText('+91 99332 70842');
  // with a trip, the dates and the total go with the message
  await page.goto('/trips/p2');
  expect(await waText(page.locator('.atp-dbuy .atp-wa'))).toContain('interested in the trip');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  await page.goto('/checkout');
  const co = page.locator('.atp-co .atp-wa');
  await expect.poll(async () => waText(co)).toContain('Dates: ');
  expect(await waText(co)).toMatch(/total ₹[\d,]+ including GST/);
});

test('maps: shown when asked for, with directions for the day', async ({ page }) => {
  await page.route(/google\.com\/maps/, (r) => r.abort());
  await page.goto('/stays/htl-hav-003');
  const map = page.locator('.atp-map').first();
  await expect(map.locator('iframe')).toHaveCount(0); // nothing is loaded from Google until asked
  expect(await map.locator('.atp-map-open').getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  await map.getByRole('button', { name: /Show the map/ }).click();
  await expect(map.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps\?output=embed/);
  await page.goto('/things-to-do/acv-boat-eleph');
  expect(await page.locator('.atp-map .atp-map-open').getAttribute('href')).toContain('query_place_id=');
  await page.goto('/islands/hav');
  await expect(page.getByRole('button', { name: /See Havelock on a map/ })).toBeVisible();
  // on the Trip page: the day's stops in order, from the hotel and back
  await page.goto('/trips/p2');
  await page.getByRole('button', { name: /Use this trip/ }).click();
  await expect(page).toHaveURL(/\/trip$/);
  const day = page.locator('section.atp-dsec').nth(2).locator('.atp-map');
  await expect(day.locator('.atp-map-stops')).toContainText('Hotel →');
  expect(await day.locator('.atp-map-open').getAttribute('href')).toMatch(/maps\/dir\/\?api=1&travelmode=driving&origin=.+&destination=/);
});

test('more like this: nothing twice, places stay on their island, activities may come from other islands', async ({ page }) => {
  const names = async () => { await page.locator('.atp-detail .atp-rail2 .atp-bc').first().waitFor(); return (await page.locator('.atp-detail .atp-rail2 .atp-bc .atp-bc-b > b').allInnerTexts()).map((t) => t.trim().toLowerCase()); };
  const hrefs = async () => page.locator('.atp-detail .atp-rail2 a.atp-bc').evaluateAll((els) => els.map((e) => e.getAttribute('href') || ''));
  // a first dive: other dives, each name once, and not the same dive again
  await page.goto('/things-to-do/acv-dsd-hav-boat');
  const dive = await names(); expect(dive.length).toBeGreaterThan(2);
  expect(new Set(dive).size).toBe(dive.length);
  expect(dive).not.toContain('discover scuba diving');
  // a sight in Port Blair: only Port Blair
  await page.goto('/things-to-do/ent-corbyns');
  await expect(page.locator('.atp-detail')).toContainText('More like this on Port Blair');
  for (const h of await hrefs()) expect(h).toMatch(/^\/things-to-do\//);
  const sights = await names(); expect(new Set(sights).size).toBe(sights.length);
  // a boat trip is not "like" a photoshoot or a speedboat transfer
  await page.goto('/things-to-do/acv-boat-eleph');
  const boat = (await names()).join(' | ');
  expect(boat).not.toContain('photoshoot');
  expect(boat).not.toContain('speedboat transfer');
  // the signature experiences are on Home
  await page.goto('/');
  await expect(page.locator('#signature .atp-bc')).toHaveCount(8);
});

test('the promise is on Home, and every thing has its own ready message', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.atp-promband')).toContainText('You choose the trip. We confirm it in 30 minutes.');
  await expect(page.locator('.atp-promband .atp-prom li')).toHaveCount(4);
  await expect(page.locator('.atp-promband')).toContainText('No middleman from the mainland');
  const quick = async () => decodeURIComponent(((await page.locator('.atp-quick').first().getAttribute('href')) || '').split('text=')[1] || '');
  // a stay: the hotel, check-in, nights, room, travellers, the price seen
  await page.goto('/stays/htl-hav-003');
  await page.locator('.atp-quick').first().waitFor();
  expect(await quick()).toMatch(/please confirm this for me\.\nStay: .+, Havelock\nCheck-in .+ · \d+ nights? · .+\nTravellers: 2 adults\nPrice I saw: ₹[\d,]+/);
  // choices made on the page go into the message
  await page.locator('.addpanel .chip', { hasText: /^3$/ }).first().click();
  expect(await quick()).toContain('3 nights');
  // an activity: the day and the time
  await page.goto('/things-to-do/acv-boat-eleph');
  await page.locator('.atp-quick').first().waitFor();
  expect(await quick()).toMatch(/Activity: .+, Havelock\n.+ at \d\d:\d\d\n/);
  // a ferry: the operator, the sailing, the class, and a question about seats
  await page.goto('/ferries/pbl-hav');
  await page.locator('button.atp-fr').first().click();
  await page.locator('.atp-quick').first().waitFor();
  expect(await quick()).toMatch(/Ferry: Port Blair → Havelock\n.+ · leaves \d\d:\d\d · .+ class\nPlease tell me which seats are free\./);
  // a ready-made trip
  await page.goto('/trips/p2');
  await page.locator('.atp-quick').first().waitFor();
  expect(await quick()).toMatch(/please confirm this trip for me\.\nTrip: .+ · 5 nights\n/);
  expect(await page.locator('.atp-quick').first().getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919933270842\?text=/);
});
