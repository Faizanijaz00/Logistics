import { useState } from 'react';
import { Header } from '../shared/components';
import { VehicleCard, FleetStats } from './components';
import { useVehicleStore } from '../../store';
import { Search, Filter, SortAsc } from 'lucide-react';

export function FleetPage() {
  const { vehicles } = useVehicleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Filter vehicles
  const filteredVehicles = vehicles
    .filter((v) => {
      const matchesSearch =
        v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'insurance':
          return new Date(a.insurance.expiryDate) - new Date(b.insurance.expiryDate);
        case 'service':
          return (
            new Date(a.maintenance.nextService) - new Date(b.maintenance.nextService)
          );
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        title="Fleet Registry"
        subtitle="Vehicle specifications, maintenance, and financials"
      />

      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <FleetStats vehicles={vehicles} />

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by make, model, or plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="parked">Parked</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="relative">
            <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="insurance">Sort by Insurance</option>
              <option value="service">Sort by Service Due</option>
            </select>
          </div>
        </div>

        {/* Alert Badges */}
        <div className="flex flex-wrap gap-2">
          {vehicles.filter((v) => v.tax.status !== 'paid').length > 0 && (
            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              {vehicles.filter((v) => v.tax.status !== 'paid').length} Tax Due
            </span>
          )}
          {vehicles.filter((v) => v.maintenance.oilLife < 30).length > 0 && (
            <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {vehicles.filter((v) => v.maintenance.oilLife < 30).length} Low Oil
            </span>
          )}
          {vehicles.filter((v) => v.maintenance.tireWear < 30).length > 0 && (
            <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {vehicles.filter((v) => v.maintenance.tireWear < 30).length} Tire Wear
            </span>
          )}
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">No vehicles match your filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
