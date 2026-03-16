import { Car, Calendar, Wrench, Shield, MapPin, Gauge } from 'lucide-react';

const getMaintenanceStatus = (nextService, tireWear, oilLife) => {
  const today = new Date();
  const serviceDate = new Date(nextService);
  const daysUntilService = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilService < 7 || tireWear < 20 || oilLife < 20) return 'critical';
  if (daysUntilService < 30 || tireWear < 40 || oilLife < 40) return 'warning';
  return 'good';
};

const getInsuranceStatus = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 7) return 'critical';
  if (daysUntilExpiry < 30) return 'warning';
  return 'good';
};

const StatusIndicator = ({ status }) => {
  const styles = {
    critical: 'bg-red-500',
    warning: 'bg-yellow-500',
    good: 'bg-green-500',
  };
  return <div className={`w-3 h-3 rounded-full ${styles[status]}`} />;
};

const ProgressBar = ({ value, label }) => {
  const getColor = (val) => {
    if (val > 60) return 'bg-green-500';
    if (val > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

export function VehicleCard({ vehicle, onSelect }) {
  const maintenanceStatus = getMaintenanceStatus(
    vehicle.maintenance.nextService,
    vehicle.maintenance.tireWear,
    vehicle.maintenance.oilLife
  );
  const insuranceStatus = getInsuranceStatus(vehicle.insurance.expiryDate);

  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => onSelect?.(vehicle)}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white relative">
        {vehicle.problems && vehicle.problems.length > 0 && (
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white animate-pulse">
            {vehicle.problems.length}
          </div>
        )}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-slate-300 font-mono">{vehicle.licensePlate}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              vehicle.status === 'active'
                ? 'bg-green-500'
                : vehicle.status === 'parked'
                ? 'bg-blue-500'
                : vehicle.status === 'emergency'
                ? 'bg-red-500 animate-pulse'
                : 'bg-orange-500'
            }`}
          >
            {vehicle.status}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 divide-x border-b">
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500">Year</p>
          <p className="font-bold">{vehicle.year}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500">Color</p>
          <p className="font-bold">{vehicle.color}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500">Mileage</p>
          <p className="font-bold">{vehicle.dailyMileage} km</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {/* Insurance */}
        <div className="p-3 bg-blue-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">Insurance</span>
            </div>
            <StatusIndicator status={insuranceStatus} />
          </div>
          <div className="text-sm text-slate-600">
            <p>{vehicle.insurance.provider}</p>
            <p className="flex justify-between">
              <span>Expires:</span>
              <span className="font-medium">{vehicle.insurance.expiryDate}</span>
            </p>
            <p className="flex justify-between">
              <span>Annual Cost:</span>
              <span className="font-medium">£{vehicle.insurance.annualCost}</span>
            </p>
          </div>
        </div>

        {/* Maintenance */}
        <div className="p-3 bg-orange-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-sm">Maintenance</span>
            </div>
            <StatusIndicator status={maintenanceStatus} />
          </div>
          <div className="text-sm text-slate-600 mb-3">
            <p className="flex justify-between">
              <span>Next Service:</span>
              <span className="font-medium">{vehicle.maintenance.nextService}</span>
            </p>
          </div>
          <div className="space-y-2">
            <ProgressBar value={vehicle.maintenance.tireWear} label="Tire Health" />
            <ProgressBar value={vehicle.maintenance.oilLife} label="Oil Life" />
          </div>
        </div>

        {/* Tax */}
        <div
          className={`p-3 rounded-xl ${
            vehicle.tax.status === 'paid' ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm">Road Tax</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                vehicle.tax.status === 'paid'
                  ? 'bg-green-200 text-green-800'
                  : 'bg-red-200 text-red-800'
              }`}
            >
              {vehicle.tax.status}
            </span>
          </div>
          <div className="text-sm text-slate-600">
            <p className="flex justify-between">
              <span>Expires:</span>
              <span className="font-medium">{vehicle.tax.expiryDate}</span>
            </p>
          </div>
        </div>

        {/* Parking Permit */}
        {vehicle.parkingPermit && (
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl">
            <MapPin className="w-4 h-4 text-purple-600" />
            <span className="text-sm">
              Parking Permit:{' '}
              <span className="font-medium text-purple-700">
                {vehicle.parkingPermit}
              </span>
            </span>
          </div>
        )}

        {/* Reported Problems */}
        {vehicle.problems && vehicle.problems.length > 0 && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span className="font-semibold text-sm text-red-700">
                  {vehicle.problems.length} Issue{vehicle.problems.length > 1 ? 's' : ''} Reported
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {vehicle.problems.map((p) => (
                <div key={p.id} className="text-sm text-red-800 bg-red-100 rounded-lg p-2">
                  <p className="font-medium">{p.text}</p>
                  <p className="text-xs text-red-500 mt-1">
                    {p.reportedBy} · {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
