import { create } from 'zustand';
import { useVehicleStore } from './vehicleStore';
import { useNotificationStore } from './notificationStore';

export const useEmergencyStore = create((set, get) => ({
  activeEmergency: null,
  emergencyHistory: [],
  isEmergencyMode: false,

  // Trigger emergency - broadcasts to all community members
  triggerEmergency: (vehicleId, type = 'police_stop', message = '') => {
    const vehicleStore = useVehicleStore.getState();
    const vehicle = vehicleStore.getVehicleById(vehicleId);

    if (!vehicle) {
      console.error('Vehicle not found for emergency');
      return null;
    }

    const emergency = {
      id: `emerg-${Date.now()}`,
      type,
      vehicleId,
      driverId: vehicle.currentDriver || 'Unknown',
      location: vehicle.position,
      timestamp: new Date().toISOString(),
      message: message || `Emergency triggered for ${vehicle.make} ${vehicle.model}`,
      isActive: true,
      acknowledgedBy: [],
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        insurance: vehicle.insurance,
      },
    };

    // Set vehicle to emergency status
    vehicleStore.setVehicleStatus(vehicleId, 'emergency');

    set({
      activeEmergency: emergency,
      isEmergencyMode: true,
    });

    // Broadcast to all community members
    useNotificationStore.getState().addNotification({
      type: 'emergency',
      title: '🚨 EMERGENCY ALERT',
      message: `${vehicle.currentDriver || 'Driver'} needs help! Vehicle: ${vehicle.licensePlate}`,
      relatedId: emergency.id,
    });

    return emergency;
  },

  // Acknowledge emergency (community member saw it)
  acknowledgeEmergency: (emergencyId, userId) => {
    set((state) => {
      if (state.activeEmergency?.id === emergencyId) {
        return {
          activeEmergency: {
            ...state.activeEmergency,
            acknowledgedBy: [...state.activeEmergency.acknowledgedBy, userId],
          },
        };
      }
      return state;
    });
  },

  // Resolve emergency
  resolveEmergency: (emergencyId) => {
    const { activeEmergency } = get();

    if (activeEmergency?.id === emergencyId) {
      // Reset vehicle status
      useVehicleStore.getState().setVehicleStatus(activeEmergency.vehicleId, 'parked');

      set((state) => ({
        activeEmergency: null,
        isEmergencyMode: false,
        emergencyHistory: [
          { ...state.activeEmergency, isActive: false, resolvedAt: new Date().toISOString() },
          ...state.emergencyHistory,
        ],
      }));

      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'Emergency Resolved',
        message: 'The emergency situation has been resolved. All clear.',
      });
    }
  },

  // Get share link for insurance documents
  getEmergencyShareLink: () => {
    const { activeEmergency } = get();
    if (!activeEmergency) return null;

    // In a real app, this would generate a secure temporary link
    const shareData = {
      vehiclePlate: activeEmergency.vehicle.licensePlate,
      insurance: activeEmergency.vehicle.insurance,
      timestamp: activeEmergency.timestamp,
    };

    // Encode for URL sharing
    const encoded = btoa(JSON.stringify(shareData));
    return `${window.location.origin}/emergency/verify/${encoded}`;
  },

  // Cancel emergency (false alarm)
  cancelEmergency: () => {
    const { activeEmergency } = get();

    if (activeEmergency) {
      useVehicleStore.getState().setVehicleStatus(activeEmergency.vehicleId, 'parked');

      set({
        activeEmergency: null,
        isEmergencyMode: false,
      });

      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'Emergency Cancelled',
        message: 'False alarm - emergency has been cancelled.',
      });
    }
  },
}));
