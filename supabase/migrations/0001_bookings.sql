-- Andaman Travel Planner · stage 3, part 1: bookings in Supabase (Postgres).
-- Run in Supabase → SQL Editor, or with the Supabase CLI: supabase db push.
-- The website writes with the service-role key from server routes only (src/lib/db.ts), which bypasses RLS.
-- Row Level Security below decides what a signed-in traveller or partner may READ with the public key.

-- ---------------------------------------------------------------- customers
-- One row per lead traveller. Phone is how they will sign in (phone OTP, stage 3 part 2).
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique,                -- auth.users.id once they have signed in
  name        text not null check (length(name) between 1 and 120),
  phone       text not null unique check (phone ~ '^\+?[0-9 ]{8,20}$'),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- bookings (one paid trip)
do $$ begin
  create type public.booking_status as enum ('pending', 'paid', 'confirmed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,                 -- ATP-XXXXXX, shown to the traveller
  customer_id          uuid not null references public.customers (id) on delete restrict,
  status               public.booking_status not null default 'pending',
  start_date           date,
  end_date             date,
  adults               int  not null default 1 check (adults between 1 and 30),
  children             int  not null default 0 check (children between 0 and 30),
  infants              int  not null default 0 check (infants between 0 and 30),
  subtotal             numeric(12, 2) not null check (subtotal >= 0),
  gst                  numeric(12, 2) not null check (gst >= 0),
  total                numeric(12, 2) not null check (total >= 0),
  currency             text not null default 'INR',
  pay_method           text check (pay_method in ('upi', 'card', 'nb', 'simulated')),
  razorpay_order_id    text unique,
  razorpay_payment_id  text,
  trip                 jsonb not null,                       -- the trip as sent (cart, travellers, dates), for support and re-pricing
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists bookings_customer_idx on public.bookings (customer_id);

-- ---------------------------------------------------------------- booking items (one pass each)
create table if not exists public.booking_items (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  code        text not null unique,                          -- the pass code in the QR, scanned at jetties and gates
  kind        text not null check (kind in ('ferry', 'stay', 'cab', 'act', 'rent')),
  ref         text,                                          -- catalogue id (SAIL-…, HTL-…, ACV-…)
  title       text not null,
  sub         text,
  zone        text,
  date        date not null,
  time        text check (time is null or time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  report      text,
  vendor      text,
  price       numeric(12, 2) check (price is null or price >= 0),   -- what the traveller pays, before GST
  net         numeric(12, 2) check (net is null or net >= 0),       -- what the partner gets
  pax         int,
  seats       text,
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  scanned_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists booking_items_booking_idx on public.booking_items (booking_id);
create index if not exists booking_items_vendor_date_idx on public.booking_items (vendor, date);

-- ---------------------------------------------------------------- payment events (Razorpay webhook log)
create table if not exists public.payment_events (
  id           bigint generated always as identity primary key,
  provider     text not null default 'razorpay',
  event        text not null,
  order_id     text,
  payment_id   text,
  payload      jsonb not null,
  received_at  timestamptz not null default now()
);
create index if not exists payment_events_order_idx on public.payment_events (order_id);

-- ---------------------------------------------------------------- partners (ferry operators, hotels, activity vendors)
create table if not exists public.partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,                          -- matches booking_items.vendor
  kind        text check (kind in ('ferry', 'stay', 'cab', 'act', 'rent', 'other')),
  phone       text,
  email       text,
  created_at  timestamptz not null default now()
);
create table if not exists public.partner_users (
  partner_id  uuid not null references public.partners (id) on delete cascade,
  user_id     uuid not null,                                 -- auth.users.id
  role        text not null default 'staff' check (role in ('owner', 'staff', 'scanner')),
  primary key (partner_id, user_id)
);

-- ---------------------------------------------------------------- prices set by the team (override the catalogue)
create table if not exists public.price_overrides (
  product_id  text primary key,                              -- catalogue id
  price       numeric(12, 2) not null check (price >= 0),    -- selling price (net + ~7.5%)
  note        text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- ---------------------------------------------------------------- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
drop trigger if exists price_overrides_touch on public.price_overrides;
create trigger price_overrides_touch before update on public.price_overrides for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- Row Level Security
alter table public.customers       enable row level security;
alter table public.bookings        enable row level security;
alter table public.booking_items   enable row level security;
alter table public.payment_events  enable row level security;
alter table public.partners        enable row level security;
alter table public.partner_users   enable row level security;
alter table public.price_overrides enable row level security;

-- a signed-in traveller reads only their own record, bookings and passes
drop policy if exists "own customer row" on public.customers;
create policy "own customer row" on public.customers for select to authenticated using (user_id = auth.uid());

drop policy if exists "own bookings" on public.bookings;
create policy "own bookings" on public.bookings for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()));

drop policy if exists "own passes" on public.booking_items;
create policy "own passes" on public.booking_items for select to authenticated
  using (exists (select 1 from public.bookings b join public.customers c on c.id = b.customer_id
                 where b.id = booking_id and c.user_id = auth.uid()));

-- partner staff read the passes booked with their business (for the partner inbox and gate scanner)
drop policy if exists "partner passes" on public.booking_items;
create policy "partner passes" on public.booking_items for select to authenticated
  using (exists (select 1 from public.partners p join public.partner_users u on u.partner_id = p.id
                 where p.name = vendor and u.user_id = auth.uid()));

drop policy if exists "partner sees itself" on public.partners;
create policy "partner sees itself" on public.partners for select to authenticated
  using (exists (select 1 from public.partner_users u where u.partner_id = id and u.user_id = auth.uid()));

drop policy if exists "own partner membership" on public.partner_users;
create policy "own partner membership" on public.partner_users for select to authenticated using (user_id = auth.uid());

-- prices are public: anyone may read them
drop policy if exists "prices are public" on public.price_overrides;
create policy "prices are public" on public.price_overrides for select to anon, authenticated using (true);

-- payment_events: no policy, so only the service role (server) can read or write them.
-- No insert/update/delete policies anywhere: all writes go through the server routes.

-- ---------------------------------------------------------------- saving a booking: all of it, or none of it
-- Called by /api/bookings with the service-role key. Upserts the customer by phone, creates the booking with a new
-- ATP-XXXXXX code, and its passes, in one transaction. A pass code made on the phone that is already taken gets a new
-- one. Returns {"code": booking code, "renamed": {old pass code: new pass code}} so the phone can update its passes.
drop function if exists public.create_booking(jsonb);
create or replace function public.create_booking(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare v_customer uuid; v_booking uuid; v_code text; v_item jsonb; v_pass text; v_renamed jsonb := '{}'::jsonb;
begin
  insert into customers (name, phone, email)
  values (p->'lead'->>'name', p->'lead'->>'phone', nullif(p->'lead'->>'email', ''))
  on conflict (phone) do update set name = excluded.name, email = coalesce(excluded.email, customers.email)
  returning id into v_customer;

  loop
    v_code := 'ATP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from bookings b where b.code = v_code);
  end loop;

  insert into bookings (code, customer_id, status, start_date, end_date, adults, children, infants, subtotal, gst, total, pay_method, trip)
  values (v_code, v_customer, 'pending', nullif(p->>'start', '')::date, nullif(p->>'end', '')::date,
          coalesce((p->'pax'->>'adults')::int, 1), coalesce((p->'pax'->>'kids')::int, 0), coalesce((p->'pax'->>'infants')::int, 0),
          (p->>'subtotal')::numeric, (p->>'gst')::numeric, (p->>'total')::numeric, p->>'pay', coalesce(p->'trip', '{}'::jsonb))
  returning id into v_booking;

  for v_item in select value from jsonb_array_elements(p->'items') loop
    v_pass := v_item->>'code';
    while exists (select 1 from booking_items bi where bi.code = v_pass) loop
      v_pass := 'ATP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end loop;
    if v_pass <> v_item->>'code' then v_renamed := v_renamed || jsonb_build_object(v_item->>'code', v_pass); end if;
    insert into booking_items (booking_id, code, kind, ref, title, sub, zone, date, time, report, vendor, price, net, pax, seats)
    values (v_booking, v_pass, v_item->>'kind', v_item->>'ref', v_item->>'title', v_item->>'sub', v_item->>'zone', (v_item->>'date')::date,
            nullif(v_item->>'time', ''), v_item->>'report', v_item->>'vendor', (v_item->>'price')::numeric, (v_item->>'net')::numeric,
            (v_item->>'pax')::int, nullif(v_item->>'seats', ''));
  end loop;

  return jsonb_build_object('code', v_code, 'renamed', v_renamed);
end $$;
-- only the server may call it (Supabase exposes functions to the public key unless execute is revoked)
revoke all on function public.create_booking(jsonb) from public, anon, authenticated;
