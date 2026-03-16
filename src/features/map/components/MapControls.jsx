import { useState } from 'react';
import {
  Layers,
  Car,
  ParkingCircle,
  Route,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';

export function MapControls({ filters, onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleFilter = (key) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-600" />
            <span className="font-medium">Map Layers</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isExpanded && (
          <div className="border-t p-3 space-y-2">
            <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showActiveVehicles}
                onChange={() => toggleFilter('showActiveVehicles')}
                className="w-4 h-4 text-green-600 rounded"
              />
              <Car className="w-4 h-4 text-green-600" />
              <span className="text-sm">Active Vehicles</span>
            </label>

            <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showParkedVehicles}
                onChange={() => toggleFilter('showParkedVehicles')}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Car className="w-4 h-4 text-blue-600" />
              <span className="text-sm">Parked Vehicles</span>
            </label>

            <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showRoutes}
                onChange={() => toggleFilter('showRoutes')}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <Route className="w-4 h-4 text-purple-600" />
              <span className="text-sm">Active Routes</span>
            </label>

            <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showParkingZones}
                onChange={() => toggleFilter('showParkingZones')}
                className="w-4 h-4 text-orange-600 rounded"
              />
              <ParkingCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Parking Zones</span>
            </label>

            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-slate-500 px-2 mb-2">Parking Filter</p>
              <select
                value={filters.selectedZoneStatus}
                onChange={(e) =>
                  onFilterChange({ ...filters, selectedZoneStatus: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg"
              >
                <option value="all">All Zones</option>
                <option value="free">Free Only</option>
                <option value="risky">Risky</option>
                <option value="high-risk">High Risk</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
