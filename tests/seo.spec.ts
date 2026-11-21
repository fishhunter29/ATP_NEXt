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
    await page.addInitScript(() => { try { localStorage.setItem('atp_tour_v1', 'done'); } catch {} });
    for (const p of [...INDEXABLE, '/trip']) {
      await page.goto(p); await page.waitForTimeout(600);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `${p} at ${w}px`).toBeLessThanOrEqual(1);
    }
    await page.close();
  });
}

test('ferry and island pages answer the questions people search for', async ({ request }) => {
  const f = await (await request.get('/ferries/pbl-hav')).text();
  expect(f).toContain('How long is the ferry from Port Blair to Havelock?');
  expect(f).toContain('How much is the Port Blair to Havelock ferry ticket?');
  const faq = [...f.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((d) => d['@type'] === 'FAQPage');
  expect(faq.mainEntity.length).toBeGreaterThan(3);
  for (const q of faq.mainEntity) expect(q.acceptedAnswer.text.length).toBeGreaterThan(10);
  const i = await (await request.get('/islands/hav')).text();
  expect(i).toContain('How do I reach Havelock?');
  expect(i).toContain('"@type":"FAQPage"');
  // the company's contact number is in the organisation data, and link previews have a picture every app can show
  const h = await (await request.get('/')).text();
  expect(h).toContain('"telephone":"+919933270842"');
  expect(h).toMatch(/<meta property="og:image" content="[^"]*\/og\.jpg"/);
  expect(h).toContain('<html lang="en-IN"');
  expect((await request.get('/og.jpg')).status()).toBe(200);
  const sm = await (await request.get('/sitemap.xml')).text();
  expect(sm).toContain('<image:loc>');
});

test('AI assistants and search tools get a plain, current summary, and are allowed in', async ({ request }) => {
  const r = await request.get('/llms.txt'); expect(r.status()).toBe(200);
  expect(r.headers()['content-type']).toContain('text/plain');
  const t = await r.text();
  expect(t).toMatch(/^# Andaman Travel Planner\n/);
  for (const x of ['## How booking works', 'within 30 minutes', 'Peak season: 15 December to 15 January', '## Ferries between the main islands', 'Port Blair to Havelock', '+91 99332 70842', '/islands/hav'])
    expect(t, x).toContain(x);
  expect(t).toMatch(/Port Blair to Havelock\]\([^)]+\/ferries\/pbl-hav\): \d+ sailings a day, first \d\d:\d\d, last \d\d:\d\d, about \d h( \d+ min)?, from ₹[\d,]+ a person/);
  const rb = await (await request.get('/robots.txt')).text();
  for (const bot of ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot']) expect(rb, bot).toContain(`User-Agent: ${bot}`);
  expect(rb).toContain('Disallow: /trip/shared');
  // Home answers the questions asked before a trip, in the page and in the data
  const h = await (await request.get('/')).text();
  expect(h).toContain('When is peak season in the Andamans?');
  expect(h).toContain('How do I book an Andaman trip with Andaman Travel Planner?');
  const faq = [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((d) => d['@type'] === 'FAQPage');
  expect(faq.mainEntity.length).toBeGreaterThan(5);
});

test('every listed hotel shows its own photos', async ({ request }) => {
  const list = await (await request.get('/stays')).text();
  expect(list).not.toContain('/img/h/sample');
  expect(list).not.toContain('confirmed by us');
  const stay = await (await request.get('/stays/htl-hav-002')).text();
  expect(stay).toContain('/img/h/htl-hav-002-0.webp');
  const sm = await (await request.get('/sitemap.xml')).text();
  for (const id of ['htl-pbl-c02', 'htl-ran-005', 'htl-lit-003', 'htl-may-002']) expect(sm).toContain(`/stays/${id}`);
  // hotels that are not in the folder are gone
  for (const id of ['htl-ran-001', 'htl-ran-002']) expect((await request.get(`/stays/${id}`)).status()).toBe(404);
});
