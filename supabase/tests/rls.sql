-- Row Level Security check for 0001_bookings.sql. Run on a scratch database after local-stubs.sql and the migration:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/local-stubs.sql -f supabase/migrations/0001_bookings.sql -f supabase/tests/rls.sql
-- Any failed check stops with an error.

-- Supabase grants table access to these roles by default; RLS is what limits rows.
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

insert into public.customers (id, user_id, name, phone, email) values
  ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Priya Sharma', '+91 98765 43210', 'priya@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b2', 'Arjun Rao',   '+91 91234 56789', null);
insert into public.bookings (id, code, customer_id, subtotal, gst, total, trip) values
  ('20000000-0000-0000-0000-0000000000a1', 'ATP-AAAAAA', '00000000-0000-0000-0000-0000000000a1', 1000, 50, 1050, '{}'),
  ('20000000-0000-0000-0000-0000000000b2', 'ATP-BBBBBB', '00000000-0000-0000-0000-0000000000b2', 2000, 100, 2100, '{}');
insert into public.booking_items (booking_id, code, kind, title, date, vendor, price) values
  ('20000000-0000-0000-0000-0000000000a1', 'ATP-PASS01', 'ferry', 'Port Blair → Havelock', '2026-12-08', 'Makruzz', 1500),
  ('20000000-0000-0000-0000-0000000000a1', 'ATP-PASS02', 'stay',  'Barefoot at Havelock', '2026-12-08', 'Barefoot', 9000),
  ('20000000-0000-0000-0000-0000000000b2', 'ATP-PASS03', 'ferry', 'Havelock → Neil',       '2026-12-10', 'Makruzz', 1200);
insert into public.partners (id, name, kind) values ('30000000-0000-0000-0000-0000000000c3', 'Makruzz', 'ferry');
insert into public.partner_users (partner_id, user_id, role) values ('30000000-0000-0000-0000-0000000000c3', '10000000-0000-0000-0000-0000000000c3', 'scanner');
insert into public.payment_events (event, payload) values ('payment.captured', '{}');
insert into public.price_overrides (product_id, price) values ('ACV-BOAT-ELEPH', 1000);

create or replace function pg_temp.expect(label text, got bigint, want bigint) returns void language plpgsql as $$
begin if got <> want then raise exception 'RLS check failed: % (got %, want %)', label, got, want; end if; raise notice 'ok: %', label; end $$;

-- a visitor who is not signed in
set role anon;
select pg_temp.expect('anon sees no customers',  (select count(*) from public.customers), 0);
select pg_temp.expect('anon sees no bookings',   (select count(*) from public.bookings), 0);
select pg_temp.expect('anon sees no passes',     (select count(*) from public.booking_items), 0);
select pg_temp.expect('anon sees no payments',   (select count(*) from public.payment_events), 0);
select pg_temp.expect('anon sees prices',        (select count(*) from public.price_overrides), 1);
reset role;

-- traveller A
set role authenticated; set request.jwt.claim.sub = '10000000-0000-0000-0000-0000000000a1';
select pg_temp.expect('A sees only own customer row', (select count(*) from public.customers), 1);
select pg_temp.expect('A sees only own booking',      (select count(*) from public.bookings), 1);
select pg_temp.expect('A sees only own passes',       (select count(*) from public.booking_items), 2);
select pg_temp.expect('A sees no payment events',     (select count(*) from public.payment_events), 0);
do $$ declare n int; begin
  update public.bookings set total = 1; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS check failed: A updated % bookings', n; end if; raise notice 'ok: A cannot update a booking';
  delete from public.booking_items; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS check failed: A deleted % passes', n; end if; raise notice 'ok: A cannot delete passes';
end $$;
reset role;

-- traveller B
set role authenticated; set request.jwt.claim.sub = '10000000-0000-0000-0000-0000000000b2';
select pg_temp.expect('B sees only own booking', (select count(*) from public.bookings), 1);
select pg_temp.expect('B sees only own pass',    (select count(*) from public.booking_items), 1);
reset role;

-- Makruzz gate scanner: both Makruzz passes, nothing else, and no customer details
set role authenticated; set request.jwt.claim.sub = '10000000-0000-0000-0000-0000000000c3';
select pg_temp.expect('partner sees its passes only', (select count(*) from public.booking_items), 2);
select pg_temp.expect('partner sees no customers',    (select count(*) from public.customers), 0);
select pg_temp.expect('partner sees itself',          (select count(*) from public.partners), 1);
reset role;

