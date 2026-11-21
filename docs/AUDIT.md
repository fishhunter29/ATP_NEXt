# Launch audit · 21 November 2026

Run against a production build of the code that is live on andamantravelplanner.com (Chromium only; the live domain could
not be reached from the audit environment). Fixed items went out in PR #23.

| ID | Severity | Finding | Status |
|---|---|---|---|
| SEC-01 | P1 | `/api/enquiries` could be flooded (no rate limit, 3 MB body accepted) | Fixed: 8 a minute per visitor, 20 KB cap. A Vercel Firewall rate-limit rule is still worth adding. |
| DATA-01 | P1 | Enquiry log never proven in production (table empty) | Open: needs one tap on a WhatsApp button on the live site |
| DATA-02 | P1 | No analytics, Search Console or Bing verification | Open: owner creates the properties; set `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`. Every WhatsApp query already fires a GA4 `generate_lead` event once the id is set. |
| SEC-02 | P2 | Security headers missing | Fixed |
| PERF-01 | P2 | `/stays` main photo at 3.6 s on slow 4G (lab) | Fixed: first photos load with high priority |
| PERF-02 | P2 | Photos re-checked on every visit (`max-age=0`) | Fixed: cached for a day |
| FUNC-01 | P2 | Enquiry lost if the phone is offline at Send | Fixed: queued and resent |
| A11Y-01 | P2 | Contrast 3.89:1 on Boat charters labels | Fixed |
| UX-01 | P2 | Tap targets under 44px | Fixed for text links, chips, footer email. Footer policy links are 36px tall. |
| XB-01 | P2 | Safari, Firefox, Edge and real phones not tested | Open |
| SEO-01 | P3 | Titles and descriptions too long | Fixed |
| SEO-02 | P3 | Heading level skipped on stay pages; no h1 on Profile | Fixed |
| PERF-03 | P3 | 199 KB of compressed JavaScript on Home; the catalogue ships to every page | Open |
| PERF-04 | P3 | 17 photos over 200 KB | Closed: they are 1280px photos already at an efficient size; re-encoding saved under 3% |
| SEC-03 | P3 | `/api/health` said what was connected | Fixed |
| SEC-04 | P3 | Debug `console.log` in the payment webhook | Fixed |
| SEC-05 | P3 | `touch_updated_at` had no fixed `search_path` | Fixed |
| FUNC-02 | P3 | Uppercase addresses returned 404 | Fixed |

Passed: hostile and oversized input on both API routes; no exposed files, source maps or secret keys; the public database
key can only add an enquiry; no sideways scrolling on 18 pages at 320 to 1440px; layout shift 0; 352 internal links;
robots, sitemap, canonical and share tags; axe clean on the pages re-checked; no console errors.
