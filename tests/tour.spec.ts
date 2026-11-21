import { test, expect, type Page } from '@playwright/test';
import { TOUR_STEPS } from '../src/lib/tour/steps';

/* The first-visit tour. These tests start from a phone that has never seen the site (no localStorage). */
const KEY = 'atp_tour_v1';
const card = (page: Page) => page.locator('.driver-popover.atp-tour');
const title = (page: Page) => card(page).locator('.driver-popover-title');
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const next = (page: Page) => card(page).locator('.atp-tour-next');

test('first visit to Home: the tour starts by itself and walks through every step', async ({ page }) => {
  await page.goto('/');
  await expect(title(page)).toHaveText(TOUR_STEPS[0].title, { timeout: 8000 });
  await expect(card(page)).toHaveAttribute('role', 'dialog');
  await expect(card(page).locator('.driver-popover-progress-text')).toContainText(`1 of ${TOUR_STEPS.length}`);
  // the main button has the focus, and Back is not offered on the first card
  await expect(next(page)).toBeFocused();
  await expect(card(page).locator('.atp-tour-back')).toBeHidden();
  for (let i = 1; i < TOUR_STEPS.length; i++) {
    await next(page).click();
    await expect(title(page)).toHaveText(TOUR_STEPS[i].title);
    await expect(card(page).locator('.driver-popover-progress-text')).toContainText(`${i + 1} of ${TOUR_STEPS.length}`);
    if (TOUR_STEPS[i].target) {
      // the ring and its beacon sit on the highlighted thing
      await expect(page.locator('.atp-tour-ring[data-on="1"] .atp-tour-beacon')).toBeVisible();
      const active = await page.evaluate(() => document.querySelector('.driver-active-element')?.getAttribute('data-tour'));
      expect(active).toBe(TOUR_STEPS[i].target);
    }
  }
  await expect(next(page)).toHaveText('Start planning');
  await next(page).click();
  await expect(card(page)).toHaveCount(0);
  expect(await stored(page)).toBe('done');
  // and it does not come back
  await page.reload(); await page.waitForTimeout(2500);
  await expect(card(page)).toHaveCount(0);
});

test('Skip ends the tour and it stays skipped', async ({ page }) => {
  await page.goto('/');
  await expect(title(page)).toBeVisible({ timeout: 8000 });
  await next(page).click();
  await card(page).getByRole('button', { name: 'Skip tour' }).click();
  await expect(card(page)).toHaveCount(0);
  expect(await stored(page)).toBe('skipped');
  // the page scrolls again
  expect(await page.evaluate(() => document.body.classList.contains('driver-no-scroll'))).toBe(false);
  await page.reload(); await page.waitForTimeout(2500);
  await expect(card(page)).toHaveCount(0);
});

test('keyboard: arrows move, Esc skips, Tab stays inside the card', async ({ page }) => {
  await page.goto('/');
  await expect(title(page)).toHaveText(TOUR_STEPS[0].title, { timeout: 8000 });
  await page.keyboard.press('ArrowRight');
  await expect(title(page)).toHaveText(TOUR_STEPS[1].title);
  await page.waitForTimeout(600); // keys wait for the move to finish
  await page.keyboard.press('ArrowLeft');
  await expect(title(page)).toHaveText(TOUR_STEPS[0].title);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.driver-popover'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(card(page)).toHaveCount(0);
  expect(await stored(page)).toBe('skipped');
});

