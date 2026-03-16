import { Car, ParkingCircle } from 'lucide-react';

export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl shadow-lg p-4">
      <h4 className="font-bold text-sm mb-3">Legend</h4>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Car className="w-3 h-3" /> Vehicles
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
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
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span>Emergency</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-2">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <ParkingCircle className="w-3 h-3" /> Parking Zones
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/50 border border-green-500" />
              <span>Free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500/50 border border-yellow-500" />
              <span>Risky</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500/50 border border-orange-500" />
              <span>High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/50 border border-red-500" />
              <span>Private</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
