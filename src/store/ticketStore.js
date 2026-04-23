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

const now = () => new Date().toISOString();

export const useTicketStore = create((set, get) => ({
  tickets: [],

  fetchTickets: async () => {
    const data = await api('GET', '/api/tickets');
    if (data) set({ tickets: data });
  },

  createTicket: async (data) => {
    const ticket = {
      id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pcn: data.pcn || '',
      issuer: data.issuer || '',
      date: data.date || '',
      type: data.type || '',
      status: data.status || 'Issued',
      outstanding: data.outstanding || 0,
      action_taken: data.action_taken || false,
      plan_for_contesting: data.plan_for_contesting || '',
      picture_url: data.picture_url || '',
      driver_id: data.driver_id || null,
      vehicle_id: data.vehicle_id || null,
      notes: data.notes || '',
      created_at: now(),
      updated_at: now(),
    };
    set((s) => ({ tickets: [...s.tickets, ticket] }));
    api('POST', '/api/tickets', ticket);
    return ticket;
  },

  updateTicket: (id, updates) => {
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: now() } : t
      ),
    }));
    api('PATCH', `/api/tickets/${id}`, { ...updates, updated_at: now() });
    return get().tickets.find((t) => t.id === id);
  },

  deleteTicket: (id) => {
    set((s) => ({ tickets: s.tickets.filter((t) => t.id !== id) }));
    api('DELETE', `/api/tickets/${id}`);
  },
}));
