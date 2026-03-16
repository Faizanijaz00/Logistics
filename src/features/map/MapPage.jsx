import { useState } from 'react';
import { Header } from '../shared/components';
import { LiveMap, MapControls, MapLegend } from './components';
import { useVehicleStore, useParkingStore, useEmergencyStore } from '../../store';
import { Truck, Navigation, Clock, AlertTriangle, ParkingCircle } from 'lucide-react';

export function MapPage() {
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
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance');
  const freeSpots = zones.reduce((acc, z) => acc + (z.capacity - z.occupied), 0);

  return (
    <div className="h-screen flex flex-col">
      <Header
        title="Live Map Overview"
        subtitle="Real-time fleet tracking and parking intelligence"
      />

      {/* Stats Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="font-bold text-lg">{activeVehicles.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Parked</p>
              <p className="font-bold text-lg">{parkedVehicles.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Maintenance</p>
              <p className="font-bold text-lg">{maintenanceVehicles.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ParkingCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Free Parking</p>
              <p className="font-bold text-lg">{freeSpots}</p>
            </div>
          </div>

          {isEmergencyMode && (
            <div className="flex items-center gap-2 ml-auto px-4 py-2 bg-red-100 rounded-lg animate-pulse">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-bold text-red-600">EMERGENCY ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <LiveMap vehicles={vehicles} parkingZones={zones} filters={filters} />
        <MapControls filters={filters} onFilterChange={setFilters} />
        <MapLegend />
      </div>
    </div>
  );
}