test('page scroll is locked while a step is showing', async ({ page }) => {
  await page.goto('/');
  await expect(title(page)).toBeVisible({ timeout: 8000 });
  await next(page).click(); await page.waitForTimeout(700);
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 900); await page.waitForTimeout(400);
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

test('never starts by itself on a deep link, on checkout, or for someone with a trip', async ({ page }) => {
  for (const p of ['/?from=whatsapp', '/#trips', '/checkout', '/trip', '/stays']) {
    await page.goto(p); await page.waitForTimeout(2500);
    await expect(card(page), p).toHaveCount(0);
  }
  await page.evaluate(() => localStorage.setItem('atp_v6', JSON.stringify({ cart: [{ k: 'act', id: 'x' }] })));
  await page.goto('/'); await page.waitForTimeout(2500);
  await expect(card(page)).toHaveCount(0);
  expect(await stored(page)).toBeNull();
});

test('"Take the tour" in the footer replays it, from Home and from another page', async ({ page }) => {
  await page.addInitScript((k) => { try { localStorage.setItem(k, 'done'); } catch {} }, KEY);
  await page.goto('/stays'); await page.waitForTimeout(1500);
  await expect(card(page)).toHaveCount(0);
  await page.locator('footer').getByRole('link', { name: 'Take the tour' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(title(page)).toHaveText(TOUR_STEPS[0].title, { timeout: 8000 });
  await page.keyboard.press('Escape');
  await page.locator('footer').getByRole('link', { name: 'Take the tour' }).click();
  await expect(title(page)).toHaveText(TOUR_STEPS[0].title, { timeout: 8000 });
});

test('a step whose target is not on the screen is skipped quietly', async ({ page }) => {
  await page.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '[data-tour="ferries"]{display:none!important}'; document.head.appendChild(s); }); });
  await page.goto('/');
  await expect(title(page)).toBeVisible({ timeout: 8000 });
  const n = TOUR_STEPS.length - 1;
  await expect(card(page).locator('.driver-popover-progress-text')).toContainText(`1 of ${n}`);
  const seen: string[] = [];
  for (let i = 0; i < n; i++) { seen.push((await title(page).textContent()) || ''); if (i < n - 1) await next(page).click(); }
  expect(seen).not.toContain(TOUR_STEPS.find((s) => s.target === 'ferries')!.title);
});

test('phone: the card is a sheet on the bottom edge, and rises above the dock for the Trip tab', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('/');
  await expect(title(page)).toBeVisible({ timeout: 8000 });
  const b = await card(page).boundingBox();
  expect(Math.round(b!.x)).toBe(0); expect(Math.round(b!.width)).toBe(375); expect(Math.round(b!.y + b!.height)).toBe(740);
  // every button is at least 44px tall
  for (const h of await card(page).locator('button').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  const ti = TOUR_STEPS.findIndex((s) => s.target === 'trip-tab');
  for (let i = 0; i < ti; i++) await next(page).click();
  await expect(title(page)).toHaveText(TOUR_STEPS[ti].title);
  await page.waitForTimeout(400);
  const tab = await page.locator('.atp-dock [data-tour="trip-tab"]').boundingBox();
  const c = await card(page).boundingBox();
  expect(c!.y + c!.height).toBeLessThanOrEqual(tab!.y);
});

test('desktop: the card sits beside the highlighted thing, and the Trip tab is the one in the header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(title(page)).toBeVisible({ timeout: 8000 });
  await next(page).click();
  await expect(title(page)).toHaveText(TOUR_STEPS[1].title); await page.waitForTimeout(400);
  const c = await card(page).boundingBox();
  expect(c!.width).toBeLessThanOrEqual(380);
  const ti = TOUR_STEPS.findIndex((s) => s.target === 'trip-tab');
  for (let i = 1; i < ti; i++) await next(page).click();
  await expect(title(page)).toHaveText(TOUR_STEPS[ti].title);
  expect(await page.evaluate(() => !!document.querySelector('.driver-active-element')?.closest('header'))).toBe(true);
});

test('motion turned off: no pulsing beacon, no animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(title(page)).toBeVisible({ timeout: 8000 });
  await next(page).click();
  await expect(page.locator('.atp-tour-ring[data-on="1"]')).toHaveCount(1);
  const anim = await page.evaluate(() => {
    const b = document.querySelector('.atp-tour-beacon')!; const p = document.querySelector('.driver-popover')!;
    return [getComputedStyle(b, '::after').animationName, getComputedStyle(p).animationName, getComputedStyle(document.querySelector('.atp-tour-ring')!).transitionDuration];
  });
  expect(anim[0]).toBe('none'); expect(anim[1]).toBe('none'); expect(anim[2]).toMatch(/^0s/);
});
