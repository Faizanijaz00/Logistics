import jwt from 'jsonwebtoken';
import { config } from './config.js';

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

// --- Supabase REST helper ---

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

function sanitizeUser(user) {
  const { password_hash, selected_vehicle_id, ...safe } = user;
  return { ...safe, selectedVehicleId: selected_vehicle_id ?? null };
}

// --- JWT helpers ---

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

// --- Middleware ---

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// --- Connection check on startup ---

export async function seedUsers() {
  try {
    const users = await sb('/rest/v1/users?select=username');
    console.log(`[Auth] Supabase connected — ${users.length} user(s) loaded`);
  } catch (err) {
    console.error('[Auth] Supabase connection failed:', err.message);
  }
}

// --- Route handlers ---

export function registerAuthRoutes(app) {
  // Login
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    try {
      const rows = await sb('/rest/v1/rpc/verify_user', {
        method: 'POST',
        body: JSON.stringify({ p_username: username, p_password: password }),
      });
      if (!rows || rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = rows[0];
      const token = signToken(user);
      res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
      console.error('[Auth] Login error:', err.message);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const rows = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}&select=*`);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ user: sanitizeUser(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Select a vehicle (assigns to current user, clears previous driver)
  app.post('/api/auth/select-vehicle', requireAuth, async (req, res) => {
    const { vehicleId } = req.body;
    try {
      // Clear this vehicle from whoever else has it
      if (vehicleId) {
        await sb(`/rest/v1/users?selected_vehicle_id=eq.${encodeURIComponent(vehicleId)}&id=neq.${encodeURIComponent(req.user.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ selected_vehicle_id: null }),
        });
      }
      // Assign to current user
      const rows = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ selected_vehicle_id: vehicleId || null }),
      });
      res.json({ user: sanitizeUser(rows[0]) });
    } catch (err) {
      console.error('[Auth] Select vehicle error:', err.message);
      res.status(500).json({ error: 'Failed to update vehicle' });
    }
  });

  // Get all users
  app.get('/api/auth/users', requireAuth, async (req, res) => {
    try {
      const users = await sb('/rest/v1/users?select=*');
      res.json(users.map(sanitizeUser));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Create a new user (admin only)
  app.post('/api/auth/register', requireAuth, requireRole('admin'), async (req, res) => {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name required' });
    }
    try {
      const hash = await sb('/rest/v1/rpc/hash_password', {
        method: 'POST',
        body: JSON.stringify({ p_password: password }),
      });
      const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const rows = await sb('/rest/v1/users', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ id, username, password_hash: hash, name, role: role || 'driver' }),
      });
      res.json({ user: sanitizeUser(rows[0]) });
    } catch (err) {
      if (err.message.includes('duplicate') || err.message.includes('unique')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      console.error('[Auth] Register error:', err.message);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Delete a user (admin only)
  app.delete('/api/auth/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    try {
      const rows = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&select=*`);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const target = rows[0];
      if (target.role === 'admin') {
        const admins = await sb('/rest/v1/users?role=eq.admin&select=id');
        if (admins.length <= 1) {
          return res.status(400).json({ error: 'Cannot delete the last admin' });
        }
      }
      await sb(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      res.json({ success: true });
    } catch (err) {
      console.error('[Auth] Delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });
}
