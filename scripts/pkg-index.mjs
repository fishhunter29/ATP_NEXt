// Rebuilds src/data/packages.json (planned trips) and src/data/dayplans.json (half-day and full-day plans) as plain data,
// so /trips, /trips/[id], the home page and island pages can render them on the server for Google
// (the trip engine only runs in the browser).
// Run after changing planned trips or prices:  npm run build && npm start   (in one terminal)
//                                              node scripts/pkg-index.mjs  (in another)
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(process.env.APP_URL || 'http://localhost:3000/'); await p.waitForFunction(() => window.__ATP__);
const out = await p.evaluate(() => {
  const E = window.__ATP__;
  return E.PKGS.map((k) => {
    const pr = E.pkgPreview(k); const days = {};
    const tOf = (it) => (it.kind === 'stay' ? E.hm(E.CHECKIN) : it.kind === 'ferry' ? E.SAIL[it.ref].dep : it.t || '');
    pr.items.forEach((it) => { const I = E.info(it); (days[it.date] = days[it.date] || []).push({ t: tOf(it), kind: it.kind, title: I.title, sub: I.sub || '', ref: it.ref, zone: it.kind === 'ferry' ? I.to : I.zone }); });
    return {
      id: k.id, n: k.n, hi: k.hi || null, tag: k.tag || '', nights: k.nights, tier: k.tier || '', pax: k.pax, hl: k.hl || [],
      route: E.route(k).map(([z, n]) => [z, n]), total: pr.total, bookings: pr.items.length,
      days: Object.keys(days).sort().map((d) => days[d].sort((a, b) => a.t.localeCompare(b.t))),
    };
  });
});
writeFileSync(new URL('../src/data/packages.json', import.meta.url), JSON.stringify(out));
console.log(`packages.json updated: ${out.length} planned trips`);
const plans = await p.evaluate(() => {
  const E = window.__ATP__;
  return E.BLOCKS.map((b) => { const m = E.blockMeta(b); const hero = (m.xs.find((x) => !x.entry) || m.xs[0]).id;
    return { id: b.id, z: b.z === 'WAN' ? 'PBL' : b.z, ph: (String(E.art(b.z, null, 'BLK:' + b.id)).match(/i\d{3}/) || ['i179'])[0], n: b.n, why: b.why, full: m.full, mins: m.mins, pp: m.pp, hero, stops: m.xs.map((x) => ({ id: x.id, n: E.shortName(x) })) }; });
});
writeFileSync(new URL('../src/data/dayplans.json', import.meta.url), JSON.stringify(plans));
console.log(`dayplans.json updated: ${plans.length} day plans`); await b.close();
