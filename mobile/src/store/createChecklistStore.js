// Factory for the Maintenance / Inventory checklist stores. Both features share
// the exact same shape — a master checklist, a per-vehicle overview with a
// last-completed date, and a "start → tick → complete" check flow — so they're
// generated from one factory bound to an API base ('/api/maintenance' or
// '/api/inventory'). Talks to the endpoints with Bearer auth.
import { create } from 'zustand';
import { SERVER_URL } from '../config/api';
import { useAuthStore } from './authStore';

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

export function createChecklistStore(apiBase) {
  return create((set, get) => ({
    items: [],                 // master checklist items
    rotationVehicleId: null,   // car the admin marked as in-rotation
    summaries: [],             // [{ vehicle_id, last_completed_at, open_check_id }]
    loading: false,
    error: null,

    // current open check for the car being viewed
    currentCheck: null,        // { check, items }
    checkLoading: false,

    fetchOverview: async () => {
      const token = useAuthStore.getState().token;
      if (!token) return;
      set({ loading: true, error: null });
      try {
        const data = await authedFetch(`${apiBase}/overview`);
        set({
          rotationVehicleId: data?.rotation_vehicle_id ?? null,
          summaries: Array.isArray(data?.summaries) ? data.summaries : [],
          loading: false,
        });
      } catch (err) {
        set({ loading: false, error: err.message });
      }
    },

    fetchItems: async (vehicleId) => {
      const qs = vehicleId ? `?vehicle_id=${encodeURIComponent(vehicleId)}` : '';
      const data = await authedFetch(`${apiBase}/checklist-items${qs}`);
      set({ items: Array.isArray(data) ? data : [] });
      return data;
    },

    addItem: async (payload) => {
      const created = await authedFetch(`${apiBase}/checklist-items`, { method: 'POST', body: JSON.stringify(payload) });
      set((s) => ({ items: [...s.items, created] }));
      return created;
    },

    updateItem: async (id, patch) => {
      const updated = await authedFetch(`${apiBase}/checklist-items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, ...updated } : x)) }));
      return updated;
    },

    deleteItem: async (id) => {
      await authedFetch(`${apiBase}/checklist-items/${id}`, { method: 'DELETE' });
      set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
    },

    importItems: async (labels, vehicleId) => {
      const body = { labels, vehicle_id: vehicleId || null };
      const data = await authedFetch(`${apiBase}/checklist-items/import`, { method: 'POST', body: JSON.stringify(body) });
      // Refresh master list afterwards
      await get().fetchItems(vehicleId);
      return data;
    },

    setRotation: async (vehicleId) => {
      await authedFetch(`${apiBase}/rotation`, { method: 'PUT', body: JSON.stringify({ vehicle_id: vehicleId }) });
      set({ rotationVehicleId: vehicleId });
    },

    startCheck: async (vehicleId) => {
      set({ checkLoading: true });
      try {
        const data = await authedFetch(`${apiBase}/checks`, { method: 'POST', body: JSON.stringify({ vehicle_id: vehicleId }) });
        set({ currentCheck: data, checkLoading: false });
        return data;
      } catch (e) {
        set({ checkLoading: false });
        throw e;
      }
    },

    toggleCheckItem: async (checkItemId, checked) => {
      // optimistic
      set((s) => s.currentCheck ? ({
        currentCheck: {
          ...s.currentCheck,
          items: s.currentCheck.items.map((it) => it.id === checkItemId ? { ...it, checked } : it),
        },
      }) : {});
      try {
        await authedFetch(`${apiBase}/check-items/${checkItemId}`, { method: 'PATCH', body: JSON.stringify({ checked }) });
      } catch (e) {
        // revert on failure
        set((s) => s.currentCheck ? ({
          currentCheck: {
            ...s.currentCheck,
            items: s.currentCheck.items.map((it) => it.id === checkItemId ? { ...it, checked: !checked } : it),
          },
        }) : {});
        throw e;
      }
    },

    completeCheck: async (checkId) => {
      await authedFetch(`${apiBase}/checks/${checkId}/complete`, { method: 'POST' });
      set({ currentCheck: null });
      await get().fetchOverview();
    },

    clearCurrentCheck: () => set({ currentCheck: null }),
  }));
}
