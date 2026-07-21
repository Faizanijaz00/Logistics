// Rider ("Uber") ride requests + push to drivers.
//
// TEMPORARY storage note: to allow testing before the Supabase `ride_requests`
// migration is run, rides are stored in a JSON file (server/data/rides.json),
// same pattern as drives/fuel-records. This is ephemeral on Railway (resets on
// redeploy) — fine for testing. Once migrations/rides.sql is applied we can
// switch this back to the Supabase `ride_requests` table for durable storage.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { sb } from './supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const FILE = 'rides.json';

function loadRides() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const p = join(DATA_DIR, FILE);
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, 'utf8') || '[]'); } catch { return []; }
}
function saveRides(rides) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, FILE), JSON.stringify(rides, null, 2));
}

// Best-effort Expo push to drivers/admins that have a push token. Defensive:
// if the users.push_token column doesn't exist yet, this simply sends nothing.
async function pushToDrivers(title, body, data) {
  let recipients = [];
  try {
    const rows = await sb('/rest/v1/users?role=in.(driver,admin)&select=*');
    recipients = (rows || []).map(r => r.push_token).filter(Boolean);
  } catch { return; }
  if (recipients.length === 0) return;
  const messages = recipients.map(to => ({ to, title, body, data: data || {}, sound: 'default', priority: 'high' }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {}
}

export function registerRideRoutes(app, requireAuth) {
  // Rider books a ride → append + push drivers.
  app.post('/api/rides', requireAuth, async (req, res) => {
    const b = req.body || {};
    if (!b.destination_address) return res.status(400).json({ error: 'Destination required' });
    try {
      const rides = loadRides();
      const row = {
        id: randomUUID(),
        rider_id: req.user.id,
        rider_name: b.rider_name || req.user.username,
        pickup_address: b.pickup_address || null,
        pickup_lat: b.pickup_lat ?? null,
        pickup_lng: b.pickup_lng ?? null,
        destination_address: b.destination_address,
        destination_lat: b.destination_lat ?? null,
        destination_lng: b.destination_lng ?? null,
        notes: b.notes || null,
        scheduled_for: b.scheduled_for || null,
        est_duration_min: b.est_duration_min ?? null,
        est_distance_km: b.est_distance_km ?? null,
        vehicle_preference: b.vehicle_preference || 'flexible',
        vehicle_preference_name: b.vehicle_preference_name || 'Flexible',
        status: 'pending',
        assigned_driver_id: null,
        assigned_driver: null,
        created_at: new Date().toISOString(),
      };
      rides.push(row);
      saveRides(rides);
      pushToDrivers(
        'New ride request',
        `${row.rider_name}: ${row.pickup_address ? row.pickup_address + ' → ' : ''}${row.destination_address}`,
        { type: 'ride_request', rideId: row.id },
      );
      res.status(201).json(row);
    } catch (e) {
      console.error('[Rides] create error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // List rides. Riders see their own; drivers/admins see pending + their assigned.
  app.get('/api/rides', requireAuth, (req, res) => {
    try {
      const rides = loadRides().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const out = req.user.role === 'rider'
        ? rides.filter(r => r.rider_id === req.user.id)
        : rides.filter(r => r.status === 'pending' || r.assigned_driver_id === req.user.id);
      res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Accept / update a ride (driver claims it, or status change).
  app.patch('/api/rides/:id', requireAuth, async (req, res) => {
    try {
      const rides = loadRides();
      const idx = rides.findIndex(r => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Ride not found' });
      const b = req.body || {};
      if (b.status) rides[idx].status = b.status;
      if (b.status === 'accepted' && req.user.role !== 'rider') {
        rides[idx].assigned_driver_id = req.user.id;
        rides[idx].assigned_driver = b.assigned_driver || req.user.username;
      }
      // Live driver location share (so the rider can track the car).
      if (b.driver_lat != null) rides[idx].driver_lat = b.driver_lat;
      if (b.driver_lng != null) rides[idx].driver_lng = b.driver_lng;
      rides[idx].updated_at = new Date().toISOString();
      saveRides(rides);
      res.json(rides[idx]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
