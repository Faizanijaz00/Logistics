// Rider ("Uber") ride requests + real push to drivers.
// A rider books a ride (pickup + destination); every driver/admin with a
// registered Expo push token gets a push notification. Drivers list pending
// rides and can accept them.
import { randomUUID } from 'crypto';
import { sb } from './supabase.js';

// Send an Expo push to all drivers/admins that have a push token registered.
async function pushToDrivers(title, body, data) {
  let recipients = [];
  try {
    const rows = await sb('/rest/v1/users?role=in.(driver,admin)&push_token=not.is.null&select=push_token');
    recipients = (rows || []).map(r => r.push_token).filter(Boolean);
  } catch (e) {
    console.warn('[Rides] could not load driver push tokens:', e.message);
    return;
  }
  if (recipients.length === 0) return;
  const messages = recipients.map(to => ({ to, title, body, data: data || {}, sound: 'default', priority: 'high' }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('[Rides] Expo push send failed:', e.message);
  }
}

export function registerRideRoutes(app, requireAuth) {
  // Rider books a ride → insert + push drivers.
  app.post('/api/rides', requireAuth, async (req, res) => {
    const b = req.body || {};
    if (!b.destination_address) return res.status(400).json({ error: 'Destination required' });
    try {
      // Rider's display name (JWT only carries id/username/role).
      let riderName = b.rider_name;
      if (!riderName) {
        const u = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}&select=name`);
        riderName = u?.[0]?.name || req.user.username;
      }
      const row = {
        id: randomUUID(),
        rider_id: req.user.id,
        rider_name: riderName,
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

      // Fire-and-forget push so the response isn't blocked on Expo.
      pushToDrivers(
        'New ride request',
        `${riderName}: ${b.pickup_address ? b.pickup_address + ' → ' : ''}${b.destination_address}`,
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
      let query;
      if (req.user.role === 'rider') {
        query = `/rest/v1/ride_requests?rider_id=eq.${encodeURIComponent(req.user.id)}&order=created_at.desc&select=*`;
      } else {
        query = `/rest/v1/ride_requests?or=(status.eq.pending,assigned_driver_id.eq.${encodeURIComponent(req.user.id)})&order=created_at.desc&select=*`;
      }
      const rows = await sb(query);
      res.json(rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Accept / update a ride (driver claims it, or status change).
  app.patch('/api/rides/:id', requireAuth, async (req, res) => {
    const b = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (b.status) updates.status = b.status;
    if (b.status === 'accepted' && req.user.role !== 'rider') {
      updates.assigned_driver_id = req.user.id;
      let name = b.assigned_driver;
      if (!name) {
        const u = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}&select=name`);
        name = u?.[0]?.name || req.user.username;
      }
      updates.assigned_driver = name;
    }
    try {
      const result = await sb(`/rest/v1/ride_requests?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(updates),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
