import {
  MapPin,
  Calendar,
  Clock,
  User,
  ShoppingCart,
  Car,
  Package,
  Stethoscope,
  FileText,
  Check,
  X,
  Play,
} from 'lucide-react';

const reasonConfig = {
  shopping: { icon: ShoppingCart, color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  lift: { icon: Car, color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
  collection: { icon: Package, color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
  medical: { icon: Stethoscope, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' },
  other: { icon: FileText, color: 'var(--text-secondary)', bg: 'var(--bg-tertiary)' },
};

const statusConfig = {
  pending: { label: 'Pending', className: 'badge-warning' },
  accepted: { label: 'Accepted', className: 'badge-info' },
  in_progress: { label: 'In Progress', className: 'badge-info' },
  completed: { label: 'Completed', className: 'badge-success' },
  rejected: { label: 'Rejected', className: 'badge-danger' },
};

export function RequestCard({
  request,
  showActions = false,
  onAccept,
  onReject,
  onStart,
  onComplete,
}) {
  const reason = reasonConfig[request.reason] || reasonConfig.other;
  const status = statusConfig[request.status] || statusConfig.pending;
  const ReasonIcon = reason.icon;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: reason.bg }}
          >
            <ReasonIcon className="w-5 h-5" style={{ color: reason.color }} />
          </div>
          <div>
            <p className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
              {request.reason.replace('_', ' ')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Requester */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {request.requester}
          </span>
        </div>

        {/* Description */}
        {request.description && (
          <p
            className="text-sm p-3 rounded-md"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
            }}
          >
            {request.description}
          </p>
        )}

        {/* Route */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-success)' }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>From</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {request.pickupLocation}
              </p>
            </div>
          </div>
          <div
            className="ml-2 h-4"
            style={{ borderLeft: '2px dashed var(--border-default)' }}
          />
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-danger)' }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>To</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {request.destination}
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(request.requestedDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{request.requestedTime}</span>
          </div>
        </div>

        {/* Assigned Driver */}
        {request.assignedDriver && (
          <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Assigned to</p>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {request.assignedDriver}
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {request.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept?.(request.id)}
                  className="btn btn-success flex-1 py-2.5"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => onReject?.(request.id)}
                  className="btn btn-danger flex-1 py-2.5"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}

            {request.status === 'accepted' && (
              <button
                onClick={() => onStart?.(request.id)}
                className="btn btn-primary w-full py-2.5"
              >
                <Play className="w-4 h-4" />
                Start Trip
              </button>
            )}

            {request.status === 'in_progress' && (
              <button
                onClick={() => onComplete?.(request.id)}
                className="btn btn-primary w-full py-2.5"
              >
                <Check className="w-4 h-4" />
                Complete Trip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
