-- Rider ("Uber") side: passengers book rides, drivers get notified.
-- Run once in the Supabase SQL Editor. Additive — safe on existing data.

-- 1) Store each user's Expo push token so we can push to drivers.
alter table public.users
  add column if not exists push_token text;

-- 2) Ride requests booked by riders. (crud already proxies /api/ride-requests
--    to this table; this guarantees the columns the booking flow needs.)
create table if not exists public.ride_requests (
  id                 text primary key,
  rider_id           text,
  rider_name         text,
  pickup_address     text,
  pickup_lat         double precision,
  pickup_lng         double precision,
  destination_address text,
  destination_lat    double precision,
  destination_lng    double precision,
  notes              text,
  status             text default 'pending',   -- pending | accepted | in_progress | completed | cancelled
  assigned_driver_id text,
  assigned_driver    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

alter table public.ride_requests enable row level security;
drop policy if exists "ride_requests all" on public.ride_requests;
create policy "ride_requests all" on public.ride_requests
  for all to anon, authenticated
  using (true) with check (true);
