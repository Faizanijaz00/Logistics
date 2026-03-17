import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const now = () => new Date().toISOString();

export const useLogisticsStore = create(
  persist(
    (set, get) => ({
      cars: [],
      people: [],
      rooms: [],
      tables: [],
      routes: [],
      routeStops: [],
      carLegs: [],
      _nextId: 1,

      _genId: () => {
        const id = get()._nextId;
        set({ _nextId: id + 1 });
        return id;
      },

      // ─── Cars ───
      createCar: (data) => {
        const id = get()._genId();
        const car = {
          id, name: data.name, color: data.color, capacity: data.capacity || 5,
          departure_time: data.departure_time || null,
          is_two_seater: (data.capacity || 5) === 2,
          is_finalized: false, origin: data.origin || null, destination: data.destination || null,
          active_leg_index: 0, current_leg_index: 0, custom_duration: null,
          created_at: now(), updated_at: now(),
        };
        set(s => ({ cars: [...s.cars, car] }));
        return car;
      },
      updateCar: (id, updates) => {
        set(s => ({ cars: s.cars.map(c => c.id === id ? { ...c, ...updates, updated_at: now() } : c) }));
        return get().cars.find(c => c.id === id);
      },
      deleteCar: (id) => set(s => ({
        cars: s.cars.filter(c => c.id !== id),
        carLegs: s.carLegs.filter(l => l.car_id !== id),
        people: s.people.map(p => {
          const u = {};
          if (p.outbound_car_id === id) { u.outbound_car_id = null; u.outbound_seat_position = null; u.outbound_car_leg_id = null; }
          if (p.return_car_id === id) { u.return_car_id = null; u.return_seat_position = null; u.return_car_leg_id = null; }
          if (p.car_id === id) { u.car_id = null; u.seat_position = null; u.car_leg_id = null; }
          return Object.keys(u).length ? { ...p, ...u } : p;
        }),
      })),

      // ─── People ───
      createPerson: (data) => {
        const id = get()._genId();
        const person = {
          id, name: data.name, can_drive: data.can_drive || false, is_vip: data.is_vip || false,
          car_id: null, seat_position: null, car_leg_id: null,
          outbound_car_id: null, outbound_seat_position: null, outbound_car_leg_id: null,
          return_car_id: null, return_seat_position: null, return_car_leg_id: null,
          room_id: null, bed_position: null, table_id: null, table_position: null,
          profile_text: null, profile_tags: null, journey_direction: 'outbound',
          created_at: now(), updated_at: now(),
        };
        set(s => ({ people: [...s.people, person] }));
        return person;
      },
      assignPersonToCar: (id, assignment, journeyDirection) => {
        set(s => ({
          people: s.people.map(p => {
            if (p.id !== id) return p;
            if (journeyDirection === 'outbound') {
              return { ...p, outbound_car_id: assignment.car_id, outbound_seat_position: assignment.seat_position, outbound_car_leg_id: assignment.car_leg_id ?? null, updated_at: now() };
            } else if (journeyDirection === 'return') {
              return { ...p, return_car_id: assignment.car_id, return_seat_position: assignment.seat_position, return_car_leg_id: assignment.car_leg_id ?? null, updated_at: now() };
            }
            return { ...p, car_id: assignment.car_id, seat_position: assignment.seat_position, car_leg_id: assignment.car_leg_id ?? null, updated_at: now() };
          }),
        }));
        return get().people.find(p => p.id === id);
      },
      assignPersonToRoom: (id, assignment) => {
        set(s => ({
          people: s.people.map(p =>
            p.id === id ? { ...p, room_id: assignment.room_id, bed_position: assignment.bed_position ?? null, updated_at: now() } : p
          ),
        }));
        return get().people.find(p => p.id === id);
      },
      assignPersonToTable: (id, assignment) => {
        set(s => ({
          people: s.people.map(p =>
            p.id === id ? { ...p, table_id: assignment.table_id, table_position: assignment.table_position ?? null, updated_at: now() } : p
          ),
        }));
        return get().people.find(p => p.id === id);
      },
      deletePerson: (id) => set(s => ({ people: s.people.filter(p => p.id !== id) })),

      // ─── Rooms ───
      createRoom: (data) => {
        const id = get()._genId();
        const room = {
          id, name: data.name, color: data.color, capacity: data.capacity,
          bedspace: data.bedspace || 2, floor: data.floor || 'G',
          is_ensuite: data.is_ensuite || false, is_finalized: false,
          photo_url: data.photo_url || null,
          created_at: now(), updated_at: now(),
        };
        set(s => ({ rooms: [...s.rooms, room] }));
        return room;
      },
      updateRoom: (id, updates) => {
        set(s => ({ rooms: s.rooms.map(r => r.id === id ? { ...r, ...updates, updated_at: now() } : r) }));
        return get().rooms.find(r => r.id === id);
      },
      deleteRoom: (id) => set(s => ({
        rooms: s.rooms.filter(r => r.id !== id),
        people: s.people.map(p => p.room_id === id ? { ...p, room_id: null, bed_position: null } : p),
      })),

      // ─── Tables ───
      createTable: (data) => {
        const id = get()._genId();
        const table = {
          id, name: data.name, color: data.color, capacity: data.capacity,
          table_type: data.table_type || 'rectangular', is_finalized: false,
          created_at: now(), updated_at: now(),
        };
        set(s => ({ tables: [...s.tables, table] }));
        return table;
      },
      updateTable: (id, updates) => {
        set(s => ({ tables: s.tables.map(t => t.id === id ? { ...t, ...updates, updated_at: now() } : t) }));
        return get().tables.find(t => t.id === id);
      },
      deleteTable: (id) => set(s => ({
        tables: s.tables.filter(t => t.id !== id),
        people: s.people.map(p => p.table_id === id ? { ...p, table_id: null, table_position: null } : p),
      })),

      // ─── Routes ───
      createRoute: (data) => {
        const id = get()._genId();
        const route = {
          id, name: data.name, origin: data.origin, destination: data.destination,
          waypoints: data.waypoints || null, assigned_car_id: data.assigned_car_id || null,
          estimated_duration: null, estimated_distance: null, color: data.color,
          is_finalized: false, created_at: now(), updated_at: now(),
        };
        set(s => ({ routes: [...s.routes, route] }));
        return route;
      },
      updateRoute: (id, updates) => {
        set(s => ({ routes: s.routes.map(r => r.id === id ? { ...r, ...updates, updated_at: now() } : r) }));
        return get().routes.find(r => r.id === id);
      },
      deleteRoute: (id) => set(s => ({
        routes: s.routes.filter(r => r.id !== id),
        routeStops: s.routeStops.filter(rs => rs.route_id !== id),
      })),

      // ─── Route Stops ───
      createRouteStop: (data) => {
        const id = get()._genId();
        const stop = {
          id, route_id: data.route_id, location: data.location,
          stop_order: data.stop_order, scheduled_time: data.scheduled_time || null,
          created_at: now(), updated_at: now(),
        };
        set(s => ({ routeStops: [...s.routeStops, stop] }));
        return stop;
      },
      updateRouteStop: (id, updates) => {
        set(s => ({ routeStops: s.routeStops.map(rs => rs.id === id ? { ...rs, ...updates, updated_at: now() } : rs) }));
        return get().routeStops.find(rs => rs.id === id);
      },
      deleteRouteStop: (id) => set(s => ({ routeStops: s.routeStops.filter(rs => rs.id !== id) })),
      getStopsForRoute: (routeId) => get().routeStops.filter(s => s.route_id === routeId).sort((a, b) => a.stop_order - b.stop_order),

      // ─── Car Legs ───
      createCarLeg: (data) => {
        const id = get()._genId();
        const leg = {
          id, car_id: data.car_id, name: data.name, leg_order: data.leg_order,
          route_id: data.route_id || null, location: data.location || null,
          created_at: now(), updated_at: now(),
        };
        set(s => ({ carLegs: [...s.carLegs, leg] }));
        return leg;
      },
      updateCarLeg: (id, updates) => {
        set(s => ({ carLegs: s.carLegs.map(l => l.id === id ? { ...l, ...updates, updated_at: now() } : l) }));
        return get().carLegs.find(l => l.id === id);
      },
      deleteCarLeg: (id) => {
        const leg = get().carLegs.find(l => l.id === id);
        set(s => ({
          carLegs: s.carLegs.filter(l => l.id !== id),
          people: s.people.map(p => {
            const u = {};
            if (p.outbound_car_leg_id === id) u.outbound_car_leg_id = null;
            if (p.return_car_leg_id === id) u.return_car_leg_id = null;
            if (p.car_leg_id === id) u.car_leg_id = null;
            return Object.keys(u).length ? { ...p, ...u } : p;
          }),
        }));
        return leg;
      },
      getLegsForCar: (carId) => get().carLegs.filter(l => l.car_id === carId).sort((a, b) => a.leg_order - b.leg_order),
    }),
    { name: 'fleet-hub-logistics' }
  )
);
