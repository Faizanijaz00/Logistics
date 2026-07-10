// Inventory Checks — each car should contain a specific set of items, checked on
// the same weekly cadence as the maintenance check. Items are ticked off per
// car; the expected-item list is editable and bulk-importable. Mirrors the
// maintenance feature. Inventory items may be global (vehicle_id null = applies
// to all cars) or car-specific.
//
// Tables (see migrations/inventory.sql):
//   inventory_items        — expected items (id, vehicle_id, label, position)
//   inventory_checks       — one check run (id, vehicle_id, started_at, completed_at, created_by)
//   inventory_check_items  — per-run ticks (id, check_id, item_id, checked, checked_at)
import { randomUUID } from 'crypto';
import { sb } from './supabase.js';
import { getSetting, setSetting } from './maintenance.js';

const ROTATION_KEY = 'inventory_rotation_vehicle_id';

// Items relevant to a car = global (vehicle_id null) + that car's own items.
async function itemsForVehicle(vehicleId) {
  if (vehicleId) {
    return await sb(`/rest/v1/inventory_items?or=(vehicle_id.is.null,vehicle_id.eq.${encodeURIComponent(vehicleId)})&order=position.asc&select=*`);
  }
  return await sb('/rest/v1/inventory_items?order=position.asc&select=*');
}

export function registerInventoryRoutes(app, requireAuth) {
  // ── Expected item list ────────────────────────────────────────────────────
  app.get('/api/inventory/checklist-items', requireAuth, async (req, res) => {
    try {
      const rows = await itemsForVehicle(req.query.vehicle_id);
      res.json(rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/inventory/checklist-items', requireAuth, async (req, res) => {
    try {
      const label = (req.body.label || '').trim();
      if (!label) return res.status(400).json({ error: 'Label is required' });
      let position = req.body.position;
      if (position == null) {
        const rows = await sb('/rest/v1/inventory_items?order=position.desc&limit=1&select=position');
        position = (rows?.[0]?.position ?? 0) + 1;
      }
      const body = { id: req.body.id || randomUUID(), vehicle_id: req.body.vehicle_id || null, label, position };
      const result = await sb('/rest/v1/inventory_items', { method: 'POST', body: JSON.stringify(body) });
      res.status(201).json(Array.isArray(result) ? result[0] : result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.patch('/api/inventory/checklist-items/:id', requireAuth, async (req, res) => {
    try {
      const patch = {};
      if (req.body.label !== undefined) patch.label = req.body.label;
      if (req.body.position !== undefined) patch.position = req.body.position;
      if (req.body.vehicle_id !== undefined) patch.vehicle_id = req.body.vehicle_id;
      const result = await sb(`/rest/v1/inventory_items?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/inventory/checklist-items/:id', requireAuth, async (req, res) => {
    try {
      await sb(`/rest/v1/inventory_items?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Bulk import a list of labels (so the full list can be uploaded later).
  const importHandler = async (req, res) => {
    try {
      const labels = Array.isArray(req.body.labels) ? req.body.labels.map(l => String(l).trim()).filter(Boolean) : [];
      if (!labels.length) return res.status(400).json({ error: 'labels[] is required' });
      const vehicleId = req.body.vehicle_id || null;
      const existing = await sb('/rest/v1/inventory_items?order=position.desc&limit=1&select=position');
      let pos = (existing?.[0]?.position ?? 0) + 1;
      const rows = labels.map(label => ({ id: randomUUID(), vehicle_id: vehicleId, label, position: pos++ }));
      const result = await sb('/rest/v1/inventory_items', { method: 'POST', body: JSON.stringify(rows) });
      res.status(201).json(result || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  };
  app.post('/api/inventory/checklist-items/import', requireAuth, importHandler);
  app.post('/api/inventory-items/import', requireAuth, importHandler); // plan-named alias

  // ── Overview + rotation ───────────────────────────────────────────────────
  app.get('/api/inventory/overview', requireAuth, async (req, res) => {
    try {
      const [checks, rotationVehicleId] = await Promise.all([
        sb('/rest/v1/inventory_checks?order=started_at.desc&select=*'),
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

  app.put('/api/inventory/rotation', requireAuth, async (req, res) => {
    try {
      await setSetting(ROTATION_KEY, req.body.vehicle_id || null);
      res.json({ ok: true, vehicle_id: req.body.vehicle_id || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Checks ────────────────────────────────────────────────────────────────
  app.post('/api/inventory/checks', requireAuth, async (req, res) => {
    try {
      const vehicleId = req.body.vehicle_id;
      if (!vehicleId) return res.status(400).json({ error: 'vehicle_id is required' });

      const open = await sb(`/rest/v1/inventory_checks?vehicle_id=eq.${encodeURIComponent(vehicleId)}&completed_at=is.null&order=started_at.desc&limit=1&select=*`);
      if (open?.length) {
        const items = await sb(`/rest/v1/inventory_check_items?check_id=eq.${encodeURIComponent(open[0].id)}&select=*`);
        return res.json({ check: open[0], items: items || [] });
      }

      const now = new Date().toISOString();
      const check = { id: randomUUID(), vehicle_id: vehicleId, started_at: now, completed_at: null, created_by: req.user?.name || req.user?.username || null };
      const created = await sb('/rest/v1/inventory_checks', { method: 'POST', body: JSON.stringify(check) });
      const checkRow = Array.isArray(created) ? created[0] : created;

      const masters = await itemsForVehicle(vehicleId);
      const rows = (masters || []).map(m => ({ id: randomUUID(), check_id: checkRow.id, item_id: m.id, checked: false, checked_at: null }));
      let items = [];
      if (rows.length) items = await sb('/rest/v1/inventory_check_items', { method: 'POST', body: JSON.stringify(rows) }) || [];
      res.status(201).json({ check: checkRow, items });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/inventory/checks/:id', requireAuth, async (req, res) => {
    try {
      const check = await sb(`/rest/v1/inventory_checks?id=eq.${encodeURIComponent(req.params.id)}&select=*`);
      if (!check?.length) return res.status(404).json({ error: 'Check not found' });
      const items = await sb(`/rest/v1/inventory_check_items?check_id=eq.${encodeURIComponent(req.params.id)}&select=*`);
      res.json({ check: check[0], items: items || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.patch('/api/inventory/check-items/:id', requireAuth, async (req, res) => {
    try {
      const checked = !!req.body.checked;
      const patch = { checked, checked_at: checked ? new Date().toISOString() : null };
      const result = await sb(`/rest/v1/inventory_check_items?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/inventory/checks/:id/complete', requireAuth, async (req, res) => {
    try {
      const result = await sb(`/rest/v1/inventory_checks?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify({ completed_at: new Date().toISOString() }),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
