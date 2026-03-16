import { NavLink } from 'react-router-dom';
import { useNotificationStore, useEmergencyStore, useVehicleStore } from '../../../store';

const navItems = [
  { to: '/', label: 'MAP', icon: '[MAP]' },
  { to: '/fleet', label: 'LEDGER', icon: '[FLT]' },
  { to: '/parking', label: 'ZONES', icon: '[PRK]' },
  { to: '/requests', label: 'DISPATCH', icon: '[DSP]' },
  { to: '/emergency', label: 'PANIC', icon: '[!]' },
];

export function RetroSidebar() {
  const { unreadCount } = useNotificationStore();
  const { isEmergencyMode } = useEmergencyStore();
  const { vehicles } = useVehicleStore();

  const activeCount = vehicles.filter((v) => v.status === 'active').length;
  const alertCount = vehicles.filter(
    (v) => v.maintenance.oilLife < 30 || v.tax.status !== 'paid'
  ).length;

  return (
    <aside
      className={`w-56 min-h-screen flex flex-col retro-panel border-r-2 ${
        isEmergencyMode ? 'border-red-500 alarm-active' : 'border-green-900'
      }`}
      style={{ background: '#000800' }}
    >
      {/* Logo/Header */}
      <div className="p-4 border-b border-green-900">
        <div className="text-center">
          <div className="text-xl font-bold text-glow tracking-widest mb-1">
            FLEET
          </div>
          <div className="text-xs opacity-70 tracking-wider">
            COMMAND CENTER
          </div>
          <div className="text-xs opacity-50 mt-2 font-mono">
            v2.1.0
          </div>
        </div>
      </div>

      {/* Emergency Banner */}
      {isEmergencyMode && (
        <div className="mx-2 mt-2 p-2 border border-red-500 text-center alarm-text">
          <div className="text-sm font-bold">! ALERT !</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 mt-2">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 text-sm font-mono transition-all ${
                    isActive
                      ? 'bg-green-950 text-green-400 border-l-2 border-green-500 text-glow'
                      : 'text-green-600 hover:text-green-400 hover:bg-green-950/50 border-l-2 border-transparent'
                  } ${to === '/emergency' && isEmergencyMode ? 'text-red-500 border-red-500' : ''}`
                }
              >
                <span className="w-12 text-center opacity-70">{icon}</span>
                <span className="tracking-wider">{label}</span>
                {to === '/emergency' && isEmergencyMode && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-ping" />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status Panel */}
      <div className="p-3 border-t border-green-900 space-y-2 text-xs">
        <div className="retro-panel-beveled p-2">
          <div className="flex justify-between">
            <span className="opacity-70">ACTIVE:</span>
            <span className="status-active">{activeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">ALERTS:</span>
            <span className={alertCount > 0 ? 'status-warning' : ''}>
              {alertCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">NOTIF:</span>
            <span className={unreadCount > 0 ? 'status-critical' : ''}>
              {unreadCount}
            </span>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="p-3 border-t border-green-900 text-xs text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="status-dot status-dot-active" />
          <span className="opacity-70">SYSTEM ONLINE</span>
        </div>
        <div className="opacity-50 mt-1 font-mono">
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </aside>
  );
}

export default RetroSidebar;
