import { expect, test } from '@playwright/test';

/* What Google reads: the HTML as the server sends it, before any JavaScript runs. */
const INDEXABLE = ['/', '/things-to-do', '/stays', '/cabs', '/charters', '/trips', '/plan', '/ferries', '/ferries/pbl-hav', '/islands/hav', '/things-to-do/acv-boat-eleph', '/stays/htl-hav-003', '/trips/p2', '/trips/t10'];
const PRIVATE = ['/trip', '/checkout', '/my-trips', '/profile', '/search'];

const grab = (html: string, re: RegExp) => (html.match(re) || [])[1];
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').split('<body')[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('Google-facing pages are complete in the server HTML', async ({ request }) => {
  for (const p of INDEXABLE) {
    const r = await request.get(p); expect(r.status(), p).toBe(200);
    const h = await r.text();
    expect(h, `${p} must not fall back to client-only rendering`).not.toContain('BAILOUT_TO_CLIENT_SIDE_RENDERING');
    expect((h.match(/<h1[\s>]/g) || []).length, `${p}: one h1`).toBe(1);
    expect(text(h).split(' ').length, `${p}: real text in the HTML`).toBeGreaterThan(120);
    expect(grab(h, /<title>(.*?)<\/title>/), `${p}: title`).toBeTruthy();
    expect((grab(h, /<meta name="description" content="(.*?)"/) || '').length, `${p}: description`).toBeGreaterThan(50);
    const canon = grab(h, /<link rel="canonical" href="(.*?)"/); expect(canon, `${p}: canonical`).toBeTruthy();
    expect(new URL(canon!).pathname.replace(/\/$/, '') || '/', `${p}: canonical is itself`).toBe(p);
    expect(grab(h, /<meta property="og:url" content="(.*?)"/), `${p}: og:url`).toBe(canon);
    expect(grab(h, /<meta property="og:image" content="(.*?)"/), `${p}: og:image`).toBeTruthy();
    expect(h, `${p}: not noindex`).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
    const ld = [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    expect(ld.length, `${p}: structured data`).toBeGreaterThan(1);
    for (const d of ld) expect(d.aggregateRating, `${p}: no ratings from other sites in markup`).toBeUndefined();
    expect((h.match(/<a [^>]*href="\//g) || []).length, `${p}: crawlable links`).toBeGreaterThan(20);
  }
});

test('personal pages are kept out of search', async ({ request }) => {
  for (const p of PRIVATE) {
    const h = await (await request.get(p)).text();
    expect(h, p).toMatch(/<meta name="robots" content="[^"]*noindex/);
    expect(h, `${p}: no canonical pointing elsewhere`).not.toContain('rel="canonical"');
  }
});

test('sitemap lists every planned trip and robots points to it', async ({ request }) => {
  const sm = await (await request.get('/sitemap.xml')).text();
  expect(sm).toContain('/trips/p2</loc>');
  expect(sm).toContain('/trips/t-mkb</loc>');
  expect(sm).not.toContain('/checkout');
  const rb = await (await request.get('/robots.txt')).text();
  expect(rb).toContain('Sitemap:');
  expect(rb).toContain('Disallow: /checkout');
});

for (const [w, h] of [[360, 780], [1440, 900]]) {
  test(`no sideways scrolling at ${w}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    for (const p of [...INDEXABLE, '/trip']) {
      await page.goto(p); await page.waitForTimeout(600);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `${p} at ${w}px`).toBeLessThanOrEqual(1);
    }
    await page.close();
  });
}
