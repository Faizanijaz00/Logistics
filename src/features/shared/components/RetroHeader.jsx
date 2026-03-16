import { useState, useEffect } from 'react';
import { useNotificationStore, useEmergencyStore } from '../../../store';

export function RetroHeader({ title, subtitle }) {
  const [time, setTime] = useState(new Date());
  const { notifications, unreadCount, markAllAsRead } = useNotificationStore();
  const { isEmergencyMode } = useEmergencyStore();
  const [showNotifications, setShowNotifications] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className={`border-b-2 px-6 py-3 ${
        isEmergencyMode
          ? 'border-red-500 alarm-active'
          : 'border-green-900'
      }`}
      style={{ background: '#000a00' }}
    >
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold tracking-widest text-glow uppercase">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs opacity-50 tracking-wider mt-1">{subtitle}</p>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6">
          {/* Emergency Indicator */}
          {isEmergencyMode && (
            <div className="alarm-text text-sm font-bold px-4 py-1 border border-red-500">
              ! EMERGENCY ACTIVE !
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="retro-btn py-1 px-3 text-sm flex items-center gap-2"
            >
              <span>[NOTIF]</span>
              {unreadCount > 0 && (
                <span className="status-critical">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-80 retro-panel border-glow z-50"
                style={{ background: '#001000' }}
              >
                <div className="retro-panel-header flex justify-between items-center text-xs">
                  <span>NOTIFICATIONS</span>
                  <button
                    onClick={() => markAllAsRead()}
                    className="opacity-70 hover:opacity-100"
                  >
                    [CLEAR]
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b border-green-900 text-sm ${
                          !notif.read ? 'bg-green-950/30' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className={`text-xs font-bold ${
                              notif.type === 'emergency'
                                ? 'status-critical'
                                : notif.type === 'request'
                                ? 'status-warning'
                                : ''
                            }`}
                          >
                            [{notif.type.toUpperCase()}]
                          </span>
                          <span className="text-xs opacity-50">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-1 opacity-80">{notif.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center opacity-50 text-sm">
                      [NO NOTIFICATIONS]
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clock */}
          <div className="text-right">
            <div className="text-lg font-mono text-glow">
              {time.toLocaleTimeString()}
            </div>
            <div className="text-xs opacity-50">
              {time.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default RetroHeader;
