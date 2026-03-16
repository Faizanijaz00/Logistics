import { NavLink } from 'react-router-dom';
import {
  Map,
  Truck,
  ParkingCircle,
  Users,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { useNotificationStore, useEmergencyStore } from '../../../store';

const navItems = [
  { to: '/', icon: Map, label: 'Live Map' },
  { to: '/fleet', icon: Truck, label: 'Fleet Registry' },
  { to: '/parking', icon: ParkingCircle, label: 'Parking Zones' },
  { to: '/requests', icon: Users, label: 'Ride Requests' },
  { to: '/emergency', icon: AlertTriangle, label: 'Emergency' },
];

export function Sidebar() {
  const { unreadCount } = useNotificationStore();
  const { isEmergencyMode } = useEmergencyStore();

  return (
    <aside
      className={`w-64 min-h-screen flex flex-col transition-colors ${
        isEmergencyMode
          ? 'bg-red-900 animate-pulse'
          : 'bg-slate-900'
      }`}
    >
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-400" />
          Fleet Hub
        </h1>
        <p className="text-sm text-slate-400 mt-1">Community Logistics</p>
      </div>

      {isEmergencyMode && (
        <div className="mx-4 mt-4 p-3 bg-red-600 rounded-lg text-white text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
          <p className="font-bold text-sm">EMERGENCY ACTIVE</p>
        </div>
      )}

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${to === '/emergency' && isEmergencyMode ? 'ring-2 ring-red-400' : ''}`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
                {to === '/emergency' && isEmergencyMode && (
                  <span className="ml-auto w-2 h-2 bg-red-400 rounded-full animate-ping" />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="text-sm">Notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
