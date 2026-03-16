import { useState } from 'react';
import { RetroHeader } from '../shared/components/RetroHeader';
import { SimpleMap } from './components/SimpleMap';
import { useVehicleStore, useParkingStore, useEmergencyStore } from '../../store';

export function RetroMapPage() {
  const { vehicles } = useVehicleStore();
  const { zones } = useParkingStore();
  const { isEmergencyMode } = useEmergencyStore();

  const [filters, setFilters] = useState({
    showActiveVehicles: true,
    showParkedVehicles: true,
    showRoutes: true,
    showParkingZones: true,
    selectedZoneStatus: 'all',
  });

  const activeVehicles = vehicles.filter((v) => v.status === 'active');
  const parkedVehicles = vehicles.filter((v) => v.status === 'parked');
  const freeSpots = zones.reduce((acc, z) => acc + (z.capacity - z.occupied), 0);

  return (
    <div className="h-screen flex flex-col" style={{ background: '#000500' }}>
      <RetroHeader
        title="TACTICAL MAP"
        subtitle="REAL-TIME FLEET TRACKING SYSTEM"
      />

      {/* Stats Bar */}
      <div className="border-b border-green-900 px-6 py-3 flex gap-8">
        <div className="retro-panel-beveled px-4 py-2 flex items-center gap-3">
          <span className="text-xs opacity-70">ACTIVE:</span>
          <span className="text-xl font-bold text-glow">{activeVehicles.length}</span>
        </div>
        <div className="retro-panel-beveled px-4 py-2 flex items-center gap-3">
          <span className="text-xs opacity-70">STANDBY:</span>
          <span className="text-xl font-bold">{parkedVehicles.length}</span>
        </div>
        <div className="retro-panel-beveled px-4 py-2 flex items-center gap-3">
          <span className="text-xs opacity-70">PARKING:</span>
          <span className="text-xl font-bold">{freeSpots}</span>
        </div>

        {isEmergencyMode && (
          <div className="retro-panel-beveled px-4 py-2 flex items-center gap-3 border-red-500 alarm-active ml-auto">
            <span className="alarm-text text-sm font-bold">! EMERGENCY !</span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <SimpleMap
          vehicles={vehicles}
          showRoutes={filters.showRoutes}
          showParkingZones={filters.showParkingZones}
          filters={filters}
        />

        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-[1000] retro-panel" style={{ background: '#001000ee' }}>
          <div className="retro-panel-header text-xs">
            <span>MAP LAYERS</span>
          </div>
          <div className="p-3 space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showActiveVehicles}
                onChange={(e) =>
                  setFilters({ ...filters, showActiveVehicles: e.target.checked })
                }
                className="accent-green-500"
              />
              <span className="opacity-70">[VEH] ACTIVE</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showParkedVehicles}
                onChange={(e) =>
                  setFilters({ ...filters, showParkedVehicles: e.target.checked })
                }
                className="accent-green-500"
              />
              <span className="opacity-70">[VEH] PARKED</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showRoutes}
                onChange={(e) =>
                  setFilters({ ...filters, showRoutes: e.target.checked })
                }
                className="accent-green-500"
              />
              <span className="opacity-70">[RTE] ROUTES</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showParkingZones}
                onChange={(e) =>
                  setFilters({ ...filters, showParkingZones: e.target.checked })
                }
                className="accent-green-500"
              />
              <span className="opacity-70">[ZNE] PARKING</span>
            </label>

            <div className="border-t border-green-900 pt-2 mt-2">
              <select
                value={filters.selectedZoneStatus}
                onChange={(e) =>
                  setFilters({ ...filters, selectedZoneStatus: e.target.value })
                }
                className="retro-select w-full text-xs py-1"
              >
                <option value="all">ALL ZONES</option>
                <option value="free">SAFE ONLY</option>
                <option value="risky">RISKY</option>
                <option value="high-risk">DANGER</option>
                <option value="private">PRIVATE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] retro-panel" style={{ background: '#001000ee' }}>
          <div className="p-3 space-y-2 text-xs">
            <div className="font-bold mb-2 opacity-70">LEGEND</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" style={{ boxShadow: '0 0 6px #00ff41' }} />
                <span>ACTIVE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-700 rounded-full" />
                <span>PARKED</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                <span>SERVICE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>EMERGENCY</span>
              </div>
            </div>
            <div className="border-t border-green-900 pt-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 border border-green-500 bg-green-500/20" />
                <span>SAFE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 border border-amber-500 bg-amber-500/20" />
                <span>RISKY</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 border border-orange-500 bg-orange-500/20" />
                <span>DANGER</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 border border-red-500 border-dashed bg-red-500/20" />
                <span>PRIVATE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RetroMapPage;
