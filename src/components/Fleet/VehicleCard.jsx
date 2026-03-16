import { Car, Calendar, Wrench, Shield, FileText } from 'lucide-react';

const getMaintenanceStatus = (nextService, tireWear, oilLife) => {
  const today = new Date();
  const serviceDate = new Date(nextService);
  const daysUntilService = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilService < 7 || tireWear < 20 || oilLife < 20) return 'red';
  if (daysUntilService < 30 || tireWear < 40 || oilLife < 40) return 'yellow';
  return 'green';
};

const getInsuranceStatus = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 7) return 'red';
  if (daysUntilExpiry < 30) return 'yellow';
  return 'green';
};

const getTaxStatus = (status, expiryDate) => {
  if (status === 'due') return 'red';
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 30) return 'yellow';
  return 'green';
};

const StatusBadge = ({ status }) => {
  const colors = {
    red: 'bg-red-100 text-red-800 border-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {status === 'red' ? 'Urgent' : status === 'yellow' ? 'Due Soon' : 'OK'}
    </span>
  );
};

export function VehicleCard({ vehicle }) {
  const maintenanceStatus = getMaintenanceStatus(
    vehicle.maintenance.nextService,
    vehicle.maintenance.tireWear,
    vehicle.maintenance.oilLife
  );
  const insuranceStatus = getInsuranceStatus(vehicle.insurance.expiryDate);
  const taxStatus = getTaxStatus(vehicle.tax.status, vehicle.tax.expiryDate);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 bg-slate-800 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-slate-300 text-sm">{vehicle.licensePlate}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              vehicle.status === 'active'
                ? 'bg-green-500'
                : vehicle.status === 'parked'
                ? 'bg-blue-500'
                : 'bg-orange-500'
            }`}
          >
            {vehicle.status}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Car className="w-4 h-4 text-slate-400" />
          <span>
            {vehicle.year} • {vehicle.color}
          </span>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Insurance
            <StatusBadge status={insuranceStatus} />
          </h4>
          <div className="text-sm text-slate-600 space-y-1">
            <p>{vehicle.insurance.provider}</p>
            <p>Expires: {vehicle.insurance.expiryDate}</p>
            <p>Annual Cost: £{vehicle.insurance.annualCost}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Maintenance
            <StatusBadge status={maintenanceStatus} />
          </h4>
          <div className="text-sm text-slate-600 space-y-2">
            <p>Next Service: {vehicle.maintenance.nextService}</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Tire Wear</span>
                <span>{vehicle.maintenance.tireWear}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    vehicle.maintenance.tireWear > 50
                      ? 'bg-green-500'
                      : vehicle.maintenance.tireWear > 25
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${vehicle.maintenance.tireWear}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Oil Life</span>
                <span>{vehicle.maintenance.oilLife}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    vehicle.maintenance.oilLife > 50
                      ? 'bg-green-500'
                      : vehicle.maintenance.oilLife > 25
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${vehicle.maintenance.oilLife}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Road Tax
            <StatusBadge status={taxStatus} />
          </h4>
          <div className="text-sm text-slate-600">
            <p>Expires: {vehicle.tax.expiryDate}</p>
            <p>Annual Cost: £{vehicle.tax.annualCost}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
