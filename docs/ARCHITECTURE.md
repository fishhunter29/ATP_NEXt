# How v2 is built

## Two kinds of pages
1. **Google-facing pages** are rendered on the server at build time (598 pages): every island (`/islands/hav`), ferry route (`/ferries/pbl-hav`), activity (`/things-to-do/acv-boat-eleph`), stay (`/stays/htl-hav-003`) and planned trip (`/trips/p2`), plus `/sitemap.xml` and `/robots.txt`. They read `src/data/catalogue.json` through `src/lib/catalogue.ts`, carry titles, descriptions and schema.org data, and embed the React "Add to trip" panel.
2. **App screens** (`/`, `/trip`, `/checkout`, `/my-trips`, `/plan`, lists) are React client components. They read and change the trip through the engine.

## Search engines (SEO)
Every Google-facing page must be complete in the HTML the server sends, before any JavaScript runs. `tests/seo.spec.ts` checks this on every change:
- **Server HTML.** Nothing in the root layout may read the query string (`useSearchParams`) outside its own small `<Suspense>`, or Next.js renders the whole page in the browser only and Google gets an empty page. The Shell keeps it in `StackSync`.
- **Browse screens** (things to do, stays, ready-made trips) read the address in the browser, so the server sends their first view as the Suspense fallback in the same markup: the HTML has the lists and nothing jumps when the phone takes over. Island pages and `/trips` also carry a plain index of links to every item.
- **Links, not buttons.** Anything that goes to another page is a `<Link>`/`<a>`, so Google can follow it. The site footer (`SiteFooter`) links every island, the main ferry routes, planned trips and lists.
- **Metadata.** Use `pageMeta()` from `src/lib/seo.ts`: title, description, canonical, Open Graph and Twitter card all point at the same address. Personal pages (`/trip`, `/checkout`, `/my-trips`, `/profile`, `/search`) are `noindex` and have no canonical.
- **Structured data** (`<JsonLd>`): TravelAgency + WebSite on every page; BreadcrumbList on lists and details; TouristDestination (islands), TouristTrip (activities and planned trips), BoatTrip (each sailing), LodgingBusiness (stays). Google ratings are shown on the page but never put in rating markup: Google does not allow ratings collected by another site there.
- **Planned trips and day plans** come from the engine, which only runs in the browser. `scripts/pkg-index.mjs` writes them to `src/data/packages.json` and `src/data/dayplans.json` for the server pages; run it after changing planned trips, day plans or prices.
- **Photos in `.art` boxes** must be an `<svg>` (app.css hides an `.art` box without one). Use `PhotoArt` for catalogue photos on server pages.
- **Instruments.** Search Console and Bing ownership tags and Google Analytics 4 switch on from environment variables (see `.env.example`). After going live: verify the site in Search Console and Bing, submit `/sitemap.xml` in both.

## Design tokens and shell (Tide)
`src/styles/tide.css` holds the approved design: colours for day and night, type, spacing, corners, and the shell (header, dock, toast). It loads after `src/styles/app.css` and wins. New screens use the Tide names (`--ink`, `--ink-2`, `--line`, `--action`, `--clash`, `--ok`, `--tip`, `--k-*`, `--space-*`, `--radius-*`, `--font-sans`, `--font-mono`). The old names in `app.css` (`--brand`, `--cta`, `--muted`, `--r-l`…) point at them and go away as each screen is rebuilt. No shadows, gradients or translucency in new work: edges are borders.
- The header and dock are in `src/components/Shell.tsx`; the logo and the shell icons are plain SVG in `src/components/Brand.tsx`, so they are in the server HTML.
- Theme: `<html data-theme>` is `light` unless the traveller chose Night (`dark`) or "Phone setting" (`auto`) in Profile. The engine's own starting value, `system`, counts as Day. A one-line script in the layout applies a saved Night before the first paint.

