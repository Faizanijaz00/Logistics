import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const now = () => new Date().toISOString();

export const useTicketStore = create(
  persist(
    (set, get) => ({
      tickets: [],
      _nextId: 1,

      _genId: () => {
        const id = get()._nextId;
        set({ _nextId: id + 1 });
        return id;
      },

      createTicket: (data) => {
        const id = get()._genId();
        const ticket = {
          id,
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
        set(s => ({ tickets: [...s.tickets, ticket] }));
        return ticket;
      },

      updateTicket: (id, updates) => {
        set(s => ({
          tickets: s.tickets.map(t =>
            t.id === id ? { ...t, ...updates, updated_at: now() } : t
          ),
        }));
        return get().tickets.find(t => t.id === id);
      },

      deleteTicket: (id) => set(s => ({
        tickets: s.tickets.filter(t => t.id !== id),
      })),
    }),
    { name: 'fleet-hub-tickets' }
  )
);
