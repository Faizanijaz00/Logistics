import { useState } from 'react';
import { FleetList } from '../components/Fleet';
import { useVehicles } from '../hooks/useVehicles';
import { Search, Filter } from 'lucide-react';

export function FleetRegistry() {
  const { vehicles, loading } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-2xl font-bold">Fleet Registry</h1>
        <p className="text-slate-500">Manage vehicles, maintenance, and financials</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by make, model, or plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="parked">Parked</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          Urgent: {vehicles.filter((v) => v.tax.status === 'due').length}
        </span>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
          Service Due: {vehicles.filter((v) => v.maintenance.oilLife < 30).length}
        </span>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          All Clear: {vehicles.filter((v) => v.maintenance.oilLife >= 50 && v.tax.status === 'paid').length}
        </span>
      </div>

      <FleetList vehicles={filteredVehicles} />
    </div>
  );
}
