// Shared data routes — activities, tickets, parking, requests, notifications, emergencies, locations, logistics

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { reverseGeocode } from './geocode.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadJsonFile(name) {
  ensureDataDir();
  const filePath = join(DATA_DIR, name);
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function saveJsonFile(name, data) {
  ensureDataDir();
  writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2));
}

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

  // ── Fuel records (file-backed) ──────────────────────────────────────────────
  app.get('/api/fuel-records', requireAuth, (req, res) => {
    try {
      const { vehicleId } = req.query;
      const all = loadJsonFile('fuel_records.json');
      const filtered = vehicleId ? all.filter(r => r.vehicleId === vehicleId) : all;
      res.json(filtered);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/fuel-records', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('fuel_records.json');
      const record = {
        id: randomUUID(),
        vehicleId: req.body.vehicleId || null,
        amount: Number(req.body.amount) || 0,
        paidBy: req.body.paidBy || req.user?.name || '',
        usedFuelCard: !!req.body.usedFuelCard,
        receiptPath: req.body.receiptPath || null,
        createdAt: new Date().toISOString(),
      };
      all.push(record);
      saveJsonFile('fuel_records.json', all);
      res.status(201).json(record);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.patch('/api/fuel-records/:id', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('fuel_records.json');
      const idx = all.findIndex(r => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Fuel record not found' });
      const allowed = ['vehicleId', 'amount', 'paidBy', 'usedFuelCard', 'receiptPath'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) all[idx][key] = key === 'amount' ? Number(req.body[key]) : req.body[key];
      }
      saveJsonFile('fuel_records.json', all);
      res.json(all[idx]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/fuel-records/:id', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('fuel_records.json');
      const next = all.filter(r => r.id !== req.params.id);
      if (next.length === all.length) return res.status(404).json({ error: 'Fuel record not found' });
      saveJsonFile('fuel_records.json', next);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Issues (file-backed) ────────────────────────────────────────────────────
  app.get('/api/issues', requireAuth, (req, res) => {
    try {
      const { vehicleId } = req.query;
      const all = loadJsonFile('issues.json');
      const filtered = vehicleId ? all.filter(r => r.vehicleId === vehicleId) : all;
      res.json(filtered);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/issues', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('issues.json');
      const issue = {
        id: randomUUID(),
        vehicleId: req.body.vehicleId || null,
        reportedBy: req.body.reportedBy || req.user?.name || '',
        description: req.body.description || '',
        severity: req.body.severity || 'low',
        photoPath: req.body.photoPath || null,
        resolved: false,
        createdAt: req.body.createdAt || new Date().toISOString(),
      };
      all.push(issue);
      saveJsonFile('issues.json', all);
      res.status(201).json(issue);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH an issue — mark resolved, update fields
  app.patch('/api/issues/:id', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('issues.json');
      const idx = all.findIndex(i => i.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Issue not found' });
      const allowed = ['description', 'severity', 'resolved', 'photoPath'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) all[idx][key] = req.body[key];
      }
      all[idx].updatedAt = new Date().toISOString();
      saveJsonFile('issues.json', all);
      res.json(all[idx]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE an issue
  app.delete('/api/issues/:id', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('issues.json');
      const next = all.filter(i => i.id !== req.params.id);
      if (next.length === all.length) return res.status(404).json({ error: 'Issue not found' });
      saveJsonFile('issues.json', next);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Drives (file-backed) ────────────────────────────────────────────────────
  // A drive is created when a driver "starts" (selects a vehicle) and updated
  // when they "stop" (park the vehicle). Time between start/end + start/end
  // location coordinates are stored so we can show a history of every trip.

  app.get('/api/drives', requireAuth, async (req, res) => {
    try {
      const { vehicleId, driverId } = req.query;
      const all = loadJsonFile('drives.json');

      // Lazily turn coordinates into human-readable addresses for older drives
      // that were saved before geocoding existed. Capped per request so we never
      // block on a long run of Nominatim lookups (it fills in over a few loads).
      let changed = false;
      let budget = 3;
      for (const d of all) {
        if (budget <= 0) break;
        if (!d.startAddress && d.startPosition) {
          d.startAddress = await reverseGeocode(d.startPosition.lat, d.startPosition.lng);
          changed = true; budget--;
        }
        if (budget > 0 && d.endedAt && !d.endAddress && d.endPosition) {
          d.endAddress = await reverseGeocode(d.endPosition.lat, d.endPosition.lng);
          changed = true; budget--;
        }
      }
      if (changed) saveJsonFile('drives.json', all);

      let filtered = all;
      if (vehicleId) filtered = filtered.filter(d => d.vehicleId === vehicleId);
      if (driverId) filtered = filtered.filter(d => d.driverId === driverId);
      filtered.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      res.json(filtered);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Start a drive — returns the new drive id which client should remember to call /stop on
  app.post('/api/drives/start', requireAuth, async (req, res) => {
    try {
      const all = loadJsonFile('drives.json');
      const startPos = req.body.startPosition || null; // { lat, lng } or null
      // Fill in a human-readable address if the client only sent coordinates.
      let startAddress = req.body.startAddress || null;
      if (!startAddress && startPos) startAddress = await reverseGeocode(startPos.lat, startPos.lng);
      // JWT has { id, username, role } but not `name` — trust the client-sent
      // driverName first, fall back to anything we can get from req.user.
      const drive = {
        id: randomUUID(),
        vehicleId: req.body.vehicleId || null,
        vehicleName: req.body.vehicleName || '',
        driverId: req.body.driverId || req.user?.id || null,
        driverName: req.body.driverName || req.user?.name || req.user?.username || 'Unknown',
        startedAt: new Date().toISOString(),
        startPosition: startPos,
        startAddress,
        endedAt: null,
        endPosition: null,
        endAddress: null,
        durationMs: null,
      };
      all.push(drive);
      saveJsonFile('drives.json', all);
      res.status(201).json(drive);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Stop a drive — patches the drive with end position and computes duration
  app.post('/api/drives/:id/stop', requireAuth, async (req, res) => {
    try {
      const all = loadJsonFile('drives.json');
      const idx = all.findIndex(d => d.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Drive not found' });
      const drive = all[idx];
      if (drive.endedAt) return res.status(409).json({ error: 'Drive already ended', drive });
      const endPos = req.body.endPosition || null;
      let endAddress = req.body.endAddress || null;
      if (!endAddress && endPos) endAddress = await reverseGeocode(endPos.lat, endPos.lng);
      drive.endedAt = new Date().toISOString();
      drive.endPosition = endPos;
      drive.endAddress = endAddress;
      drive.durationMs = new Date(drive.endedAt) - new Date(drive.startedAt);
      saveJsonFile('drives.json', all);

      // The ride is over — clear the vehicle's set destination so it doesn't
      // linger for the next driver. Best-effort: never fail the stop on this.
      if (drive.vehicleId) {
        try {
          await sb(`/rest/v1/vehicles?id=eq.${encodeURIComponent(drive.vehicleId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ destination: null }),
          });
        } catch {}
      }

      res.json(drive);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/drives/:id', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('drives.json');
      const next = all.filter(d => d.id !== req.params.id);
      if (next.length === all.length) return res.status(404).json({ error: 'Drive not found' });
      saveJsonFile('drives.json', next);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Update a drive (admin: edit driver, vehicle, times, locations)
  app.patch('/api/drives/:id', requireAuth, (req, res) => {
    try {
      const all = loadJsonFile('drives.json');
      const idx = all.findIndex(d => d.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Drive not found' });
      const allowed = [
        'vehicleId', 'vehicleName', 'driverId', 'driverName',
        'startedAt', 'startPosition', 'startAddress',
        'endedAt', 'endPosition', 'endAddress',
      ];
      for (const key of allowed) {
        if (req.body[key] !== undefined) all[idx][key] = req.body[key];
      }
      // Recompute duration if both timestamps exist
      if (all[idx].startedAt && all[idx].endedAt) {
        all[idx].durationMs = new Date(all[idx].endedAt) - new Date(all[idx].startedAt);
      } else if (all[idx].endedAt === null) {
        all[idx].durationMs = null;
      }
      saveJsonFile('drives.json', all);
      res.json(all[idx]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
