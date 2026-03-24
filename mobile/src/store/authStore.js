import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      login: async (username, password) => {
        set({ loading: true, error: null });
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Login failed');
          }
          const data = await resp.json();
          set({ token: data.token, user: data.user, loading: false });
          return data;
        } catch (err) {
          set({ loading: false, error: err.message });
          throw err;
        }
      },

      logout: () => set({ token: null, user: null }),

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Only clear session on explicit "token rejected" response
          if (resp.status === 401) {
            set({ token: null, user: null });
            return;
          }
          if (!resp.ok) return; // Server error or network timeout — keep existing session
          const data = await resp.json();
          set({ user: data.user ?? data });
        } catch {
          // No network / server offline — keep the stored token so user stays logged in
          return;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
