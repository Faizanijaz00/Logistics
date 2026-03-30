-- Migration: Move passengers and trips from local JSON to Supabase
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create passengers table
CREATE TABLE IF NOT EXISTS passengers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_driver BOOLEAN NOT NULL DEFAULT false,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS passengers_name_lower_idx ON passengers (LOWER(name));

ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON passengers FOR ALL USING (true) WITH CHECK (true);

-- 2. Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT,
  description TEXT NOT NULL DEFAULT '',
  passengers JSONB NOT NULL DEFAULT '[]'::jsonb,
  vehicles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON trips FOR ALL USING (true) WITH CHECK (true);

-- 3. Seed existing passenger data
INSERT INTO passengers (id, name, is_driver, is_vip, active) VALUES
  ('pax-user-1771865058336-4v09', 'Admin', false, false, true),
  ('pax-user-1771865058390-5sun', 'Faizan', true, false, true),
  ('pax-user-1771866652220-z5g1', 'Ali', true, false, true),
  ('pax-user-1771866652322-nsv3', 'Adam', true, false, true),
  ('pax-user-1771866652426-5l6u', 'Fivos', true, false, true),
  ('pax-user-1771866652530-lb36', 'Aris', true, false, true),
  ('pax-user-1771866652634-0tth', 'Panos', true, false, true),
  ('pax-user-1771866652737-sx6r', 'AR', true, false, true)
ON CONFLICT (id) DO NOTHING;
