import { FleetMap } from '../components/Map';
import { useVehicles } from '../hooks/useVehicles';
import { Truck, Navigation, Clock } from 'lucide-react';

export function MapOverview() {
  const { vehicles, loading, getActiveVehicles } = useVehicles();
  const activeVehicles = getActiveVehicles();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white border-b">
        <h1 className="text-2xl font-bold">Real-Time Map Overview</h1>
        <p className="text-slate-500">Track all community vehicles in real-time</p>
      </div>

      <div className="p-4 bg-slate-50 border-b">
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <Truck className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-slate-500">Total Vehicles</p>
              <p className="font-bold">{vehicles.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <Navigation className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-slate-500">Active Now</p>
              <p className="font-bold">{activeVehicles.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm text-slate-500">In Maintenance</p>
              <p className="font-bold">
                {vehicles.filter((v) => v.status === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="h-full rounded-xl overflow-hidden shadow-lg">
          <FleetMap vehicles={vehicles} showRoutes={true} />
        </div>
      </div>

      <div className="p-4 bg-white border-t">
        <h3 className="font-medium mb-2">Legend</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Parked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500 border-dashed border-t-2 border-green-500" />
            <span>Active Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
