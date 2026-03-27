// Trip routes — all data stored in Supabase, shared by web + mobile

import { Router } from 'express';
import { requireAuth } from './auth.js';

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

// Map DB row → frontend trip shape
function toTrip(row) {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    description: row.description,
    passengers: row.passengers || [],
    vehicles: row.vehicles || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Map frontend trip shape → DB columns (partial)
function toRow(t) {
  const row = {};
  if (t.name !== undefined) row.name = t.name;
  if (t.date !== undefined) row.date = t.date;
  if (t.description !== undefined) row.description = t.description;
  if (t.passengers !== undefined) row.passengers = t.passengers;
  if (t.vehicles !== undefined) row.vehicles = t.vehicles;
  if (t.createdBy !== undefined) row.created_by = t.createdBy;
  return row;
}

const tripsRouter = Router();

// GET /api/trips — return all trips
tripsRouter.get('/api/trips', requireAuth, async (req, res) => {
  try {
    const rows = await sb('/rest/v1/trips?order=created_at.desc&select=*');
    res.json((rows || []).map(toTrip));
  } catch (err) {
    console.error('[Trips] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// POST /api/trips — create a new trip
tripsRouter.post('/api/trips', requireAuth, async (req, res) => {
  try {
    const { id, name, date, description, passengers, vehicles } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const row = {
      id: id || `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      date: date || null,
      description: description || '',
      passengers: passengers || [],
      vehicles: vehicles || [],
      created_by: req.user.id,
    };

    const result = await sb('/rest/v1/trips', {
      method: 'POST',
      body: JSON.stringify(row),
    });

    res.status(201).json(toTrip(Array.isArray(result) ? result[0] : result));
  } catch (err) {
    console.error('[Trips] POST error:', err.message);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// PUT /api/trips/:id — update a trip
tripsRouter.put('/api/trips/:id', requireAuth, async (req, res) => {
  try {
    const row = toRow(req.body);
    row.updated_at = new Date().toISOString();

    const result = await sb(`/rest/v1/trips?id=eq.${encodeURIComponent(req.params.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(row),
    });

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(toTrip(Array.isArray(result) ? result[0] : result));
  } catch (err) {
    console.error('[Trips] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

// DELETE /api/trips/:id — delete a trip
tripsRouter.delete('/api/trips/:id', requireAuth, async (req, res) => {
  try {
    await sb(`/rest/v1/trips?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Trips] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

export { tripsRouter };
