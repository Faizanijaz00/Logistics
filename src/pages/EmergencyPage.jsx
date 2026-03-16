import { PanicButton, DocumentCard } from '../components/Emergency';
import { useVehicles } from '../hooks/useVehicles';
import { AlertTriangle, Phone, FileText } from 'lucide-react';

export function EmergencyPage() {
  const { vehicles, loading } = useVehicles();

  const handlePanicTrigger = (vehicleId) => {
    console.log('Emergency triggered for vehicle:', vehicleId);
    // In a real app, this would send notifications to the community
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-7 h-7" />
          Document & Emergency Portal
        </h1>
        <p className="text-slate-500">Quick access to insurance documents and emergency features</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PanicButton vehicles={vehicles} onTrigger={handlePanicTrigger} />

          <div className="mt-6 bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Contacts
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">Emergency Services</p>
                <p className="text-2xl font-bold text-red-600">999</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">Non-Emergency Police</p>
                <p className="text-xl font-bold text-blue-600">101</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">Community Coordinator</p>
                <p className="text-lg font-bold">+44 7700 900000</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-100 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Vehicle Documents Repository
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((vehicle) => (
                <DocumentCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
