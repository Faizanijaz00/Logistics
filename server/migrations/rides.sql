-- Rider ("Uber") side: passengers book rides, drivers get notified.
-- Run once in the Supabase SQL Editor. Additive — safe on existing data.

-- 1) Store each user's Expo push token so we can push to drivers.
alter table public.users
  add column if not exists push_token text;

-- 2) Ride requests booked by riders. A ride_requests table may already exist
--    from the older requests feature, so create a minimal one if missing and
--    then ADD each column additively (safe either way).
create table if not exists public.ride_requests (
  id         text primary key,
  created_at timestamptz not null default now()
);

alter table public.ride_requests
  add column if not exists rider_id            text,
  add column if not exists rider_name          text,
  add column if not exists pickup_address      text,
  add column if not exists pickup_lat          double precision,
  add column if not exists pickup_lng          double precision,
  add column if not exists destination_address text,
  add column if not exists destination_lat     double precision,
  add column if not exists destination_lng     double precision,
  add column if not exists notes               text,
  add column if not exists status              text default 'pending',
  add column if not exists assigned_driver_id  text,
  add column if not exists assigned_driver     text,
  add column if not exists scheduled_for       timestamptz,   -- "Later" scheduled pickup time (null = now)
  add column if not exists est_duration_min    integer,       -- estimated trip minutes
  add column if not exists est_distance_km     numeric,       -- estimated trip distance
  add column if not exists vehicle_preference       text,      -- vehicle id, or 'flexible' (any car)
  add column if not exists vehicle_preference_name  text,      -- display label of chosen car
  add column if not exists driver_lat          double precision,  -- driver's live location (for rider tracking)
  add column if not exists driver_lng          double precision,
  add column if not exists updated_at          timestamptz;

-- Nudge PostgREST to refresh its schema cache so the new columns are visible.
notify pgrst, 'reload schema';

alter table public.ride_requests enable row level security;
drop policy if exists "ride_requests all" on public.ride_requests;
create policy "ride_requests all" on public.ride_requests
  for all to anon, authenticated
  using (true) with check (true);
