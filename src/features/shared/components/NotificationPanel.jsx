import { X, Bell, AlertTriangle, Car, Info, Check } from 'lucide-react';
import { useNotificationStore } from '../../../store';

const typeIcons = {
  emergency: AlertTriangle,
  request: Car,
  maintenance: Bell,
  info: Info,
};

const typeColors = {
  emergency: 'bg-red-100 text-red-800 border-red-300',
  request: 'bg-blue-100 text-blue-800 border-blue-300',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  info: 'bg-slate-100 text-slate-800 border-slate-300',
};

export function NotificationPanel({ isOpen, onClose }) {
  const { notifications, markAsRead, markAllAsRead, removeNotification } =
    useNotificationStore();

  if (!isOpen) return null;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-96 bg-white shadow-xl h-full overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 className="font-bold">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all read
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                          typeColors[notification.type]
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="p-1 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            {formatTime(notification.timestamp)}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
