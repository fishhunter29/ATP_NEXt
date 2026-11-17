# Andaman Travel Planner (v2, Next.js)

Plan and book an Andaman trip as one itinerary: ferries, stays, cabs and things to do, with every connection checked before you pay.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Playwright tests · GitHub Actions · deploys on Vercel.

## Run it on your computer
1. Install **Node.js 20 or newer** (nodejs.org).
2. In this folder: `npm install`, then `npm run dev`.
3. Open http://localhost:3000

## Put it online (Vercel)
1. Push this folder to a GitHub repository.
2. On vercel.com: **Add New → Project → Import** the repository. Vercel detects Next.js; keep the defaults and press **Deploy**.
3. Project → Settings → Environment Variables: add the ones in `.env.example` when you have them (site URL now; Razorpay and Supabase later).
4. Project → Settings → Domains: add `andamantravelplanner.com`.
Every pull request gets its own preview link. Merging to `main` updates the live site.

## Connect the database (Supabase)
1. On supabase.com: **New project** (region: Mumbai, `ap-south-1`). Keep the database password somewhere safe.
2. Supabase → **SQL Editor** → paste and run `supabase/migrations/0001_bookings.sql` (or, with the Supabase CLI: `supabase link` then `supabase db push`).
3. Supabase → **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.
4. Vercel → Project → Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Production and Preview), then redeploy.
5. Open `/api/health`: it should say `"database": "connected"`. Paid trips now appear in Supabase → Table Editor → `bookings` and `booking_items`.

The `service_role` key can read and write everything: it is only used on the server (`src/lib/db.ts`) and must never be put in a `NEXT_PUBLIC_` variable.

## Check it
- `npm test`: builds the site and runs the tests: pages open, example trip, build → pay → passes, add/change/remove, sheets, and the Google checks (`tests/seo.spec.ts`: full server HTML, titles, canonicals, structured data, sitemap, no sideways scrolling at 360px and 1440px).
- `npm run typecheck`: TypeScript.
- `supabase/tests/rls.sql`: runs the migration on a plain Postgres and checks who can read what (travellers see only their own bookings, partners only their own passes, the browser can write nothing).
GitHub runs all of these on every change (`.github/workflows/ci.yml`).

## Where things are
| Folder | What it holds |
|---|---|
| `src/app/` | Pages (one folder per web address) and API routes (`src/app/api`) |
| `src/views/` | Screens: Home, Trip, Checkout, My trips, lists, charters, planned trips, planner |
| `src/components/` | Shared pieces: app frame, add-to-trip panel, sheets, icons/photos |
| `src/engine/core.js` | The trip engine moved from v1: prices, ferry timing, conflict checks, auto-planning |
| `src/engine/client.ts` | Connects the engine to React (loading, re-rendering, actions, navigation) |
| `src/lib/catalogue.ts` | Catalogue access for Google-facing pages (no engine needed) |
| `src/data/` | `catalogue.json` (all products and prices), `photomap.json` |
| `src/styles/app.css` | The design (Tide/Lagoon theme, fruit-tinted trip tiles, kraft ferry pass) |
| `public/img/` | Photos (`f/` full size, `t/` thumbnails) |
| `supabase/` | Database: migrations (tables, Row Level Security, the `create_booking` function) and their tests |
| `docs/` | Architecture, roadmap and going-live notes |
