-- Andaman Travel Planner · every query a visitor sends us on WhatsApp is also logged here, so none is lost.
-- The website's server route (/api/enquiries) inserts with the public (publishable) key. Row Level Security lets
-- the public key INSERT a new enquiry and nothing else: it cannot read, change or delete any row.
-- The team reads them in Supabase → Table editor → enquiries (or with the service-role key).

create table if not exists public.enquiries (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null default 'general' check (kind in ('trip', 'item', 'general')),
  ref         text check (ref is null or ref ~ '^ATP-[A-Z0-9]{4,10}$'),     -- the trip reference shown to the traveller
  message     text not null check (length(message) between 1 and 6000),     -- exactly what was written into WhatsApp
  name        text check (name is null or length(name) <= 120),
  phone       text check (phone is null or length(phone) <= 30),
  email       text check (email is null or length(email) <= 200),
  start_date  date,
  end_date    date,
  travellers  int check (travellers is null or travellers between 1 and 60),
  total       numeric(12, 2) check (total is null or total >= 0),
  items       int check (items is null or items between 0 and 500),
  page        text check (page is null or length(page) <= 300),             -- the page it was sent from
  plan_url    text check (plan_url is null or length(plan_url) <= 4000),    -- link that opens the trip on the site
  status      text not null default 'new' check (status in ('new', 'replied', 'confirmed', 'closed')),
  note        text                                                          -- the team's own note
);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_ref_idx on public.enquiries (ref);
create index if not exists enquiries_status_idx on public.enquiries (status, created_at desc);

alter table public.enquiries enable row level security;

-- the public key may add a new enquiry (always status 'new', no team note), and nothing else
revoke all on public.enquiries from anon, authenticated;
grant insert on public.enquiries to anon, authenticated;
drop policy if exists "anyone may send an enquiry" on public.enquiries;
create policy "anyone may send an enquiry" on public.enquiries for insert to anon, authenticated
  with check (status = 'new' and note is null);
-- no select/update/delete policy: only the service role (the team) reads and updates them.
