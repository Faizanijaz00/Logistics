// Shared data routes — activities, tickets, parking, requests, notifications, emergencies, locations, logistics

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

// Tables that use `timestamp` instead of `created_at` for ordering
const TIMESTAMP_TABLES = new Set(['activities', 'notifications', 'emergencies']);

function crud(app, table, requireAuth, idField = 'id') {
  const path = `/api/${table.replace('_', '-')}`;
  const orderCol = TIMESTAMP_TABLES.has(table) ? 'timestamp' : 'created_at';

  // GET all
  app.get(path, requireAuth, async (req, res) => {
    try {
      const rows = await sb(`/rest/v1/${table}?order=${orderCol}.desc&select=*`);
      res.json(rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST create
  app.post(path, requireAuth, async (req, res) => {
    try {
      const result = await sb(`/rest/v1/${table}`, { method: 'POST', body: JSON.stringify(req.body) });
      res.status(201).json(Array.isArray(result) ? result[0] : result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH update
  app.patch(`${path}/:id`, requireAuth, async (req, res) => {
    try {
      const result = await sb(`/rest/v1/${table}?${idField}=eq.${req.params.id}`, {
        method: 'PATCH', body: JSON.stringify(req.body),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE single
  app.delete(`${path}/:id`, requireAuth, async (req, res) => {
    try {
      await sb(`/rest/v1/${table}?${idField}=eq.${req.params.id}`, { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

export function registerMiscRoutes(app, requireAuth) {
  // Standard CRUD tables
  crud(app, 'activities', requireAuth);
  crud(app, 'tickets', requireAuth);
  crud(app, 'parking_zones', requireAuth);
  crud(app, 'ride_requests', requireAuth);
  crud(app, 'notifications', requireAuth);
  crud(app, 'emergencies', requireAuth);
  crud(app, 'saved_locations', requireAuth);

  // DELETE all activities (clear log)
  app.delete('/api/activities', requireAuth, async (req, res) => {
    try {
      await sb('/rest/v1/activities?id=neq.none', { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE all notifications
  app.delete('/api/notifications', requireAuth, async (req, res) => {
    try {
      await sb('/rest/v1/notifications?id=neq.none', { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Logistics sessions ──────────────────────────────────────────────────────
  // GET session (default: id=default)
  app.get('/api/logistics/:id', requireAuth, async (req, res) => {
    try {
      const rows = await sb(`/rest/v1/logistics_sessions?id=eq.${req.params.id}&select=*`);
      if (!rows?.length) return res.json(null);
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT upsert session (create or replace)
  app.put('/api/logistics/:id', requireAuth, async (req, res) => {
    try {
      const body = { id: req.params.id, ...req.body, updated_at: new Date().toISOString() };
      const result = await sb('/rest/v1/logistics_sessions', {
        method: 'POST',
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(body),
      });
      res.json(Array.isArray(result) ? result[0] : result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
