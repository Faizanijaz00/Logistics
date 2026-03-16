import { requireAuth, requireRole } from './auth.js';

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json();
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function registerJourneyRoutes(app) {

  // GET all journeys with cars and seats
  app.get('/api/journeys', requireAuth, async (req, res) => {
    try {
      const journeys = await sb(
        '/rest/v1/journeys?select=*,journey_cars(*,journey_seats(*))&order=scheduled_date.asc.nullslast,created_at.desc'
      );
      res.json(journeys);
    } catch (err) {
      console.error('[Journeys] GET error:', err.message);
      res.status(500).json({ error: 'Failed to fetch journeys' });
    }
  });

  // POST create journey
  app.post('/api/journeys', requireAuth, requireRole('admin'), async (req, res) => {
    const { name, destination, scheduledDate, scheduledTime, notes, type } = req.body;
    if (!name || !destination) return res.status(400).json({ error: 'name and destination required' });
    try {
      const rows = await sb('/rest/v1/journeys', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: uid('journey'),
          name: name.trim(),
          destination: destination.trim(),
          scheduled_date: scheduledDate || null,
          scheduled_time: scheduledTime || null,
          notes: notes || '',
          status: 'planned',
          type: type === 'regular' ? 'regular' : 'major',
          created_by: req.user.id,
        }),
      });
      res.json({ ...rows[0], journey_cars: [] });
    } catch (err) {
      console.error('[Journeys] POST error:', err.message);
      res.status(500).json({ error: 'Failed to create journey' });
    }
  });

  // PATCH update journey (status, etc.)
  app.patch('/api/journeys/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const allowed = ['name', 'destination', 'scheduled_date', 'scheduled_time', 'notes', 'status', 'type'];
    const updates = {};
    for (const k of allowed) {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (req.body[k] !== undefined) updates[k] = req.body[k];
      else if (req.body[camel] !== undefined) updates[k] = req.body[camel] || null;
    }
    try {
      const rows = await sb(`/rest/v1/journeys?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(updates),
      });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update journey' });
    }
  });

  // DELETE journey
  app.delete('/api/journeys/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await sb(`/rest/v1/journeys?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete journey' });
    }
  });

  // POST add car to journey
  app.post('/api/journeys/:id/cars', requireAuth, requireRole('admin'), async (req, res) => {
    const { vehicleId, vehicleName, vehiclePlate, seatCount } = req.body;
    if (!vehicleId) return res.status(400).json({ error: 'vehicleId required' });
    try {
      const rows = await sb('/rest/v1/journey_cars', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: uid('car'),
          journey_id: req.params.id,
          vehicle_id: vehicleId,
          vehicle_name: vehicleName || vehicleId,
          vehicle_plate: vehiclePlate || '',
          seat_count: seatCount || 5,
        }),
      });
      res.json({ ...rows[0], journey_seats: [] });
    } catch (err) {
      console.error('[Journeys] Add car error:', err.message);
      res.status(500).json({ error: 'Failed to add car' });
    }
  });

  // DELETE remove car from journey
  app.delete('/api/journeys/:id/cars/:carId', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await sb(`/rest/v1/journey_cars?id=eq.${encodeURIComponent(req.params.carId)}`, { method: 'DELETE' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove car' });
    }
  });

  // PUT assign / update a seat
  app.put('/api/journeys/:id/cars/:carId/seats/:index', requireAuth, requireRole('admin'), async (req, res) => {
    const { personName, personId, isDriver } = req.body;
    const seatIndex = parseInt(req.params.index, 10);
    const carId = req.params.carId;
    try {
      await sb(
        `/rest/v1/journey_seats?journey_car_id=eq.${encodeURIComponent(carId)}&seat_index=eq.${seatIndex}`,
        { method: 'DELETE' }
      );
      if (personName?.trim()) {
        const rows = await sb('/rest/v1/journey_seats', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            id: uid('seat'),
            journey_car_id: carId,
            seat_index: seatIndex,
            person_name: personName.trim(),
            person_id: personId || null,
            is_driver: !!isDriver,
          }),
        });
        return res.json(rows[0]);
      }
      res.json({ journey_car_id: carId, seat_index: seatIndex, person_name: '' });
    } catch (err) {
      console.error('[Journeys] Seat PUT error:', err.message);
      res.status(500).json({ error: 'Failed to assign seat' });
    }
  });

  // DELETE clear a seat
  app.delete('/api/journeys/:id/cars/:carId/seats/:index', requireAuth, requireRole('admin'), async (req, res) => {
    const seatIndex = parseInt(req.params.index, 10);
    try {
      await sb(
        `/rest/v1/journey_seats?journey_car_id=eq.${encodeURIComponent(req.params.carId)}&seat_index=eq.${seatIndex}`,
        { method: 'DELETE' }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to clear seat' });
    }
  });
}
