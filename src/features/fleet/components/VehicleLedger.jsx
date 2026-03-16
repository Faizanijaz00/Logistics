import { useState } from 'react';
import { useVehicleStore } from '../../../store';

// Status indicator component
function StatusIndicator({ status }) {
  const config = {
    active: { label: 'ONLINE', class: 'status-active' },
    parked: { label: 'STANDBY', class: 'text-green-600' },
    maintenance: { label: 'SERVICE', class: 'status-warning' },
    emergency: { label: 'ALERT', class: 'status-critical' },
  };

  const { label, class: className } = config[status] || config.parked;

  return (
    <span className={`font-bold ${className}`}>
      [{label}]
    </span>
  );
}

// Progress bar for maintenance indicators
function MaintenanceBar({ value, label }) {
  const getStatus = (val) => {
    if (val > 60) return 'good';
    if (val > 30) return 'warning';
    return 'critical';
  };

  const status = getStatus(value);
  const barClass = {
    good: 'retro-progress-bar',
    warning: 'retro-progress-bar-warning',
    critical: 'retro-progress-bar-critical',
  }[status];

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="opacity-70">{label}</span>
        <span className={status === 'critical' ? 'status-critical' : status === 'warning' ? 'status-warning' : ''}>
          {value}%
        </span>
      </div>
      <div className="retro-progress">
        <div className={barClass} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// Individual vehicle row (expandable)
function VehicleRow({ vehicle, isExpanded, onToggle }) {
  const daysUntilService = Math.ceil(
    (new Date(vehicle.maintenance.nextService) - new Date()) / (1000 * 60 * 60 * 24)
  );
  const daysUntilInsurance = Math.ceil(
    (new Date(vehicle.insurance.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-green-950/30 transition-colors"
        onClick={onToggle}
      >
        <td className="retro-table-cell">
          <span className="text-green-400">{vehicle.licensePlate}</span>
        </td>
        <td className="retro-table-cell">
          {vehicle.make} {vehicle.model}
        </td>
        <td className="retro-table-cell">{vehicle.year}</td>
        <td className="retro-table-cell">{vehicle.color}</td>
        <td className="retro-table-cell">
          <StatusIndicator status={vehicle.status} />
        </td>
        <td className="retro-table-cell">
          <span className={daysUntilService < 14 ? 'status-warning' : ''}>
            {daysUntilService}d
          </span>
        </td>
        <td className="retro-table-cell">
          <span className={daysUntilInsurance < 30 ? 'status-critical' : ''}>
            {daysUntilInsurance}d
          </span>
        </td>
        <td className="retro-table-cell text-center">
          <span className="text-green-600">{isExpanded ? '[-]' : '[+]'}</span>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="bg-green-950/20 border-t border-b border-green-900 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Specs Panel */}
                <div className="retro-panel p-4">
                  <div className="retro-panel-header mb-3">
                    <span className="text-xs">SPECIFICATIONS</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="opacity-70">MAKE:</span>
                      <span>{vehicle.make}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">MODEL:</span>
                      <span>{vehicle.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">YEAR:</span>
                      <span>{vehicle.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">COLOR:</span>
                      <span>{vehicle.color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">PERMIT:</span>
                      <span>{vehicle.parkingPermit || 'NONE'}</span>
                    </div>
                  </div>
                </div>

                {/* Maintenance Panel */}
                <div className="retro-panel p-4">
                  <div className="retro-panel-header mb-3">
                    <span className="text-xs">MAINTENANCE</span>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="opacity-70">NEXT SERVICE:</span>
                        <span className={daysUntilService < 14 ? 'status-warning' : ''}>
                          {vehicle.maintenance.nextService}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">COST EST:</span>
                        <span>£{vehicle.maintenance.serviceCost}</span>
                      </div>
                    </div>
                    <MaintenanceBar value={vehicle.maintenance.tireWear} label="TIRE HEALTH" />
                    <MaintenanceBar value={vehicle.maintenance.oilLife} label="OIL LIFE" />
                  </div>
                </div>

                {/* Financials Panel */}
                <div className="retro-panel p-4">
                  <div className="retro-panel-header mb-3">
                    <span className="text-xs">FINANCIALS</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="border-b border-green-900 pb-2 mb-2">
                      <div className="text-xs opacity-70 mb-1">INSURANCE</div>
                      <div className="flex justify-between">
                        <span>{vehicle.insurance.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">EXPIRES:</span>
                        <span className={daysUntilInsurance < 30 ? 'status-critical' : ''}>
                          {vehicle.insurance.expiryDate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">ANNUAL:</span>
                        <span>£{vehicle.insurance.annualCost}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs opacity-70 mb-1">ROAD TAX</div>
                      <div className="flex justify-between">
                        <span className="opacity-70">STATUS:</span>
                        <span className={vehicle.tax.status !== 'paid' ? 'status-critical' : 'status-active'}>
                          [{vehicle.tax.status.toUpperCase()}]
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">EXPIRES:</span>
                        <span>{vehicle.tax.expiryDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">ANNUAL:</span>
                        <span>£{vehicle.tax.annualCost}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Main VehicleLedger Component
export function VehicleLedger() {
  const { vehicles } = useVehicleStore();
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('plate');

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  // Sort vehicles
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    switch (sortBy) {
      case 'plate':
        return a.licensePlate.localeCompare(b.licensePlate);
      case 'make':
        return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'service':
        return new Date(a.maintenance.nextService) - new Date(b.maintenance.nextService);
      case 'insurance':
        return new Date(a.insurance.expiryDate) - new Date(b.insurance.expiryDate);
      default:
        return 0;
    }
  });

  // Calculate fleet stats
  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === 'active').length,
    needsAttention: vehicles.filter((v) =>
      v.maintenance.oilLife < 30 || v.maintenance.tireWear < 30 || v.tax.status !== 'paid'
    ).length,
  };

  return (
    <div className="retro-panel">
      {/* Header */}
      <div className="retro-panel-header flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold tracking-wider">FLEET REGISTRY</span>
          <span className="text-xs opacity-70">
            {stats.total} UNITS | {stats.active} ACTIVE | {stats.needsAttention} ALERTS
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="opacity-70">LAST SYNC:</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-green-900 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">FILTER:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="retro-select text-sm py-1"
          >
            <option value="all">ALL UNITS</option>
            <option value="active">ACTIVE</option>
            <option value="parked">STANDBY</option>
            <option value="maintenance">SERVICE</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">SORT:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="retro-select text-sm py-1"
          >
            <option value="plate">PLATE</option>
            <option value="make">MAKE/MODEL</option>
            <option value="status">STATUS</option>
            <option value="service">SERVICE DUE</option>
            <option value="insurance">INSURANCE</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="retro-table w-full">
          <thead>
            <tr>
              <th className="retro-table-header">PLATE</th>
              <th className="retro-table-header">MAKE/MODEL</th>
              <th className="retro-table-header">YEAR</th>
              <th className="retro-table-header">COLOR</th>
              <th className="retro-table-header">STATUS</th>
              <th className="retro-table-header">SERVICE</th>
              <th className="retro-table-header">INSUR.</th>
              <th className="retro-table-header w-12">EXP</th>
            </tr>
          </thead>
          <tbody>
            {sortedVehicles.map((vehicle) => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                isExpanded={expandedId === vehicle.id}
                onToggle={() => setExpandedId(expandedId === vehicle.id ? null : vehicle.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {sortedVehicles.length === 0 && (
        <div className="p-8 text-center opacity-50">
          <div className="terminal-prompt">NO MATCHING RECORDS</div>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-green-900 text-xs flex justify-between opacity-70">
        <span>PRESS [+] TO EXPAND VEHICLE DETAILS</span>
        <span>FLEET MANAGEMENT SYSTEM v2.1</span>
      </div>
    </div>
  );
}

export default VehicleLedger;
