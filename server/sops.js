// SOPs — standard operating procedures. Each SOP has a title and supports BOTH
// typed text (body) AND an optional file attachment (PDF/image, stored via the
// receipts upload endpoint). Mirrors the tickets REST pattern; data lives in the
// Supabase `sops` table. Run migrations/sops.sql once to create it.
import { randomUUID } from 'crypto';
import { sb } from './supabase.js';

export function registerSopRoutes(app, requireAuth) {
  // GET all SOPs (newest first)
  app.get('/api/sops', requireAuth, async (req, res) => {
    try {
      const rows = await sb('/rest/v1/sops?order=updated_at.desc&select=*');
      res.json(rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST create an SOP
  app.post('/api/sops', requireAuth, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const body = {
        id: req.body.id || randomUUID(),
        title: (req.body.title || '').trim(),
        body: req.body.body != null ? req.body.body : null,
        attachment_path: req.body.attachment_path || null,
        created_by: req.body.created_by || req.user?.name || req.user?.username || null,
        created_at: now,
        updated_at: now,
      };
      if (!body.title) return res.status(400).json({ error: 'Title is required' });
      const result = await sb('/rest/v1/sops', { method: 'POST', body: JSON.stringify(body) });
      res.status(201).json(Array.isArray(result) ? result[0] : result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH update an SOP
  app.patch('/api/sops/:id', requireAuth, async (req, res) => {
    try {
      const allowed = ['title', 'body', 'attachment_path'];
      const patch = { updated_at: new Date().toISOString() };
      for (const key of allowed) {
        if (req.body[key] !== undefined) patch[key] = req.body[key];
      }
      const result = await sb(`/rest/v1/sops?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE an SOP
  app.delete('/api/sops/:id', requireAuth, async (req, res) => {
    try {
      await sb(`/rest/v1/sops?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
