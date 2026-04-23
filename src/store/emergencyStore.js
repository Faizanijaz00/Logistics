import { create } from 'zustand';
import { useVehicleStore } from './vehicleStore';
import { useNotificationStore } from './notificationStore';
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

export const useEmergencyStore = create((set, get) => ({
  activeEmergency: null,
  emergencyHistory: [],
  isEmergencyMode: false,

  fetchEmergencies: async () => {
    const data = await api('GET', '/api/emergencies');
    if (!data) return;
    const active = data.find((e) => e.is_active) || null;
    const history = data.filter((e) => !e.is_active);
    set({
      activeEmergency: active,
      emergencyHistory: history,
      isEmergencyMode: !!active,
    });
  },

  triggerEmergency: (vehicleId, type = 'police_stop', message = '') => {
    const vehicleStore = useVehicleStore.getState();
    const vehicle = vehicleStore.getVehicleById(vehicleId);
    if (!vehicle) return null;

    const emergency = {
      id: `emerg-${Date.now()}`,
      type,
      vehicle_id: vehicleId,
      driver_id: vehicle.currentDriver || 'Unknown',
      location: vehicle.position,
      timestamp: new Date().toISOString(),
      message: message || `Emergency triggered for ${vehicle.make} ${vehicle.model}`,
      is_active: true,
      acknowledged_by: [],
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        insurance: vehicle.insurance,
      },
    };

    vehicleStore.setVehicleStatus(vehicleId, 'emergency');
    set({ activeEmergency: emergency, isEmergencyMode: true });

    useNotificationStore.getState().addNotification({
      type: 'emergency',
      title: 'EMERGENCY ALERT',
      message: `${vehicle.currentDriver || 'Driver'} needs help! Vehicle: ${vehicle.licensePlate}`,
      relatedId: emergency.id,
    });

    api('POST', '/api/emergencies', emergency);
    return emergency;
  },

  acknowledgeEmergency: (emergencyId, userId) => {
    set((state) => {
      if (state.activeEmergency?.id !== emergencyId) return state;
      const updated = {
        ...state.activeEmergency,
        acknowledged_by: [...(state.activeEmergency.acknowledged_by || []), userId],
      };
      api('PATCH', `/api/emergencies/${emergencyId}`, { acknowledged_by: updated.acknowledged_by });
      return { activeEmergency: updated };
    });
  },

  resolveEmergency: (emergencyId) => {
    const { activeEmergency } = get();
    if (activeEmergency?.id !== emergencyId) return;

    useVehicleStore.getState().setVehicleStatus(activeEmergency.vehicle_id, 'parked');
    const resolvedAt = new Date().toISOString();

    set((state) => ({
      activeEmergency: null,
      isEmergencyMode: false,
      emergencyHistory: [
        { ...state.activeEmergency, is_active: false, resolved_at: resolvedAt },
        ...state.emergencyHistory,
      ],
    }));

    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Emergency Resolved',
      message: 'The emergency situation has been resolved. All clear.',
    });

    api('PATCH', `/api/emergencies/${emergencyId}`, { is_active: false, resolved_at: resolvedAt });
  },

  getEmergencyShareLink: () => {
    const { activeEmergency } = get();
    if (!activeEmergency) return null;
    const shareData = {
      vehiclePlate: activeEmergency.vehicle?.licensePlate,
      insurance: activeEmergency.vehicle?.insurance,
      timestamp: activeEmergency.timestamp,
    };
    const encoded = btoa(JSON.stringify(shareData));
    return `${window.location.origin}/emergency/verify/${encoded}`;
  },

  cancelEmergency: () => {
    const { activeEmergency } = get();
    if (!activeEmergency) return;

    useVehicleStore.getState().setVehicleStatus(activeEmergency.vehicle_id, 'parked');
    set({ activeEmergency: null, isEmergencyMode: false });

    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Emergency Cancelled',
      message: 'False alarm - emergency has been cancelled.',
    });

    api('PATCH', `/api/emergencies/${activeEmergency.id}`, {
      is_active: false,
      resolved_at: new Date().toISOString(),
    });
  },
}));
