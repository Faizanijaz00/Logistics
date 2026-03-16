import { useState } from 'react';
import { AlertTriangle, Phone, FileText, X } from 'lucide-react';

export function PanicButton({ vehicles, onTrigger }) {
  const [isActive, setIsActive] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const handlePanic = () => {
    setIsActive(true);
    if (onTrigger) {
      onTrigger(selectedVehicle);
    }
  };

  const handleClose = () => {
    setIsActive(false);
    setSelectedVehicle(null);
  };

  if (isActive && selectedVehicle) {
    const vehicle = vehicles.find((v) => v.id === selectedVehicle);
    return (
      <div className="fixed inset-0 bg-red-900/95 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600">Emergency Mode Active</h2>
            <p className="text-slate-600 mt-2">Community has been notified</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-lg mb-2">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-slate-600">{vehicle.licensePlate}</p>
          </div>

          <div className="space-y-3">
            <a
              href={vehicle.insurance.documentUrl}
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium">Insurance Document</p>
                <p className="text-sm text-slate-500">{vehicle.insurance.provider}</p>
              </div>
            </a>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Policy Number</p>
              <p className="font-mono font-bold text-lg">{vehicle.insurance.policyNumber}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Insurance Expiry</p>
              <p className="font-bold">{vehicle.insurance.expiryDate}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full mt-6 bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close Emergency Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="text-center mb-6">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
        <h2 className="text-xl font-bold">Emergency Panic Button</h2>
        <p className="text-slate-500 text-sm mt-1">
          Quick access to vehicle documents for police stops
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Vehicle
        </label>
        <select
          value={selectedVehicle || ''}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
        >
          <option value="">Choose a vehicle...</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.make} {v.model} - {v.licensePlate}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handlePanic}
        disabled={!selectedVehicle}
        className="w-full bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2"
      >
        <AlertTriangle className="w-5 h-5" />
        PANIC - Get Documents Now
      </button>

      <p className="text-center text-sm text-slate-500 mt-4">
        This will notify the community and provide instant access to insurance documents
      </p>
    </div>
  );
}
