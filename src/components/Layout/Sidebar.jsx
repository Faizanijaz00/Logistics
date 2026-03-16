import { NavLink } from 'react-router-dom';
import {
  Map,
  Truck,
  ParkingCircle,
  FileText,
  Users,
  AlertTriangle,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Map, label: 'Map Overview' },
  { to: '/fleet', icon: Truck, label: 'Fleet Registry' },
  { to: '/parking', icon: ParkingCircle, label: 'Parking Map' },
  { to: '/requests', icon: Users, label: 'Ride Requests' },
  { to: '/emergency', icon: AlertTriangle, label: 'Emergency' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-400" />
          Fleet Manager
        </h1>
        <p className="text-sm text-slate-400 mt-1">Community Logistics</p>
      </div>

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
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="text-sm text-slate-400">
          <p>Active Vehicles: 2</p>
          <p>Pending Requests: 2</p>
        </div>
      </div>
    </aside>
  );
}
