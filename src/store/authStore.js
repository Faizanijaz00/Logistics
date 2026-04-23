import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SERVER_URL } from '../config/api';
const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      carSelectReady: false,
      cachedUsers: [],
      adminUser: null, // stores original admin when impersonating another user

      login: async (username, password) => {
        set({ loading: true, error: null });
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(`${SERVER_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            set({ loading: false, error: err.error || 'Login failed' });
            return false;
          }
          const { token, user } = await resp.json();
          set({ token, user, loading: false, error: null, carSelectReady: false });
          return true;
        } catch {
          set({ loading: false, error: 'Cannot connect to server' });
          return false;
        }
      },

      logout: () => {
        set({ token: null, user: null, error: null, carSelectReady: false });
      },

      setCarSelectReady: (ready = true) => {
        set({ carSelectReady: ready });
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!resp.ok) {
            set({ token: null, user: null });
            return;
          }
          const { user } = await resp.json();
          set({ user, adminUser: null }); // clear impersonation on fresh load
        } catch {
          // Server unreachable — keep existing state
        }
      },

      selectVehicle: async (vehicleId) => {
        const { token } = get();
        if (!token) return false;
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ vehicleId }),
          });
          if (!resp.ok) return false;
          const { user } = await resp.json();
          set({ user });
          return true;
        } catch {
          return false;
        }
      },

      switchToUser: (selectedUser) => {
        const { user: current, adminUser: existingAdmin } = get();
        set({
          adminUser: existingAdmin || current,
          user: { ...selectedUser, selectedVehicleId: current?.selectedVehicleId || '__skip__' },
          carSelectReady: true,
        });
      },

      switchBackToAdmin: () => {
        const { adminUser } = get();
        if (adminUser) {
          set({ user: adminUser, adminUser: null });
        }
      },

      fetchUsers: async () => {
        const { token, cachedUsers } = get();
        // Try backend first
        if (token) {
          try {
            const resp = await fetch(`${SERVER_URL}/api/auth/users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.ok) {
              const users = await resp.json();
              if (Array.isArray(users) && users.length > 0) {
                set({ cachedUsers: users });
                return users;
              }
            }
          } catch {}
        }
        // Fallback: fetch directly from Supabase
        try {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,username,name,role`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          });
          if (resp.ok) {
            const users = await resp.json();
            if (Array.isArray(users) && users.length > 0) {
              set({ cachedUsers: users });
              return users;
            }
          }
        } catch {}
        return cachedUsers;
      },

      registerUser: async (username, password, name, role) => {
        const { token } = get();
        if (!token) return { error: 'Not authenticated' };
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username, password, name, role }),
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            return { error: err.error || 'Failed to create user' };
          }
          const data = await resp.json();
          return { user: data.user };
        } catch {
          return { error: 'Cannot connect to server' };
        }
      },

      updateUserTabs: async (userId, disabledTabs) => {
        const { token } = get();
        if (!token) return { error: 'Not authenticated' };
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/users/${userId}/tabs`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ disabledTabs }),
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            return { error: err.error || 'Failed to update tabs' };
          }
          const data = await resp.json();
          return { user: data.user };
        } catch {
          return { error: 'Cannot connect to server' };
        }
      },

      deleteUser: async (userId) => {
        const { token } = get();
        if (!token) return { error: 'Not authenticated' };
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            return { error: err.error || 'Failed to delete user' };
          }
          return { success: true };
        } catch {
          return { error: 'Cannot connect to server' };
        }
      },

      getAuthHeader: () => {
        const { token } = get();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, carSelectReady: state.carSelectReady, cachedUsers: state.cachedUsers, adminUser: state.adminUser }),
    }
  )
);
