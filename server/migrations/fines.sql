-- Fines / PCN module — extend the existing `tickets` table with the richer
-- fine-handling fields the wizard + tracker dashboard rely on. Additive only
-- (ADD COLUMN IF NOT EXISTS) so existing ticket rows survive untouched.
--
-- Run once in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor).
-- If the `tickets` table does not exist yet, the first block creates a minimal
-- version so the ALTERs below succeed.

create table if not exists public.tickets (
  id          text primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

alter table public.tickets
  add column if not exists vehicle_id          text,
  add column if not exists driver_id           text,
  add column if not exists issuer_type         text,          -- 'government' | 'private'
  add column if not exists issuer_name         text,          -- e.g. 'TfL', 'Westminster Council', 'Euro Car Parks'
  add column if not exists gov_authority       text,          -- 'tfl' | 'council' (drives TE9 vs PE3)
  add column if not exists date_issued         date,
  add column if not exists date_entered_system timestamptz default now(),
  add column if not exists reference_number    text,
  add column if not exists ticket_type         text,          -- 'movement' | 'non_movement'
  add column if not exists original_amount     numeric,
  add column if not exists discounted_amount   numeric,
  add column if not exists current_amount_due  numeric,
  add column if not exists current_stage       text,          -- enum split by track (see decisionTree.js)
  add column if not exists stage_history       jsonb default '[]'::jsonb,  -- [{ stage, date, note, attempt }]
  add column if not exists contested           boolean default false,
  add column if not exists contest_outcome     text default 'n/a',         -- pending|accepted|rejected|n/a
  add column if not exists contest_grounds     jsonb default '[]'::jsonb,  -- selected ground keys + free text
  add column if not exists documents           jsonb default '[]'::jsonb,  -- [{ name, path, kind }]
  add column if not exists key_deadline_date   date,          -- next thing-must-happen-by (dashboard sort)
  add column if not exists notes               text,
  add column if not exists status              text default 'open',        -- see STATUS_OPTIONS
  add column if not exists recommended_action  text,          -- what the wizard told the user to do
  add column if not exists action_status       text default 'needs_action',-- needs_action | actioned
  add column if not exists wizard_answers       jsonb default '{}'::jsonb; -- raw answers, for re-running / audit

-- Same anon-behind-app-JWT access pattern as the other tables.
alter table public.tickets enable row level security;

drop policy if exists "tickets all" on public.tickets;
create policy "tickets all" on public.tickets
  for all to anon, authenticated
  using (true)
  with check (true);
