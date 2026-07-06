-- Migration: persistent key/value store for server collections that used to
-- live in local JSON files (drives, fuel_records, issues). Railway's disk is
-- ephemeral, so those files were wiped on every deploy. Each collection is one
-- row here (key = the old filename), with the whole array stored as JSONB.
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → Run).

create table if not exists public.kv_store (
  key text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- The app talks to Supabase with the anon key behind its own JWT auth, matching
-- the pattern used by the other tables. Allow read/write to this table only.
alter table public.kv_store enable row level security;

drop policy if exists "kv_store all" on public.kv_store;
create policy "kv_store all" on public.kv_store
  for all to anon, authenticated
  using (true)
  with check (true);
