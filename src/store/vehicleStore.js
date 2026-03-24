import { create } from 'zustand';
import { useActivityStore } from './activityStore';

const API = 'http://localhost:3001';

function getToken() {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token || null;
  } catch { return null; }
}

async function apiPatch(id, updates) {
  const token = getToken();
  if (!token) return;
  await fetch(`${API}/api/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates),
  }).catch(() => {});
}

async function apiPost(vehicle) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API}/api/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(vehicle),
  });
  return res.ok ? res.json() : null;
}

async function apiDelete(id) {
  const token = getToken();
  if (!token) return;
  await fetch(`${API}/api/vehicles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

const logActivity = (vehicleId, vehicles, type, description, details = {}) => {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (!v) return;
  useActivityStore.getState().addActivity({
    vehicleId,
    vehicleName: `${v.make} ${v.model}`,
    type,
    description,
    details,
  });
};

export const useVehicleStore = create((set, get) => ({
  vehicles: [],
  loading: false,

  // Fetch all vehicles from backend (source of truth)
  fetchVehicles: async () => {
    const token = getToken();
    if (!token) return;
    set({ loading: true });
    try {
      const res = await fetch(`${API}/api/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ vehicles: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  // Getters
  getVehicleById: (id) => get().vehicles.find((v) => v.id === id),
  getActiveVehicles: () => get().vehicles.filter((v) => v.status === 'active'),
  getParkedVehicles: () => get().vehicles.filter((v) => v.status === 'parked'),
  getVehiclesByStatus: (status) => get().vehicles.filter((v) => v.status === status),

  // Update any vehicle fields — optimistic + persist
  updateVehicle: (vehicleId, updates) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    if (v && updates.destination && updates.destination !== v.destination) {
      logActivity(vehicleId, vehicles, 'destination_set', `Destination set to ${updates.destination}`, { destination: updates.destination });
    }
    set((state) => ({
      vehicles: state.vehicles.map((x) => x.id === vehicleId ? { ...x, ...updates } : x),
    }));
    apiPatch(vehicleId, updates);
  },

  updateVehiclePosition: (vehicleId, { lat, lng, heading, speed, lastGpsUpdate }) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? { ...v, position: { lat, lng }, heading: heading ?? v.heading, speed: speed ?? v.speed, lastGpsUpdate: lastGpsUpdate ?? v.lastGpsUpdate }
          : v
      ),
    }));
    apiPatch(vehicleId, { position: { lat, lng }, heading, speed, lastGpsUpdate });
  },

  setVehicleStatus: (vehicleId, status) => {
    logActivity(vehicleId, get().vehicles, 'status_changed', `Status changed to ${status}`, { status });
    set((state) => ({
      vehicles: state.vehicles.map((v) => v.id === vehicleId ? { ...v, status } : v),
    }));
    apiPatch(vehicleId, { status });
  },

  setVehicleRoute: (vehicleId, route) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    if (route) logActivity(vehicleId, vehicles, 'route_set', `Route set for ${v?.destination || 'destination'}`, { destination: v?.destination });
    else logActivity(vehicleId, vehicles, 'route_cleared', 'Route cleared', {});
    const status = route ? 'active' : 'parked';
    set((state) => ({
      vehicles: state.vehicles.map((x) => x.id === vehicleId ? { ...x, route, status } : x),
    }));
    apiPatch(vehicleId, { route, status });
  },

  assignDriver: (vehicleId, driverName, destination) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    logActivity(vehicleId, vehicles, 'driver_assigned', `${driverName} started driving`, { driverName, destination, origin: v?.parkedAt || null });
    const updates = { currentDriver: driverName, lastDriver: null, destination, status: 'active', parkedAt: null };
    set((state) => ({
      vehicles: state.vehicles.map((v) => v.id === vehicleId ? { ...v, ...updates } : v),
    }));
    apiPatch(vehicleId, updates);
  },

  clearDriver: (vehicleId, parkedAt = null) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    const driverName = v?.currentDriver || v?.lastDriver || 'Unknown';
    logActivity(vehicleId, vehicles, 'driver_cleared', `${driverName} stopped driving${parkedAt ? `, parked at ${parkedAt}` : ''}`, { driverName, parkedAt });
    const updates = { lastDriver: v?.currentDriver || v?.lastDriver || null, currentDriver: null, destination: null, route: null, status: 'parked', parkedAt: parkedAt || null };
    set((state) => ({
      vehicles: state.vehicles.map((x) => x.id === vehicleId ? { ...x, ...updates } : x),
    }));
    apiPatch(vehicleId, updates);
  },

  setResponsibleDriver: (vehicleId, driverName) => {
    logActivity(vehicleId, get().vehicles, 'driver_assigned', `${driverName} assigned as responsible driver`, { driverName });
    set((state) => ({
      vehicles: state.vehicles.map((v) => v.id === vehicleId ? { ...v, currentDriver: driverName, lastDriver: null } : v),
    }));
    apiPatch(vehicleId, { currentDriver: driverName, lastDriver: null });
  },

  parkVehicle: (vehicleId, parkedAt) => {
    logActivity(vehicleId, get().vehicles, 'driver_cleared', `Parked at ${parkedAt}`, { parkedAt });
    const updates = { parkedAt: parkedAt || null, status: 'parked', route: null, destination: null };
    set((state) => ({
      vehicles: state.vehicles.map((v) => v.id === vehicleId ? { ...v, ...updates } : v),
    }));
    apiPatch(vehicleId, updates);
  },

  addFuelRecord: (vehicleId, amount, driverName) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    const record = { id: `fuel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, amount: Number(amount), driverName, date: new Date().toISOString() };
    logActivity(vehicleId, vehicles, 'fuel_added', `${driverName} fueled up — £${Number(amount).toFixed(2)}`, { amount: Number(amount), driverName });
    set((state) => ({
      vehicles: state.vehicles.map((v) => {
        if (v.id !== vehicleId) return v;
        const existing = v.fuel || { records: [], totalCost: 0 };
        const fuel = { ...existing, records: [record, ...existing.records], totalCost: existing.totalCost + record.amount };
        return { ...v, fuel };
      }),
    }));
    const updated = get().vehicles.find((v) => v.id === vehicleId);
    if (updated) apiPatch(vehicleId, { fuel: updated.fuel });
  },

  reportProblem: (vehicleId, text, reportedBy) => {
    const vehicles = get().vehicles;
    const problem = { id: `prob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, reportedBy, date: new Date().toISOString() };
    logActivity(vehicleId, vehicles, 'problem_reported', `Problem reported: ${text}`, { text, reportedBy });
    set((state) => ({
      vehicles: state.vehicles.map((v) => v.id !== vehicleId ? v : { ...v, problems: [problem, ...(v.problems || [])] }),
    }));
    const updated = get().vehicles.find((v) => v.id === vehicleId);
    if (updated) apiPatch(vehicleId, { problems: updated.problems });
  },

  addTicket: (vehicleId, ticket, reportedBy) => {
    const vehicles = get().vehicles;
    const ticketRecord = { id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...ticket, reportedBy, date: new Date().toISOString() };
    const label = ticket.type === 'parking' ? `Parking ticket (PCN: ${ticket.pcnNumber})` : `Road ticket on ${ticket.road} (${ticket.ticketType})`;
    logActivity(vehicleId, vehicles, 'ticket_reported', `${reportedBy} reported: ${label}`, { ...ticket, reportedBy });
    set((state) => ({
      vehicles: state.vehicles.map((v) => v.id !== vehicleId ? v : { ...v, tickets: [ticketRecord, ...(v.tickets || [])] }),
    }));
    const updated = get().vehicles.find((v) => v.id === vehicleId);
    if (updated) apiPatch(vehicleId, { tickets: updated.tickets });
  },

  clearProblem: (vehicleId, problemId) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) => v.id !== vehicleId ? v : { ...v, problems: (v.problems || []).filter((p) => p.id !== problemId) }),
    }));
    const updated = get().vehicles.find((v) => v.id === vehicleId);
    if (updated) apiPatch(vehicleId, { problems: updated.problems });
  },

  addVehicle: async (vehicle) => {
    const id = `v${Date.now()}`;
    const full = { ...vehicle, id };
    const saved = await apiPost(full);
    set((state) => ({ vehicles: [...state.vehicles, saved || full] }));
    return saved || full;
  },

  removeVehicle: (vehicleId) => {
    set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== vehicleId) }));
    apiDelete(vehicleId);
  },
}));
