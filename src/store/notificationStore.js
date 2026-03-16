import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  // Getters
  getUnreadNotifications: () => get().notifications.filter((n) => !n.read),

  // Actions
  addNotification: ({ type, title, message, actionUrl, relatedId }) => {
    const notification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl,
      relatedId,
    };

    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));

    // Play sound for emergency notifications
    if (type === 'emergency') {
      // Could trigger audio here
      console.log('🚨 EMERGENCY ALERT:', message);
    }

    return notification;
  },

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  removeNotification: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      return {
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: notification && !notification.read
          ? state.unreadCount - 1
          : state.unreadCount,
      };
    }),
}));
