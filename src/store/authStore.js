import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SERVER_URL = 'http://localhost:3001';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      carSelectReady: false,

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
          set({ user });
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

      fetchUsers: async () => {
        const { token } = get();
        if (!token) return [];
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!resp.ok) return [];
          return await resp.json();
        } catch {
          return [];
        }
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
      partialize: (state) => ({ token: state.token, user: state.user, carSelectReady: state.carSelectReady }),
    }
  )
);
