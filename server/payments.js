// Payments — log a purchase (what was bought, how much, where from) with an
// optional receipt photo. Mirrors the tickets REST pattern; data lives in the
// Supabase `payments` table. Run migrations/payments.sql once to create it.
import { randomUUID } from 'crypto';
import { sb } from './supabase.js';

export function registerPaymentRoutes(app, requireAuth) {
  // GET all payments (newest first)
  app.get('/api/payments', requireAuth, async (req, res) => {
    try {
      const rows = await sb('/rest/v1/payments?order=created_at.desc&select=*');
      res.json(rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST create a payment
  app.post('/api/payments', requireAuth, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const body = {
        id: req.body.id || randomUUID(),
        item: (req.body.item || '').trim(),
        amount: req.body.amount != null ? Number(req.body.amount) : null,
        vendor: (req.body.vendor || '').trim() || null,
        receipt_path: req.body.receipt_path || null,
        created_by: req.body.created_by || req.user?.name || req.user?.username || null,
        created_at: now,
      };
      if (!body.item) return res.status(400).json({ error: 'Item is required' });
      const result = await sb('/rest/v1/payments', { method: 'POST', body: JSON.stringify(body) });
      res.status(201).json(Array.isArray(result) ? result[0] : result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH update a payment
  app.patch('/api/payments/:id', requireAuth, async (req, res) => {
    try {
      const allowed = ['item', 'amount', 'vendor', 'receipt_path'];
      const patch = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) patch[key] = key === 'amount' ? Number(req.body[key]) : req.body[key];
      }
      const result = await sb(`/rest/v1/payments?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE a payment
  app.delete('/api/payments/:id', requireAuth, async (req, res) => {
    try {
      await sb(`/rest/v1/payments?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}
