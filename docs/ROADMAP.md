# Roadmap to live (target 15 December)

**Stage 1 · done.** Next.js + React app; all main screens in React; 502 Google-facing pages; sitemap; API route skeleton; Playwright tests; CI.

**Stage 2 · React sheets and polish.** Search-engine groundwork first (done: full server HTML on every Google-facing page, crawlable links, canonicals, structured data, sitemap with planned trips, Search Console/Bing/GA4 hooks). Done: every bottom sheet in React; day plans on home and island pages; vehicle chip and scooter-for-the-day; "Add a day before/after"; quick hotel compare; pairing suggestions after adding. Hindi on the main screens (navigation, home, trip, trip tools, every sheet, add panel, checkout). Light-mode QA done (contrast scan of every main page at 360px and 1440px). Stage 2 is complete. (Drag-to-move works through the v1 engine and is left as it is for now.)

**Stage 3 · Real bookings.** Supabase: done for bookings (tables, Row Level Security, `create_booking`, checkout saves the trip, webhook marks it paid); next: prices from `price_overrides`, partner accounts, phone-OTP login, Razorpay live payments + webhook, WhatsApp and email vouchers, server-side price check before payment.

**Stage 4 · Live data.** Ferry operator APIs through `/api/ferries/availability`, hotel allotments, partner inbox and gate scanner as real staff screens.

**Stage 5 · Launch.** Domain, verify in Google Search Console and Bing and submit the sitemap, Sentry error alerts, uptime checks, privacy policy (DPDP Act), test round with real phones.

## Rebuild to the approved design (started 20 Nov 2026)

The new design (phone-first, categorised browsing, boarding-pass ferry tiles, optional meals out, one checkout) was approved on a clickable prototype. The app is being rebuilt to it in small pull requests, each one safe to ship on its own.

**R1 · Trust, photos and names (this change).** Company details (CIN, GSTIN, DPIIT number, registered office, email) and the six recognition logos in the site footer and schema.org data; booking terms, refunds and privacy pages (`/terms`, `/refunds`, `/privacy`, drafts for a lawyer to check); hotels' own photos on stay pages and in the stays list (57 of 178 so far; the rest show one labelled sample photo); our own heading on all 96 itineraries.

**R2 · Design tokens and shell.** The approved colours, type and spacing as the app's tokens; header with the DPIIT line; four-tab dock (Explore, Trip, My trips, Profile).

**R3 · Home and browsing.** Home; categorised lists for trips, things to do, stays, ferries and cabs (category tiles, a "most loved" rail, one rail per category, focused list, detail page); island pages.

**R4 · Trip.** Day view with cab loops from the hotel and back, the ferry boarding-pass tile, ferry class and seat picker, optional meals out with cab waiting charges.

**R5 · Checkout and after.** Checkout with the price breakdown per partner, "if plans change", payment method, confirming and confirmed screens, My trips.

Adding hotel photos: put `<hotel id in lower case>-0.webp` … (720×480) and `-t.webp` (224×168) in `public/img/h` and set the count in `src/data/hotelphotos.json`.
