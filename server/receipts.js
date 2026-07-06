// Receipt uploads — fuel receipts, PCN/ticket notices, issue photos.
// Files live in a PRIVATE Supabase Storage bucket ("receipts"). Nothing is
// publicly reachable: the app requests a short-lived signed URL to view one.
// See migrations/receipts_storage.sql for the one-time bucket + policy setup.

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';
const BUCKET = 'receipts';

const KIND_FOLDERS = { fuel: 'fuel', ticket: 'tickets', issue: 'issues' };
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

// A stored receipt path always begins with a known folder — reject anything else
// so a crafted `path` can't be used to sign/read arbitrary objects (traversal).
function isSafeReceiptPath(path) {
  if (typeof path !== 'string' || path.includes('..') || path.startsWith('/')) return false;
  const folder = path.split('/')[0];
  return Object.values(KIND_FOLDERS).includes(folder);
}

export function registerReceiptRoutes(app, requireAuth) {
  // Upload a receipt image/pdf (base64 data URI). Returns the storage path.
  app.post('/api/upload-receipt', requireAuth, async (req, res) => {
    try {
      const { imageData, kind } = req.body;
      if (!imageData) return res.status(400).json({ error: 'No imageData provided' });
      const folder = KIND_FOLDERS[kind];
      if (!folder) return res.status(400).json({ error: 'Invalid kind (expected fuel|ticket|issue)' });

      const match = /^data:([^;]+);base64,/.exec(imageData);
      const mime = match?.[1] || 'image/jpeg';
      const ext = EXT_BY_MIME[mime];
      if (!ext) return res.status(400).json({ error: `Unsupported file type: ${mime}` });

      const base64 = imageData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > 15 * 1024 * 1024) return res.status(413).json({ error: 'File too large (max 15MB)' });

      const path = `${folder}/${Date.now()}-${Math.round(buffer.length)}.${ext}`;
      const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': mime,
          'x-upsert': 'false',
        },
        body: buffer,
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error('[Receipts] Upload failed:', resp.status, text);
        return res.status(502).json({ error: 'Storage upload failed' });
      }
      res.status(201).json({ path });
    } catch (err) {
      console.error('[Receipts] Upload error:', err.message);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Mint a short-lived signed URL for viewing a stored receipt.
  app.get('/api/receipts/url', requireAuth, async (req, res) => {
    try {
      const path = req.query.path;
      if (!isSafeReceiptPath(path)) return res.status(400).json({ error: 'Invalid path' });

      const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }), // 1 hour
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error('[Receipts] Sign failed:', resp.status, text);
        return res.status(404).json({ error: 'Receipt not found' });
      }
      const data = await resp.json();
      // Supabase returns a relative signedURL like "/object/sign/receipts/..."
      const signedURL = data.signedURL || data.signedUrl;
      res.json({ url: `${SUPABASE_URL}/storage/v1${signedURL}` });
    } catch (err) {
      console.error('[Receipts] Sign error:', err.message);
      res.status(500).json({ error: 'Failed to sign receipt' });
    }
  });
}
