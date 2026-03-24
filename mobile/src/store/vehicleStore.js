import { create } from 'zustand';
import { SERVER_URL } from '../config/api';
import { useAuthStore } from './authStore';

export const useVehicleStore = create((set) => ({
  vehicles: [],
  loading: false,
  error: null,

  fetchVehicles: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ loading: true, error: null });
    try {
      const resp = await fetch(`${SERVER_URL}/api/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to fetch vehicles');
      const data = await resp.json();
      set({ vehicles: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },
}));