-- inserts from the browser are refused (only the server, with the service-role key, writes)
set role anon;
do $$ begin
  insert into public.customers (name, phone) values ('x', '+91 90000 00000');
  raise exception 'RLS check failed: anon could insert a customer';
exception when insufficient_privilege then raise notice 'ok: anon cannot insert';
end $$;
reset role;

-- data checks
do $$ begin
  insert into public.customers (name, phone) values ('Bad', 'not-a-phone');
  raise exception 'check failed: bad phone accepted';
exception when check_violation then raise notice 'ok: bad phone rejected';
end $$;

-- create_booking: saves customer, booking and passes together; the browser roles may not call it
do $$ declare c text; n int; begin
  c := public.create_booking('{"lead":{"name":"Meera Iyer","phone":"+91 99887 76655","email":"meera@example.com"},"pax":{"adults":2,"kids":1},
    "start":"2026-12-07","end":"2026-12-12","subtotal":3000,"gst":150,"total":3150,"pay":"upi","trip":{"cart":[]},
    "items":[{"code":"ATP-T00001","kind":"ferry","ref":"SAIL-006","title":"Port Blair → Havelock","date":"2026-12-08","time":"08:00","vendor":"Makruzz","price":2000,"net":1912},
             {"code":"ATP-T00002","kind":"act","ref":"ACV-BOAT-ELEPH","title":"Elephant Beach boat","date":"2026-12-09","time":"09:00","vendor":"Havelock boats","price":1000,"net":930}]}')->>'code';
  if c !~ '^ATP-[0-9A-F]{6}$' then raise exception 'create_booking returned %', c; end if;
  select count(*) into n from public.booking_items i join public.bookings b on b.id = i.booking_id where b.code = c;
  if n <> 2 then raise exception 'create_booking saved % passes', n; end if;
  raise notice 'ok: create_booking saved booking % with 2 passes', c;
end $$;
-- a pass code that is already taken (another traveller's ATP-PASS01) gets a new one, and the change is returned
do $$ declare r jsonb; begin
  r := public.create_booking('{"lead":{"name":"X","phone":"+91 90000 00001"},"subtotal":1,"gst":0,"total":1,
    "items":[{"code":"ATP-PASS01","kind":"ferry","title":"same code as before","date":"2026-12-08"}]}');
  if r->'renamed'->>'ATP-PASS01' is null or r->'renamed'->>'ATP-PASS01' = 'ATP-PASS01' then raise exception 'taken pass code was not renamed: %', r; end if;
  if (select count(*) from public.booking_items where code = 'ATP-PASS01') <> 1 then raise exception 'pass code now used twice'; end if;
  raise notice 'ok: a taken pass code is renamed to %', r->'renamed'->>'ATP-PASS01';
end $$;
-- a bad item (no date) saves nothing at all: no half-made customer or booking
do $$ begin
  perform public.create_booking('{"lead":{"name":"Y","phone":"+91 90000 00002"},"subtotal":1,"gst":0,"total":1,"items":[{"code":"ATP-BAD001","kind":"ferry","title":"no date"}]}');
  raise exception 'check failed: item without a date accepted';
exception when not_null_violation then raise notice 'ok: an item without a date saves nothing';
end $$;
select pg_temp.expect('nothing half-saved after the failed booking', (select count(*) from public.customers where phone = '+91 90000 00002'), 0);
set role anon;
do $$ begin
  perform public.create_booking('{}');
  raise exception 'RLS check failed: anon could call create_booking';
exception when insufficient_privilege then raise notice 'ok: anon cannot call create_booking';
end $$;
reset role;

-- ---------------------------------------------------------------- enquiries: the public key may add one, never read
set role anon;
insert into public.enquiries (kind, message, page) values ('general', 'Hi, I would like help planning a trip.', '/');
do $$ begin
  perform 1 from public.enquiries;
  raise exception 'RLS check failed: anon could read enquiries';
exception when insufficient_privilege then raise notice 'ok: anon cannot read enquiries';
end $$;
do $$ begin
  insert into public.enquiries (message, status) values ('x', 'confirmed');
  raise exception 'RLS check failed: anon could set an enquiry status';
exception when insufficient_privilege then raise notice 'ok: anon cannot set an enquiry status';
end $$;
reset role;
select pg_temp.expect('the enquiry was saved', (select count(*) from public.enquiries), 1);
