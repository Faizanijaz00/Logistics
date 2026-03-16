import { create } from 'zustand';
import requestsData from '../data/rideRequests.json';
import { useVehicleStore } from './vehicleStore';
import { useNotificationStore } from './notificationStore';

export const useRequestStore = create((set, get) => ({
  requests: requestsData,
  loading: false,

  // Getters
  getRequestById: (id) => get().requests.find((r) => r.id === id),
  getPendingRequests: () => get().requests.filter((r) => r.status === 'pending'),
  getAcceptedRequests: () => get().requests.filter((r) => r.status === 'accepted'),
  getInProgressRequests: () => get().requests.filter((r) => r.status === 'in_progress'),

  // Actions
  addRequest: (requestData) => {
    const newRequest = {
      ...requestData,
      id: `req-${Date.now()}`,
      status: 'pending',
      assignedVehicle: null,
      assignedDriver: null,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      requests: [...state.requests, newRequest],
    }));

    // Notify about new request
    useNotificationStore.getState().addNotification({
      type: 'request',
      title: 'New Ride Request',
      message: `${requestData.requester} needs a ride for ${requestData.reason}`,
    });

    return newRequest;
  },

  updateRequest: (requestId, updates) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, ...updates } : r
      ),
    })),

  acceptRequest: (requestId, vehicleId, driverName) => {
    const request = get().getRequestById(requestId);
    if (!request) return;

    // Update request
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'accepted',
              assignedVehicle: vehicleId,
              assignedDriver: driverName,
              acceptedAt: new Date().toISOString(),
            }
          : r
      ),
    }));

    // Update vehicle with route
    const vehicleStore = useVehicleStore.getState();
    vehicleStore.assignDriver(vehicleId, driverName, request.destination);
    vehicleStore.setVehicleRoute(vehicleId, {
      start: request.pickupCoords,
      end: request.destinationCoords,
    });

    // Notify
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Request Accepted',
      message: `${driverName} is heading to pick up ${request.requester}`,
    });
  },

  startTrip: (requestId) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'in_progress' } : r
      ),
    }));
  },

  completeRequest: (requestId) => {
    const request = get().getRequestById(requestId);
    if (!request) return;

    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'completed', completedAt: new Date().toISOString() }
          : r
      ),
    }));

    // Clear vehicle assignment
    if (request.assignedVehicle) {
      useVehicleStore.getState().clearDriver(request.assignedVehicle);
    }
  },

  rejectRequest: (requestId) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'rejected' } : r
      ),
    })),
}));
