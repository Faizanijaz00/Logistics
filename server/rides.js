// Rider ("Uber") ride requests + push to drivers.
// Durable storage in the Supabase `ride_requests` table.
// Requires migrations/rides.sql to have been applied.
import { randomUUID } from 'crypto';
import { sb } from './supabase.js';

// Best-effort Expo push to drivers/admins that have a push token registered.
async function pushToDrivers(title, body, data) {
  let recipients = [];
  try {
    // Only drivers get ride requests — admins manage, they don't drive.
    const rows = await sb('/rest/v1/users?role=eq.driver&select=*');
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
  // Rider books a ride → insert + push drivers.
  app.post('/api/rides', requireAuth, async (req, res) => {
    const b = req.body || {};
    if (!b.destination_address) return res.status(400).json({ error: 'Destination required' });
    try {
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
        created_at: new Date().toISOString(),
      };
      const result = await sb('/rest/v1/ride_requests', { method: 'POST', body: JSON.stringify(row) });
      const saved = Array.isArray(result) ? result[0] : result;
      pushToDrivers(
        'New ride request',
        `${row.rider_name}: ${row.pickup_address ? row.pickup_address + ' → ' : ''}${row.destination_address}`,
        { type: 'ride_request', rideId: row.id },
      );
      res.status(201).json(saved || row);
    } catch (e) {
      console.error('[Rides] create error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // List rides. Riders see their own; drivers/admins see pending + their assigned.
  app.get('/api/rides', requireAuth, async (req, res) => {
    try {
      // `destination_address=not.is.null` excludes legacy rows from the older
      // requests feature that shares this table (they have no destination_address).
      const q = req.user.role === 'rider'
        ? `/rest/v1/ride_requests?rider_id=eq.${encodeURIComponent(req.user.id)}&destination_address=not.is.null&order=created_at.desc&select=*`
        : `/rest/v1/ride_requests?and=(destination_address.not.is.null,or(status.eq.pending,assigned_driver_id.eq.${encodeURIComponent(req.user.id)}))&order=created_at.desc&select=*`;
      const rows = await sb(q);
      res.json(rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Accept / update a ride (status change, driver claim, live driver location).
  app.patch('/api/rides/:id', requireAuth, async (req, res) => {
    const b = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (b.status) updates.status = b.status;
    if (b.status === 'accepted' && req.user.role !== 'rider') {
      updates.assigned_driver_id = req.user.id;
      updates.assigned_driver = b.assigned_driver || req.user.username;
    }
    if (b.driver_lat != null) updates.driver_lat = b.driver_lat;
    if (b.driver_lng != null) updates.driver_lng = b.driver_lng;
    try {
      const result = await sb(`/rest/v1/ride_requests?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(updates),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
