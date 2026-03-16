import { ParkingMap, ParkingLegend } from '../components/Parking';
import { useParkingZones } from '../hooks/useParkingZones';
import { useVehicles } from '../hooks/useVehicles';

export function ParkingPage() {
  const { zones, loading: zonesLoading } = useParkingZones();
  const { vehicles, loading: vehiclesLoading } = useVehicles();

  if (zonesLoading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const parkedVehicles = vehicles.filter((v) => v.status === 'parked');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white border-b">
        <h1 className="text-2xl font-bold">Intelligent Parking Map</h1>
        <p className="text-slate-500">Find safe parking spots across the community</p>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <div className="h-full rounded-xl overflow-hidden shadow-lg">
            <ParkingMap zones={zones} vehicles={parkedVehicles} />
          </div>
        </div>

        <div className="w-80 p-4 space-y-4">
          <ParkingLegend />

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3">Zone Summary</h3>
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex justify-between items-center p-2 bg-slate-50 rounded"
                >
                  <div>
                    <p className="font-medium text-sm">{zone.name}</p>
                    <p className="text-xs text-slate-500">{zone.hours}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {zone.capacity - zone.occupied} free
                    </p>
                    <p className="text-xs text-slate-500">of {zone.capacity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3">Vehicles with Permits</h3>
            <div className="space-y-2">
              {vehicles
                .filter((v) => v.parkingPermit)
                .map((v) => (
                  <div
                    key={v.id}
                    className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm"
                  >
                    <span>
                      {v.make} {v.model}
                    </span>
                    <span className="text-blue-600 font-medium">{v.parkingPermit}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
