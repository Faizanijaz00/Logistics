-- Migration: position history for vehicle path trails
-- Run in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
--
-- Records a breadcrumb each time a tracked vehicle moves, so the map can draw
-- where a car has actually travelled (distinct from its planned route).

CREATE TABLE IF NOT EXISTS vehicle_positions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast "latest points for one vehicle" and time-range queries
CREATE INDEX IF NOT EXISTS vehicle_positions_vehicle_time_idx
  ON vehicle_positions (vehicle_id, recorded_at DESC);

ALTER TABLE vehicle_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON vehicle_positions FOR ALL USING (true) WITH CHECK (true);
