import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import vehiclesData from '../data/vehicles.json';
import { useActivityStore } from './activityStore';

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

export const useVehicleStore = create(
  persist(
    (set, get) => ({
      vehicles: vehiclesData,
      loading: false,

  // Getters
  getVehicleById: (id) => get().vehicles.find((v) => v.id === id),
  getActiveVehicles: () => get().vehicles.filter((v) => v.status === 'active'),
  getParkedVehicles: () => get().vehicles.filter((v) => v.status === 'parked'),
  getVehiclesByStatus: (status) => get().vehicles.filter((v) => v.status === status),

  // Actions
  updateVehicle: (vehicleId, updates) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    if (v && updates.destination && updates.destination !== v.destination) {
      logActivity(vehicleId, vehicles, 'destination_set', `Destination set to ${updates.destination}`, { destination: updates.destination });
    }
    set((state) => ({
      vehicles: state.vehicles.map((x) =>
        x.id === vehicleId ? { ...x, ...updates } : x
      ),
    }));
  },

  updateVehiclePosition: (vehicleId, { lat, lng, heading, speed, lastGpsUpdate }) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              position: { lat, lng },
              heading: heading ?? v.heading,
              speed: speed ?? v.speed,
              lastGpsUpdate: lastGpsUpdate ?? v.lastGpsUpdate,
            }
          : v
      ),
    })),

  setVehicleStatus: (vehicleId, status) => {
    logActivity(vehicleId, get().vehicles, 'status_changed', `Status changed to ${status}`, { status });
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, status } : v
      ),
    }));
  },

  setVehicleRoute: (vehicleId, route) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    if (route) {
      logActivity(vehicleId, vehicles, 'route_set', `Route set for ${v?.destination || 'destination'}`, { destination: v?.destination });
    } else {
      logActivity(vehicleId, vehicles, 'route_cleared', 'Route cleared', {});
    }
    set((state) => ({
      vehicles: state.vehicles.map((x) =>
        x.id === vehicleId ? { ...x, route, status: route ? 'active' : 'parked' } : x
      ),
    }));
  },

  assignDriver: (vehicleId, driverName, destination) => {
    logActivity(vehicleId, get().vehicles, 'driver_assigned', `${driverName} started driving`, { driverName, destination });
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? { ...v, currentDriver: driverName, lastDriver: null, destination, status: 'active', parkedAt: null }
          : v
      ),
    }));
  },

  clearDriver: (vehicleId, parkedAt = null) => {
    const vehicles = get().vehicles;
    const v = vehicles.find((x) => x.id === vehicleId);
    const driverName = v?.currentDriver || v?.lastDriver || 'Unknown';
    logActivity(vehicleId, vehicles, 'driver_cleared', `${driverName} stopped driving${parkedAt ? `, parked at ${parkedAt}` : ''}`, { driverName, parkedAt });
    set((state) => ({
      vehicles: state.vehicles.map((x) =>
        x.id === vehicleId
          ? { ...x, lastDriver: x.currentDriver || x.lastDriver || null, currentDriver: null, destination: null, route: null, status: 'parked', parkedAt: parkedAt || null }
          : x
      ),
    }));
  },

  // Admin: assign responsible driver without changing parked status
  setResponsibleDriver: (vehicleId, driverName) => {
    logActivity(vehicleId, get().vehicles, 'driver_assigned', `${driverName} assigned as responsible driver`, { driverName });
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? { ...v, currentDriver: driverName, lastDriver: null }
          : v
      ),
    }));
  },

  // Admin: park vehicle at a location without removing the driver
  parkVehicle: (vehicleId, parkedAt) => {
    const vehicles = get().vehicles;
    logActivity(vehicleId, vehicles, 'driver_cleared', `Parked at ${parkedAt}`, { parkedAt });
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? { ...v, parkedAt: parkedAt || null, status: 'parked', route: null, destination: null }
          : v
      ),
    }));
  },

  addFuelRecord: (vehicleId, amount, driverName) => {
    const vehicles = get().vehicles;
    const record = {
      id: `fuel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      amount: Number(amount),
      driverName,
      date: new Date().toISOString(),
    };
    logActivity(vehicleId, vehicles, 'fuel_added',
      `${driverName} fueled up — £${Number(amount).toFixed(2)}`,
      { amount: Number(amount), driverName });
    set((state) => ({
      vehicles: state.vehicles.map((v) => {
        if (v.id !== vehicleId) return v;
        const existing = v.fuel || { records: [], totalCost: 0 };
        return { ...v, fuel: {
          ...existing,
          records: [record, ...existing.records],
          totalCost: existing.totalCost + record.amount,
        }};
      }),
    }));
  },

  // Report a problem on a vehicle
  reportProblem: (vehicleId, text, reportedBy) => {
    const vehicles = get().vehicles;
    const problem = {
      id: `prob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      reportedBy,
      date: new Date().toISOString(),
    };
    logActivity(vehicleId, vehicles, 'problem_reported', `Problem reported: ${text}`, { text, reportedBy });
    set((state) => ({
      vehicles: state.vehicles.map((v) => {
        if (v.id !== vehicleId) return v;
        return { ...v, problems: [problem, ...(v.problems || [])] };
      }),
    }));
  },

  // Clear a problem
  clearProblem: (vehicleId, problemId) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) => {
        if (v.id !== vehicleId) return v;
        return { ...v, problems: (v.problems || []).filter(p => p.id !== problemId) };
      }),
    }));
  },

  // Add a new vehicle
  addVehicle: (vehicle) =>
    set((state) => ({
      vehicles: [...state.vehicles, { ...vehicle, id: `v${Date.now()}` }],
    })),

  // Remove a vehicle
  removeVehicle: (vehicleId) =>
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== vehicleId),
    })),

  // Reset to default vehicles from JSON
  resetToDefaults: () => set({ vehicles: vehiclesData }),
    }),
    {
      name: 'vehicle-storage',
      version: 4,
      migrate: (persisted) => {
        const existing = persisted?.vehicles || [];
        const defaultIds = new Set(vehiclesData.map((v) => v.id));
        // Merge defaults with saved data, preserving all custom fields
        const mergedDefaults = vehiclesData.map((def) => {
          const saved = existing.find((v) => v.id === def.id);
          return saved ? { ...def, ...saved } : def;
        });
        // Keep any custom-added vehicles that aren't in the defaults
        const customVehicles = existing.filter((v) => !defaultIds.has(v.id));
        return { vehicles: [...mergedDefaults, ...customVehicles] };
      },
    }
  )
);
