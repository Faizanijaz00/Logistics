// Passenger routes — all data stored in Supabase, shared by web + mobile

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Map DB row → frontend passenger shape
function toPassenger(row) {
  return {
    id: row.id,
    name: row.name,
    isDriver: row.is_driver,
    isVip: row.is_vip,
    active: row.active,
  };
}

export function registerPassengerRoutes(app) {
  // GET /api/passengers — return all passengers
  app.get('/api/passengers', async (req, res) => {
    try {
      const rows = await sb('/rest/v1/passengers?order=name.asc&select=*');
      res.json((rows || []).map(toPassenger));
    } catch (err) {
      console.error('[Passengers] GET error:', err.message);
      res.status(500).json({ error: 'Failed to load passengers' });
    }
  });

  // POST /api/passengers — add a new passenger
  app.post('/api/passengers', async (req, res) => {
    try {
      const { name, isVip } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const id = `pax-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const row = {
        id,
        name: name.trim(),
        is_driver: false,
        is_vip: isVip === true,
        active: true,
      };

      const result = await sb('/rest/v1/passengers', {
        method: 'POST',
        body: JSON.stringify(row),
      });

      res.status(201).json(toPassenger(Array.isArray(result) ? result[0] : result));
    } catch (err) {
      // Supabase returns 409 for unique constraint violations
      if (err.message.includes('409') || err.message.includes('duplicate') || err.message.includes('23505')) {
        return res.status(409).json({ error: 'Passenger already exists' });
      }
      console.error('[Passengers] POST error:', err.message);
      res.status(500).json({ error: 'Failed to add passenger' });
    }
  });

  // PUT /api/passengers/:id — update a passenger (toggle VIP, etc.)
  app.put('/api/passengers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const row = {};
      if (typeof updates.isVip === 'boolean') row.is_vip = updates.isVip;
      if (typeof updates.active === 'boolean') row.active = updates.active;
      if (typeof updates.name === 'string' && updates.name.trim()) row.name = updates.name.trim();
      row.updated_at = new Date().toISOString();

      const result = await sb(`/rest/v1/passengers?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(row),
      });

      if (!result || (Array.isArray(result) && result.length === 0)) {
        return res.status(404).json({ error: 'Passenger not found' });
      }

      res.json(toPassenger(Array.isArray(result) ? result[0] : result));
    } catch (err) {
      console.error('[Passengers] PUT error:', err.message);
      res.status(500).json({ error: 'Failed to update passenger' });
    }
  });

  // DELETE /api/passengers/:id — remove a passenger (cannot remove drivers)
  app.delete('/api/passengers/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch passenger to check if driver
      const rows = await sb(`/rest/v1/passengers?id=eq.${encodeURIComponent(id)}&select=*`);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Passenger not found' });
      }

      if (rows[0].is_driver) {
        return res.status(403).json({ error: 'Cannot remove a driver from the passenger list' });
      }

      await sb(`/rest/v1/passengers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      res.json({ success: true });
    } catch (err) {
      console.error('[Passengers] DELETE error:', err.message);
      res.status(500).json({ error: 'Failed to remove passenger' });
    }
  });
}
