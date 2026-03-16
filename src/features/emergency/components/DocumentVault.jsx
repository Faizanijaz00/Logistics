import { FileText, Download, ExternalLink, Calendar, Shield, Upload, CheckCircle } from 'lucide-react';
import { useVehicleStore } from '../../../store';

const requiredDocuments = [
  { type: 'insurance', label: 'Insurance Certificate', required: true },
  { type: 'registration', label: 'Vehicle Registration', required: true },
  { type: 'mot', label: 'MOT Certificate', required: true },
  { type: 'tax', label: 'Road Tax', required: true },
  { type: 'permit', label: 'Parking Permit', required: false },
];

export function DocumentVault() {
  const { vehicles } = useVehicleStore();

  const getDocumentStatus = (vehicle, docType) => {
    if (docType === 'insurance') {
      const expiry = new Date(vehicle.insurance.expiryDate);
      const now = new Date();
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) return { status: 'expired', color: 'danger' };
      if (daysLeft < 30) return { status: 'expiring', color: 'warning' };
      return { status: 'valid', color: 'success' };
    }
    if (docType === 'tax') {
      if (vehicle.tax.status === 'overdue') return { status: 'expired', color: 'danger' };
      if (vehicle.tax.status === 'due') return { status: 'expiring', color: 'warning' };
      return { status: 'valid', color: 'success' };
    }
    return { status: 'valid', color: 'success' };
  };

  const getStatusClasses = (color) => {
    switch (color) {
      case 'success':
        return 'badge-success';
      case 'warning':
        return 'badge-warning';
      case 'danger':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div className="card overflow-hidden">
      <div
        className="p-5"
        style={{
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Document Vault
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              All vehicle documents in one place
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Checklist */}
        <div
          className="mb-5 p-4 rounded-lg"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <h3
            className="font-medium text-sm mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Required Documents Checklist
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {requiredDocuments.map((doc) => (
              <div
                key={doc.type}
                className="flex items-center gap-2 p-2 rounded-md text-xs"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--status-success)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>{doc.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Documents */}
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {vehicle.make} {vehicle.model}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {vehicle.licensePlate}
                  </p>
                </div>
                <span
                  className={`badge ${
                    vehicle.status === 'active'
                      ? 'badge-success'
                      : vehicle.status === 'maintenance'
                      ? 'badge-warning'
                      : 'badge-neutral'
                  }`}
                >
                  {vehicle.status}
                </span>
              </div>

              <div className="p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Insurance Document */}
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      background: 'var(--status-info-bg)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" style={{ color: 'var(--status-info)' }} />
                        <span
                          className="font-medium text-sm"
                          style={{ color: 'var(--status-info)' }}
                        >
                          Insurance
                        </span>
                      </div>
                      {(() => {
                        const { status, color } = getDocumentStatus(vehicle, 'insurance');
                        return <span className={`badge ${getStatusClasses(color)}`}>{status}</span>;
                      })()}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                      {vehicle.insurance.provider}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Expires: {vehicle.insurance.expiryDate}
                    </p>
                    <div className="flex gap-3 mt-2">
                      <a
                        href={vehicle.insurance.documentUrl}
                        className="text-xs flex items-center gap-1"
                        style={{ color: 'var(--status-info)' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                      <button
                        className="text-xs flex items-center gap-1"
                        style={{ color: 'var(--status-info)' }}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Tax Document */}
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      background: 'var(--status-success-bg)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: 'var(--status-success)' }} />
                        <span
                          className="font-medium text-sm"
                          style={{ color: 'var(--status-success)' }}
                        >
                          Road Tax
                        </span>
                      </div>
                      {(() => {
                        const { color } = getDocumentStatus(vehicle, 'tax');
                        return (
                          <span className={`badge ${getStatusClasses(color)}`}>
                            {vehicle.tax.status}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                      Expires: {vehicle.tax.expiryDate}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Annual Cost: £{vehicle.tax.annualCost}
                    </p>
                  </div>

                  {/* Upload New */}
                  <div
                    className="p-3 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors"
                    style={{
                      border: '2px dashed var(--border-default)',
                      color: 'var(--text-muted)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs">Upload Document</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
