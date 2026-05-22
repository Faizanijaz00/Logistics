import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_FILE = join(__dirname, 'data', 'users.json');

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

let supabaseAvailable = true;

function loadLocalUsers() {
  try { return JSON.parse(readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function saveLocalUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

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
    supabaseAvailable = true;
  } catch (err) {
    console.error('[Auth] Supabase connection failed, using local auth:', err.message);
    supabaseAvailable = false;
    const localUsers = loadLocalUsers();
    console.log(`[Auth] Local fallback — ${localUsers.length} user(s) loaded`);
  }
}

// --- Route handlers ---

export function registerAuthRoutes(app) {
  // Login — tries Supabase first, falls back to local JSON
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Try Supabase first
    if (supabaseAvailable) {
      try {
        const rows = await sb('/rest/v1/rpc/verify_user', {
          method: 'POST',
          body: JSON.stringify({ p_username: username, p_password: password }),
        });
        if (rows && rows.length > 0) {
          const user = rows[0];
          const token = signToken(user);
          return res.json({ token, user: { ...sanitizeUser(user), disabledTabs: user.disabled_tabs || user.disabledTabs || [] } });
        }
      } catch (err) {
        console.warn('[Auth] Supabase login failed, trying local:', err.message);
        supabaseAvailable = false;
      }
    }

    // Local fallback
    try {
      const users = loadLocalUsers();
      const user = users.find(u => u.username === username);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      const token = signToken(user);
      res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, selectedVehicleId: user.selectedVehicleId || null, disabledTabs: user.disabledTabs || [] } });
    } catch (err) {
      console.error('[Auth] Login error:', err.message);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    if (supabaseAvailable) {
      try {
        const rows = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}&select=*`);
        if (rows && rows.length > 0) return res.json({ user: { ...sanitizeUser(rows[0]), disabledTabs: rows[0].disabled_tabs || rows[0].disabledTabs || [] } });
      } catch { supabaseAvailable = false; }
    }
    // Local fallback
    const users = loadLocalUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role, selectedVehicleId: user.selectedVehicleId || null, disabledTabs: user.disabledTabs || [] } });
  });

  // Select a vehicle (assigns to current user, clears previous driver)
  app.post('/api/auth/select-vehicle', requireAuth, async (req, res) => {
    const { vehicleId } = req.body;
    try {
      // Release any vehicle this user was previously driving (no driver should hold 2 cars)
      await sb(`/rest/v1/vehicles?current_driver_id=eq.${encodeURIComponent(req.user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ current_driver: null, current_driver_id: null }),
      });

      if (vehicleId) {
        // Clear this vehicle from any OTHER user who had it selected
        await sb(`/rest/v1/users?selected_vehicle_id=eq.${encodeURIComponent(vehicleId)}&id=neq.${encodeURIComponent(req.user.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ selected_vehicle_id: null }),
        });

        // Get the current user's name to set as the driver
        const userRows = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}&select=name`);
        const driverName = userRows?.[0]?.name || req.user.username;

        // Claim the new vehicle
        await sb(`/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ current_driver: driverName, current_driver_id: req.user.id }),
        });
      }

      // Update the user's selected_vehicle_id
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
    if (supabaseAvailable) {
      try {
        const users = await sb('/rest/v1/users?select=*');
        if (users) {
          // Merge disabledTabs from local storage
          const localUsers = loadLocalUsers();
          const localMap = {};
          localUsers.forEach(u => { localMap[u.username] = u.disabledTabs || []; });
          return res.json(users.map(u => ({ ...sanitizeUser(u), disabledTabs: localMap[u.username] || u.disabled_tabs || u.disabledTabs || [] })));
        }
      } catch { supabaseAvailable = false; }
    }
    // Local fallback
    const users = loadLocalUsers();
    res.json(users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, selectedVehicleId: u.selectedVehicleId || null, disabledTabs: u.disabledTabs || [] })));
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

  // Update user tab access (admin only)
  app.patch('/api/auth/users/:id/tabs', requireAuth, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { disabledTabs } = req.body;
    if (!Array.isArray(disabledTabs)) {
      return res.status(400).json({ error: 'disabledTabs must be an array' });
    }
    // Never allow disabling the admin tab
    const filtered = disabledTabs.filter(t => t !== '/admin');
    try {
      // First find the username — could be a Supabase ID or local ID
      let username = null;
      if (supabaseAvailable) {
        try {
          const rows = await sb(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&select=username`);
          if (rows && rows.length > 0) username = rows[0].username;
        } catch {}
      }
      const users = loadLocalUsers();
      // Match by ID first, then by username (handles Supabase IDs)
      let idx = users.findIndex(u => u.id === id);
      if (idx === -1 && username) idx = users.findIndex(u => u.username === username);
      // If user exists in Supabase but not locally, create a local entry
      if (idx === -1 && username) {
        let supaUser = null;
        try {
          const rows = await sb(`/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=*`);
          if (rows && rows.length > 0) supaUser = rows[0];
        } catch {}
        if (supaUser) {
          users.push({ id: supaUser.id, username: supaUser.username, name: supaUser.name, role: supaUser.role, password: supaUser.password_hash || '', selectedVehicleId: null, disabledTabs: [], createdAt: new Date().toISOString() });
          idx = users.length - 1;
        }
      }
      if (idx === -1) return res.status(404).json({ error: 'User not found' });
      users[idx].disabledTabs = filtered;
      saveLocalUsers(users);
      const u = users[idx];
      // Return with the original ID so frontend stays consistent
      res.json({ user: { id: id, username: u.username, name: u.name, role: u.role, selectedVehicleId: u.selectedVehicleId || null, disabledTabs: u.disabledTabs || [] } });
    } catch (err) {
      console.error('[Auth] Update tabs error:', err.message);
      res.status(500).json({ error: 'Failed to update tab access' });
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
