# Roadmap to live (target 15 December)

**Stage 1 · done.** Next.js + React app; all main screens in React; 502 Google-facing pages; sitemap; API route skeleton; Playwright tests; CI.

**Stage 2 · React sheets and polish.** Search-engine groundwork first (done: full server HTML on every Google-facing page, crawlable links, canonicals, structured data, sitemap with planned trips, Search Console/Bing/GA4 hooks). Then: Move the remaining engine sheets to React (dates & flights, breakdown, fix menu, move & swap, compare stays); day plans rail on home; "Add a day before/after"; pairing suggestions after adding; Hindi copy check; light-mode QA.

**Stage 3 · Real bookings.** Supabase (bookings, customers, prices, partner accounts), phone-OTP login, Razorpay live payments + webhook, WhatsApp and email vouchers, server-side price check before payment.

**Stage 4 · Live data.** Ferry operator APIs through `/api/ferries/availability`, hotel allotments, partner inbox and gate scanner as real staff screens.

**Stage 5 · Launch.** Domain, verify in Google Search Console and Bing and submit the sitemap, Sentry error alerts, uptime checks, privacy policy (DPDP Act), test round with real phones.