## Home and browsing
- `src/lib/browse.ts` shapes the catalogue for browsing on the server: one small record (`Item`) per thing to do, stay or ready-made trip, plus the categories and island lines. Client components import only its types, so the catalogue is not sent to the phone twice.
- `src/components/browse/Browse.tsx` is the browse screen for all three. Its state is the address (`?island=hav&cat=scuba&sort=price&q=…&len=long`; `zone=` and `date=` from older links still work, and `date` is passed on to every link). The server sends the first view through `BrowseStatic`, the same markup, as the Suspense fallback.
- `cards.tsx` (cards and rows) has no hooks and is used by server pages too; `Rail.tsx` adds the arrows a mouse needs.
- Home (`src/app/page.tsx`) is a server page; only the plan box and "today" (`src/views/Home.tsx`) wait for the phone. `src/lib/sky.ts` works out sunrise, sunset and the moon for Port Blair from the date.
- Styles for these pages are in `src/styles/tide-pages.css`.

## The Trip page
`src/views/Trip.tsx` draws the trip from the engine's events (`E.expand`, `E.run`): nothing about timing or price is worked out in React.
- **Cab loops** are a way of showing, not new data: on each day, a run of rows that starts with a cab and takes in at least one stop is drawn as one outing (`Loop`). A return fare (one booking, the cab waits) counts as coming back.
- **Class and seats** (`FerrySheet`) uses the engine's `seatState` and `autoSeats`, writes `cls` and `seats` on the ferry booking and lets the engine re-price. Seat availability is the engine's stand-in until the operators' live seats arrive (Stage 4).
- **Meals out** use the engine's `addMeal`; the waiting-cab figure is the catalogue's "Cab rules" rate for the island, shown as an estimate and never added to the total.
- **Drag to move** is still the v1 engine's: it finds rows by `.ev[data-uid]` and days by `section.day[data-date]`, so those class names stay on the new markup.
- Styles are in `src/styles/tide-trip.css`.

## The engine
`src/engine/core.js` is the v1 trip engine, moved unchanged: pricing and seasons, ferry reporting times, the 134 island rules, conflict detection, auto-fix, gap suggestions, meals, passes. It runs in the browser only.
- `useEngine()` gives a component the engine and re-renders it when the trip changes.
- `commit()` saves the trip on the phone and re-renders after a change made from React.
- `dispatch(action, data)` runs one of the engine's named actions (e.g. `pace`, `fx`, `dates`, `fixmenu`).
- When an engine action moves to another screen, `routeFor()` turns it into the right web address.

## Bottom sheets
All bottom sheets are React (`src/components/sheets/Sheets.tsx`): dates & flights, price breakdown, fix menu / auto-fix, help, move & swap, ferry added, day plans, and "replace your trip?". `S.sheet` names the open one and `SheetHost` shows it. Their buttons call the engine's named actions through `dispatch()`. Icons and the photo SVGs still come from the engine as text.

## Database (Supabase)
- Tables (`supabase/migrations/0001_bookings.sql`): `customers` (one per lead traveller, by phone), `bookings` (one paid trip, with its `ATP-XXXXXX` code, totals and the trip as sent), `booking_items` (one pass each: the QR code, vendor, sell and net price), `payment_events` (Razorpay webhook log), `partners` and `partner_users` (ferry operators, hotels, vendors and their staff), `price_overrides` (prices set by the team).
- **Writes** happen only on the server with the service-role key (`src/lib/db.ts`). A booking is saved by the Postgres function `create_booking` in one transaction: customer, booking and passes, or nothing. A pass code made on the phone that is already taken is given a new one and the phone updates its pass.
- **Reads** with the public key are limited by Row Level Security: a signed-in traveller sees only their own bookings and passes; partner staff see only the passes booked with them; prices are public; payment events are server-only.
- Without the keys every route answers "not connected" and the app works as before (passes on the phone).

## Server routes (`src/app/api`)
`/api/health` (also says whether the database and payments are connected), `/api/payments/order` (Razorpay order), `/api/payments/webhook` (signature-checked; logs every event and marks the booking paid), `/api/ferries/availability` (live seats go here), `/api/bookings` (checks and saves a paid trip). Payment and database routes answer "not connected" until their keys are set.
