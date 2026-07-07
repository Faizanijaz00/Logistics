-- Car bookings: a driver reserves a vehicle for a time window + destination so
-- everyone can see who needs which car, when, for how long, and where it's going.
-- Run once in the Supabase SQL Editor.

create table if not exists public.bookings (
  id               text primary key,
  vehicle_id       text,
  vehicle_name     text,
  driver_id        text,
  driver_name      text,
  start_time       timestamptz,
  duration_minutes integer,
  destination      text,
  notes            text,
  created_at       timestamptz not null default now()
);

-- Same anon-behind-app-JWT access pattern as the other tables.
alter table public.bookings enable row level security;

drop policy if exists "bookings all" on public.bookings;
create policy "bookings all" on public.bookings
  for all to anon, authenticated
  using (true)
  with check (true);
