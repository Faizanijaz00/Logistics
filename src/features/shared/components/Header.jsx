import { useState } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { useNotificationStore, useEmergencyStore } from '../../../store';
import { NotificationPanel } from './NotificationPanel';

export function Header({ title, subtitle }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotificationStore();
  const { isEmergencyMode, activeEmergency } = useEmergencyStore();

  return (
    <>
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-4">
            {isEmergencyMode && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg animate-pulse">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Emergency Active</span>
              </div>
            )}

            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
