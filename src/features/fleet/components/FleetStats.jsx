import { AlertTriangle, CheckCircle, Clock, Truck } from 'lucide-react';

export function FleetStats({ vehicles }) {
  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === 'active').length,
    needsService: vehicles.filter((v) => {
      const daysUntil =
        (new Date(v.maintenance.nextService) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntil < 30 || v.maintenance.oilLife < 30 || v.maintenance.tireWear < 30;
    }).length,
    insuranceExpiring: vehicles.filter((v) => {
      const daysUntil =
        (new Date(v.insurance.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntil < 30;
    }).length,
    taxDue: vehicles.filter((v) => v.tax.status !== 'paid').length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-white rounded-xl p-4 shadow">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Fleet</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Active Now</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              stats.needsService > 0 ? 'bg-orange-100' : 'bg-slate-100'
            }`}
          >
            <Clock
              className={`w-6 h-6 ${
                stats.needsService > 0 ? 'text-orange-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div>
            <p className="text-sm text-slate-500">Service Due</p>
            <p className="text-2xl font-bold">{stats.needsService}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              stats.insuranceExpiring > 0 ? 'bg-yellow-100' : 'bg-slate-100'
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${
                stats.insuranceExpiring > 0 ? 'text-yellow-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div>
            <p className="text-sm text-slate-500">Insurance</p>
            <p className="text-2xl font-bold">{stats.insuranceExpiring}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              stats.taxDue > 0 ? 'bg-red-100' : 'bg-slate-100'
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${
                stats.taxDue > 0 ? 'text-red-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div>
            <p className="text-sm text-slate-500">Tax Due</p>
            <p className="text-2xl font-bold">{stats.taxDue}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
