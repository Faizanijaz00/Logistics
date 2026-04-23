import { create } from 'zustand';
import { SERVER_URL } from '../config/api';

function getToken() {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token || null;
  } catch { return null; }
}

async function api(method, path, body) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  return res?.ok ? res.json().catch(() => null) : null;
}

export const useSavedLocationStore = create((set, get) => ({
  locations: [],

  fetchLocations: async () => {
    const data = await api('GET', '/api/saved-locations');
    if (data) set({ locations: data });
  },

  addLocation: (name, address, lat, lng) => {
    const loc = { id: `loc-${Date.now()}`, name, address, position: { lat, lng } };
    set((state) => ({ locations: [...state.locations, loc] }));
    api('POST', '/api/saved-locations', loc);
  },

  removeLocation: (id) => {
    set((state) => ({ locations: state.locations.filter((l) => l.id !== id) }));
    api('DELETE', `/api/saved-locations/${id}`);
  },

  updateLocation: (id, updates) => {
    set((state) => ({
      locations: state.locations.map((l) => l.id === id ? { ...l, ...updates } : l),
    }));
    api('PATCH', `/api/saved-locations/${id}`, updates);
  },
}));
