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

export const useActivityStore = create((set, get) => ({
  activities: [],

  fetchActivities: async () => {
    const data = await api('GET', '/api/activities');
    if (data) set({ activities: data });
  },

  addActivity: ({ vehicleId, vehicleName, type, description, details = {} }) => {
    const activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vehicle_id: vehicleId,
      vehicle_name: vehicleName,
      type,
      description,
      details,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ activities: [activity, ...state.activities].slice(0, 500) }));
    api('POST', '/api/activities', activity);
  },

  getActivitiesByVehicle: (vehicleId) =>
    get().activities.filter((a) => a.vehicle_id === vehicleId || a.vehicleId === vehicleId),

  getActivitiesByDateRange: (vehicleId, startDate, endDate) =>
    get().activities.filter((a) => {
      const vid = a.vehicle_id || a.vehicleId;
      if (vid !== vehicleId) return false;
      const t = new Date(a.timestamp);
      return t >= startDate && t <= endDate;
    }),

  clearActivities: async () => {
    set({ activities: [] });
    await api('DELETE', '/api/activities');
  },
}));
