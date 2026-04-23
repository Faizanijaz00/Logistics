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

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const data = await api('GET', '/api/notifications');
    if (data) {
      set({ notifications: data, unreadCount: data.filter((n) => !n.read).length });
    }
  },

  getUnreadNotifications: () => get().notifications.filter((n) => !n.read),

  addNotification: ({ type, title, message, actionUrl, relatedId }) => {
    const notification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      action_url: actionUrl,
      related_id: relatedId,
    };
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
    if (type === 'emergency') console.log('EMERGENCY ALERT:', message);
    api('POST', '/api/notifications', notification);
    return notification;
  },

  markAsRead: (notificationId) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
    });
    api('PATCH', `/api/notifications/${notificationId}`, { read: true });
  },

  markAllAsRead: () => {
    const ids = get().notifications.filter((n) => !n.read).map((n) => n.id);
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    ids.forEach((id) => api('PATCH', `/api/notifications/${id}`, { read: true }));
  },

  clearNotifications: async () => {
    set({ notifications: [], unreadCount: 0 });
    await api('DELETE', '/api/notifications');
  },

  removeNotification: (notificationId) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== notificationId);
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
    });
    api('DELETE', `/api/notifications/${notificationId}`);
  },
}));
