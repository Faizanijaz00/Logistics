// Maintenance Checks — every car needs a weekly maintenance check. An admin
// manually marks which car is "in rotation" (currently up for its check). Each
// check is the master checklist ticked off one item at a time. A car's check is
// OVERDUE when 7+ days have passed since its last completed check.
//
// Tables (see migrations/maintenance.sql):
//   maintenance_checklist_items  — reusable master list (id, label, position)
//   maintenance_checks           — one check run (id, vehicle_id, started_at, completed_at, created_by)
//   maintenance_check_items      — per-run ticks (id, check_id, item_id, checked, checked_at)
//   admin_settings               — small KV store; holds the in-rotation vehicle
import { randomUUID } from 'crypto';
import { sb } from './supabase.js';

const ROTATION_KEY = 'maintenance_rotation_vehicle_id';

// --- small KV helpers over admin_settings (shared shape with inventory) ------
export async function getSetting(key) {
  const rows = await sb(`/rest/v1/admin_settings?key=eq.${encodeURIComponent(key)}&select=value`);
  return rows?.[0]?.value ?? null;
}

export async function setSetting(key, value) {
  await sb('/rest/v1/admin_settings', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
}

export function registerMaintenanceRoutes(app, requireAuth) {
  // ── Master checklist items ────────────────────────────────────────────────
  app.get('/api/maintenance/checklist-items', requireAuth, async (req, res) => {
    try {
      const rows = await sb('/rest/v1/maintenance_checklist_items?order=position.asc&select=*');
      res.json(rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/maintenance/checklist-items', requireAuth, async (req, res) => {
    try {
      const label = (req.body.label || '').trim();
      if (!label) return res.status(400).json({ error: 'Label is required' });
      let position = req.body.position;
      if (position == null) {
        const rows = await sb('/rest/v1/maintenance_checklist_items?order=position.desc&limit=1&select=position');
        position = (rows?.[0]?.position ?? 0) + 1;
      }
      const body = { id: req.body.id || randomUUID(), label, position };
      const result = await sb('/rest/v1/maintenance_checklist_items', { method: 'POST', body: JSON.stringify(body) });
      res.status(201).json(Array.isArray(result) ? result[0] : result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.patch('/api/maintenance/checklist-items/:id', requireAuth, async (req, res) => {
    try {
      const patch = {};
      if (req.body.label !== undefined) patch.label = req.body.label;
      if (req.body.position !== undefined) patch.position = req.body.position;
      const result = await sb(`/rest/v1/maintenance_checklist_items?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/maintenance/checklist-items/:id', requireAuth, async (req, res) => {
    try {
      await sb(`/rest/v1/maintenance_checklist_items?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Overview: per-vehicle last-completed + open check + which car's in rotation
  app.get('/api/maintenance/overview', requireAuth, async (req, res) => {
    try {
      const [checks, rotationVehicleId] = await Promise.all([
        sb('/rest/v1/maintenance_checks?order=started_at.desc&select=*'),
        getSetting(ROTATION_KEY),
      ]);
      const byVehicle = {};
      for (const c of checks || []) {
        const v = c.vehicle_id;
        if (!v) continue;
        if (!byVehicle[v]) byVehicle[v] = { vehicle_id: v, last_completed_at: null, open_check_id: null };
        if (c.completed_at) {
          if (!byVehicle[v].last_completed_at || new Date(c.completed_at) > new Date(byVehicle[v].last_completed_at)) {
            byVehicle[v].last_completed_at = c.completed_at;
          }
        } else if (!byVehicle[v].open_check_id) {
          byVehicle[v].open_check_id = c.id;
        }
      }
      res.json({ rotation_vehicle_id: rotationVehicleId, summaries: Object.values(byVehicle) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Set which car is currently in rotation (admin picks it manually)
  app.put('/api/maintenance/rotation', requireAuth, async (req, res) => {
    try {
      await setSetting(ROTATION_KEY, req.body.vehicle_id || null);
      res.json({ ok: true, vehicle_id: req.body.vehicle_id || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Checks ──────────────────────────────────────────────────────────────
  // Start a check for a car (or resume the existing open one). Snapshots the
  // current master checklist into per-run items.
  app.post('/api/maintenance/checks', requireAuth, async (req, res) => {
    try {
      const vehicleId = req.body.vehicle_id;
      if (!vehicleId) return res.status(400).json({ error: 'vehicle_id is required' });

      // Resume an already-open check if one exists.
      const open = await sb(`/rest/v1/maintenance_checks?vehicle_id=eq.${encodeURIComponent(vehicleId)}&completed_at=is.null&order=started_at.desc&limit=1&select=*`);
      if (open?.length) {
        const items = await sb(`/rest/v1/maintenance_check_items?check_id=eq.${encodeURIComponent(open[0].id)}&select=*`);
        return res.json({ check: open[0], items: items || [] });
      }

      const now = new Date().toISOString();
      const check = {
        id: randomUUID(),
        vehicle_id: vehicleId,
        started_at: now,
        completed_at: null,
        created_by: req.user?.name || req.user?.username || null,
      };
      const created = await sb('/rest/v1/maintenance_checks', { method: 'POST', body: JSON.stringify(check) });
      const checkRow = Array.isArray(created) ? created[0] : created;

      const masters = await sb('/rest/v1/maintenance_checklist_items?order=position.asc&select=*');
      const rows = (masters || []).map(m => ({ id: randomUUID(), check_id: checkRow.id, item_id: m.id, checked: false, checked_at: null }));
      let items = [];
      if (rows.length) {
        items = await sb('/rest/v1/maintenance_check_items', { method: 'POST', body: JSON.stringify(rows) }) || [];
      }
      res.status(201).json({ check: checkRow, items });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Get a check with its items
  app.get('/api/maintenance/checks/:id', requireAuth, async (req, res) => {
    try {
      const check = await sb(`/rest/v1/maintenance_checks?id=eq.${encodeURIComponent(req.params.id)}&select=*`);
      if (!check?.length) return res.status(404).json({ error: 'Check not found' });
      const items = await sb(`/rest/v1/maintenance_check_items?check_id=eq.${encodeURIComponent(req.params.id)}&select=*`);
      res.json({ check: check[0], items: items || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Toggle a single item
  app.patch('/api/maintenance/check-items/:id', requireAuth, async (req, res) => {
    try {
      const checked = !!req.body.checked;
      const patch = { checked, checked_at: checked ? new Date().toISOString() : null };
      const result = await sb(`/rest/v1/maintenance_check_items?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Complete a check — clears the overdue state for that car
  app.post('/api/maintenance/checks/:id/complete', requireAuth, async (req, res) => {
    try {
      const result = await sb(`/rest/v1/maintenance_checks?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify({ completed_at: new Date().toISOString() }),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
