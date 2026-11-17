// Rebuilds src/data/photomap.json (which photo each activity, island and sailing uses on Google-facing pages).
// Run after changing the catalogue or photos:  npm run build && npm start   (in one terminal)
//                                              node scripts/photo-map.mjs   (in another)
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(process.env.APP_URL || 'http://localhost:3000/'); await p.waitForFunction(() => window.__ATP__);
const m = await p.evaluate(() => { const E = window.__ATP__; const pick = (h) => (String(h).match(/i\d{3}/) || [null])[0]; const o = { act: {}, zone: {}, sail: {} };
  E.D.acts.forEach((a) => { o.act[a.id] = pick(E.art(a.z, null, a.id)); }); E.D.zones.forEach((z) => { o.zone[z.id] = pick(E.art(z.id, null, z.id + 'hero')); }); E.D.sails.forEach((s) => { o.sail[s.id] = pick(E.art(s.to, 'ship', s.id)); }); return o; });
writeFileSync(new URL('../src/data/photomap.json', import.meta.url), JSON.stringify(m)); console.log('photomap.json updated'); await b.close();
