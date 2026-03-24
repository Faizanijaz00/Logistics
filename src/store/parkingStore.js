import { create } from 'zustand';

const API = 'http://localhost:3001';

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
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  return res?.ok ? res.json().catch(() => null) : null;
}

export const useParkingStore = create((set, get) => ({
  zones: [],
  loading: false,
  selectedZone: null,

  fetchZones: async () => {
    set({ loading: true });
    const data = await api('GET', '/api/parking-zones');
    if (data) set({ zones: data, loading: false });
    else set({ loading: false });
  },

  getZoneById: (id) => get().zones.find((z) => z.id === id),
  getZonesByStatus: (status) => get().zones.filter((z) => z.status === status),
  getFreeZones: () => get().zones.filter((z) => z.status === 'free'),
  getAvailableSpots: () =>
    get().zones.reduce((acc, z) => acc + (z.capacity - z.occupied), 0),

  getZoneColor: (status) => {
    const colors = { free: '#22c55e', risky: '#eab308', 'high-risk': '#f97316', private: '#ef4444' };
    return colors[status] || '#6b7280';
  },

  selectZone: (zoneId) => set({ selectedZone: zoneId }),
  clearSelection: () => set({ selectedZone: null }),

  updateZoneOccupancy: (zoneId, occupied) => {
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === zoneId ? { ...z, occupied: Math.min(occupied, z.capacity) } : z
      ),
    }));
    api('PATCH', `/api/parking-zones/${zoneId}`, { occupied });
  },

  addZone: (zone) => {
    const newZone = { ...zone, id: `zone-${Date.now()}` };
    set((state) => ({ zones: [...state.zones, newZone] }));
    api('POST', '/api/parking-zones', newZone);
  },

  removeZone: (zoneId) => {
    set((state) => ({
      zones: state.zones.filter((z) => z.id !== zoneId),
      selectedZone: state.selectedZone === zoneId ? null : state.selectedZone,
    }));
    api('DELETE', `/api/parking-zones/${zoneId}`);
  },

  updateZone: (zoneId, updates) => {
    set((state) => ({
      zones: state.zones.map((z) => z.id === zoneId ? { ...z, ...updates } : z),
    }));
    api('PATCH', `/api/parking-zones/${zoneId}`, updates);
  },
}));
