# How v2 is built

## Two kinds of pages
1. **Google-facing pages** are rendered on the server at build time (502 pages): every island (`/islands/hav`), ferry route (`/ferries/pbl-hav`), activity (`/things-to-do/acv-boat-eleph`) and stay (`/stays/htl-hav-003`), plus `/sitemap.xml` and `/robots.txt`. They read `src/data/catalogue.json` through `src/lib/catalogue.ts`, carry titles, descriptions and schema.org data, and embed the React "Add to trip" panel.
2. **App screens** (`/`, `/trip`, `/checkout`, `/my-trips`, `/plan`, lists) are React client components. They read and change the trip through the engine.

## The engine
`src/engine/core.js` is the v1 trip engine, moved unchanged: pricing and seasons, ferry reporting times, the 134 island rules, conflict detection, auto-fix, gap suggestions, meals, passes. It runs in the browser only.
- `useEngine()` gives a component the engine and re-renders it when the trip changes.
- `commit()` saves the trip on the phone and re-renders after a change made from React.
- `dispatch(action, data)` runs one of the engine's named actions (e.g. `pace`, `fx`, `dates`, `fixmenu`).
- When an engine action moves to another screen, `routeFor()` turns it into the right web address.

## What still comes from the engine as HTML (stage 2 moves these to React)
Bottom sheets: dates & flights, price breakdown, fix menu / auto-fix, move & swap, help, planned-trip loader. They render through `SheetHost` and already work. Icons and the photo SVGs also come from the engine as text.

## Server routes (`src/app/api`)
`/api/health`, `/api/payments/order` (Razorpay order), `/api/payments/webhook` (signature-checked), `/api/ferries/availability` (live seats go here), `/api/bookings` (saves a paid trip). Payment and database routes answer "not connected" until their keys are set.
