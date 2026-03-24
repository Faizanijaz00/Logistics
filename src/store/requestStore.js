import { create } from 'zustand';
import { useVehicleStore } from './vehicleStore';
import { useNotificationStore } from './notificationStore';

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

export const useRequestStore = create((set, get) => ({
  requests: [],
  loading: false,

  fetchRequests: async () => {
    set({ loading: true });
    const data = await api('GET', '/api/ride-requests');
    if (data) set({ requests: data, loading: false });
    else set({ loading: false });
  },

  getRequestById: (id) => get().requests.find((r) => r.id === id),
  getPendingRequests: () => get().requests.filter((r) => r.status === 'pending'),
  getAcceptedRequests: () => get().requests.filter((r) => r.status === 'accepted'),
  getInProgressRequests: () => get().requests.filter((r) => r.status === 'in_progress'),

  addRequest: (requestData) => {
    const newRequest = {
      ...requestData,
      id: `req-${Date.now()}`,
      status: 'pending',
      assigned_vehicle: null,
      assigned_driver: null,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ requests: [...state.requests, newRequest] }));
    useNotificationStore.getState().addNotification({
      type: 'request',
      title: 'New Ride Request',
      message: `${requestData.requester} needs a ride for ${requestData.reason}`,
    });
    api('POST', '/api/ride-requests', newRequest);
    return newRequest;
  },

  updateRequest: (requestId, updates) => {
    set((state) => ({
      requests: state.requests.map((r) => r.id === requestId ? { ...r, ...updates } : r),
    }));
    api('PATCH', `/api/ride-requests/${requestId}`, updates);
  },

  acceptRequest: (requestId, vehicleId, driverName) => {
    const request = get().getRequestById(requestId);
    if (!request) return;
    const updates = {
      status: 'accepted',
      assigned_vehicle: vehicleId,
      assigned_driver: driverName,
      accepted_at: new Date().toISOString(),
    };
    set((state) => ({
      requests: state.requests.map((r) => r.id === requestId ? { ...r, ...updates } : r),
    }));
    const vehicleStore = useVehicleStore.getState();
    vehicleStore.assignDriver(vehicleId, driverName, request.destination);
    vehicleStore.setVehicleRoute(vehicleId, {
      start: request.pickup_coords || request.pickupCoords,
      end: request.destination_coords || request.destinationCoords,
    });
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Request Accepted',
      message: `${driverName} is heading to pick up ${request.requester}`,
    });
    api('PATCH', `/api/ride-requests/${requestId}`, updates);
  },

  startTrip: (requestId) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'in_progress' } : r
      ),
    }));
    api('PATCH', `/api/ride-requests/${requestId}`, { status: 'in_progress' });
  },

  completeRequest: (requestId) => {
    const request = get().getRequestById(requestId);
    if (!request) return;
    const updates = { status: 'completed', completed_at: new Date().toISOString() };
    set((state) => ({
      requests: state.requests.map((r) => r.id === requestId ? { ...r, ...updates } : r),
    }));
    if (request.assigned_vehicle || request.assignedVehicle) {
      useVehicleStore.getState().clearDriver(request.assigned_vehicle || request.assignedVehicle);
    }
    api('PATCH', `/api/ride-requests/${requestId}`, updates);
  },

  rejectRequest: (requestId) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'rejected' } : r
      ),
    }));
    api('PATCH', `/api/ride-requests/${requestId}`, { status: 'rejected' });
  },
}));
