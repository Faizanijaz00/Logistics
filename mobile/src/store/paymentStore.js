import { create } from 'zustand';
import { SERVER_URL } from '../config/api';
import { useAuthStore } from './authStore';

// Payments store — mirrors vehicleStore but adds the create/delete helpers the
// Payments screen needs. Talks to the /api/payments endpoints with Bearer auth.
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

export const usePaymentStore = create((set) => ({
  payments: [],
  loading: false,
  error: null,

  fetchPayments: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ loading: true, error: null });
    try {
      const data = await authedFetch('/api/payments');
      set({ payments: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  addPayment: async (payment) => {
    const created = await authedFetch('/api/payments', { method: 'POST', body: JSON.stringify(payment) });
    set((s) => ({ payments: [created, ...s.payments] }));
    return created;
  },

  deletePayment: async (id) => {
    await authedFetch(`/api/payments/${id}`, { method: 'DELETE' });
    set((s) => ({ payments: s.payments.filter((p) => p.id !== id) }));
  },
}));
