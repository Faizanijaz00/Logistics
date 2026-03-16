import { create } from 'zustand';
import parkingZonesData from '../data/parkingZones.json';

export const useParkingStore = create((set, get) => ({
  zones: parkingZonesData,
  loading: false,
  selectedZone: null,

  // Getters
  getZoneById: (id) => get().zones.find((z) => z.id === id),
  getZonesByStatus: (status) => get().zones.filter((z) => z.status === status),
  getFreeZones: () => get().zones.filter((z) => z.status === 'free'),
  getAvailableSpots: () =>
    get().zones.reduce((acc, z) => acc + (z.capacity - z.occupied), 0),

  // Zone color mapping
  getZoneColor: (status) => {
    const colors = {
      free: '#22c55e',      // Green
      risky: '#eab308',      // Yellow
      'high-risk': '#f97316', // Orange
      private: '#ef4444',    // Red
    };
    return colors[status] || '#6b7280';
  },

  // Actions
  selectZone: (zoneId) =>
    set({ selectedZone: zoneId }),

  clearSelection: () =>
    set({ selectedZone: null }),

  updateZoneOccupancy: (zoneId, occupied) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === zoneId ? { ...z, occupied: Math.min(occupied, z.capacity) } : z
      ),
    })),

  // Add a new parking zone
  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, { ...zone, id: `zone-${Date.now()}` }],
    })),

  // Remove a parking zone
  removeZone: (zoneId) =>
    set((state) => ({
      zones: state.zones.filter((z) => z.id !== zoneId),
      selectedZone: state.selectedZone === zoneId ? null : state.selectedZone,
    })),

  // Update a parking zone
  updateZone: (zoneId, updates) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === zoneId ? { ...z, ...updates } : z
      ),
    })),

  // Simulate real-time updates
  simulateOccupancyChange: () => {
    set((state) => ({
      zones: state.zones.map((z) => ({
        ...z,
        occupied: Math.max(
          0,
          Math.min(
            z.capacity,
            z.occupied + Math.floor(Math.random() * 3) - 1
          )
        ),
      })),
    }));
  },
}));
