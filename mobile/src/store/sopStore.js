import { create } from 'zustand';
import { SERVER_URL } from '../config/api';
import { useAuthStore } from './authStore';

// SOPs store — CRUD over the /api/sops endpoints with Bearer auth.
async function authedFetch(path, options = {}) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

export const useSopStore = create((set) => ({
  sops: [],
  loading: false,
  error: null,

  fetchSops: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ loading: true, error: null });
    try {
      const data = await authedFetch('/api/sops');
      set({ sops: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  addSop: async (sop) => {
    const created = await authedFetch('/api/sops', { method: 'POST', body: JSON.stringify(sop) });
    set((s) => ({ sops: [created, ...s.sops] }));
    return created;
  },

  updateSop: async (id, patch) => {
    const updated = await authedFetch(`/api/sops/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    set((s) => ({ sops: s.sops.map((x) => (x.id === id ? { ...x, ...updated } : x)) }));
    return updated;
  },

  deleteSop: async (id) => {
    await authedFetch(`/api/sops/${id}`, { method: 'DELETE' });
    set((s) => ({ sops: s.sops.filter((x) => x.id !== id) }));
  },
}));
