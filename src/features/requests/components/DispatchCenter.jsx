import { useState } from 'react';
import { useRequestStore, useVehicleStore } from '../../../store';

// Request type icons (ASCII style)
const typeIcons = {
  shopping: '[SHOP]',
  lift: '[LIFT]',
  collection: '[COLL]',
  medical: '[MED!]',
  other: '[MISC]',
};

// Status styling
const statusConfig = {
  pending: { label: 'PENDING', class: 'status-warning' },
  accepted: { label: 'ACCEPTED', class: 'status-active' },
  in_progress: { label: 'EN ROUTE', class: 'text-cyan-400' },
  completed: { label: 'COMPLETE', class: 'opacity-50' },
  rejected: { label: 'REJECTED', class: 'status-critical' },
};

// Request Form Component
function RequestForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    requester: '',
    reason: 'shopping',
    description: '',
    pickupLocation: '',
    destination: '',
    requestedDate: '',
    requestedTime: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.requester || !formData.pickupLocation || !formData.destination) {
      return;
    }

    onSubmit({
      ...formData,
      pickupCoords: { lat: 51.505 + Math.random() * 0.01, lng: -0.09 + Math.random() * 0.01 },
      destinationCoords: { lat: 51.51 + Math.random() * 0.01, lng: -0.1 + Math.random() * 0.01 },
    });

    setFormData({
      requester: '',
      reason: 'shopping',
      description: '',
      pickupLocation: '',
      destination: '',
      requestedDate: '',
      requestedTime: '',
    });
  };

  return (
    <div className="retro-panel">
      <div className="retro-panel-header">
        <span>NEW DISPATCH REQUEST</span>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-xs opacity-70 mb-1 uppercase">REQUESTER NAME</label>
          <input
            type="text"
            value={formData.requester}
            onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
            className="retro-input w-full"
            placeholder="ENTER NAME..."
            required
          />
        </div>

        <div>
          <label className="block text-xs opacity-70 mb-1 uppercase">REQUEST TYPE</label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(typeIcons).map(([key, icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormData({ ...formData, reason: key })}
                className={`retro-btn text-xs py-2 ${
                  formData.reason === key ? 'border-glow' : ''
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs opacity-70 mb-1 uppercase">DESCRIPTION</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="retro-input w-full h-20 resize-none"
            placeholder="ENTER DETAILS..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs opacity-70 mb-1 uppercase">[A] PICKUP</label>
            <input
              type="text"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              className="retro-input w-full"
              placeholder="LOCATION..."
              required
            />
          </div>
          <div>
            <label className="block text-xs opacity-70 mb-1 uppercase">[B] DESTINATION</label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              className="retro-input w-full"
              placeholder="LOCATION..."
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs opacity-70 mb-1 uppercase">DATE</label>
            <input
              type="date"
              value={formData.requestedDate}
              onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
              className="retro-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-xs opacity-70 mb-1 uppercase">TIME</label>
            <input
              type="time"
              value={formData.requestedTime}
              onChange={(e) => setFormData({ ...formData, requestedTime: e.target.value })}
              className="retro-input w-full"
              required
            />
          </div>
        </div>

        <button type="submit" className="retro-btn retro-btn-beveled w-full py-3 text-lg">
          [SUBMIT REQUEST]
        </button>
      </form>
    </div>
  );
}

// Request Card Component
function RequestCard({ request, onAccept, onReject, onStart, onComplete }) {
  const status = statusConfig[request.status] || statusConfig.pending;

  return (
    <div className="retro-panel mb-4">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 pb-3 border-b border-green-900">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-glow-amber">
              {typeIcons[request.reason]}
            </span>
            <div>
              <div className="font-bold">{request.requester}</div>
              <div className="text-xs opacity-70">
                {new Date(request.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          <span className={`text-sm font-bold ${status.class}`}>
            [{status.label}]
          </span>
        </div>

        {/* Description */}
        {request.description && (
          <div className="text-sm mb-3 opacity-80 italic">
            "{request.description}"
          </div>
        )}

        {/* Route */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-xs opacity-50">[A] FROM:</span>
            <div className="font-mono">{request.pickupLocation}</div>
          </div>
          <div>
            <span className="text-xs opacity-50">[B] TO:</span>
            <div className="font-mono">{request.destination}</div>
          </div>
        </div>

        {/* Date/Time */}
        <div className="flex gap-4 text-sm mb-4">
          <div>
            <span className="opacity-50">DATE:</span> {request.requestedDate}
          </div>
          <div>
            <span className="opacity-50">TIME:</span> {request.requestedTime}
          </div>
        </div>

        {/* Assigned Driver */}
        {request.assignedDriver && (
          <div className="text-sm mb-4 p-2 bg-green-950/50 border border-green-900">
            <span className="opacity-50">ASSIGNED:</span>{' '}
            <span className="font-bold">{request.assignedDriver}</span>
          </div>
        )}

        {/* Actions */}
        {request.status === 'pending' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onAccept?.(request.id)}
              className="retro-btn retro-btn-beveled py-2 text-sm"
            >
              [ACCEPT]
            </button>
            <button
              onClick={() => onReject?.(request.id)}
              className="retro-btn retro-btn-beveled retro-btn-danger py-2 text-sm"
            >
              [REJECT]
            </button>
          </div>
        )}

        {request.status === 'accepted' && (
          <button
            onClick={() => onStart?.(request.id)}
            className="retro-btn retro-btn-beveled w-full py-2 text-sm"
          >
            [START DISPATCH]
          </button>
        )}

        {request.status === 'in_progress' && (
          <button
            onClick={() => onComplete?.(request.id)}
            className="retro-btn retro-btn-beveled w-full py-2 text-sm"
          >
            [MARK COMPLETE]
          </button>
        )}
      </div>
    </div>
  );
}

// Main DispatchCenter Component
export function DispatchCenter() {
  const {
    requests,
    addRequest,
    acceptRequest,
    rejectRequest,
    startTrip,
    completeRequest,
  } = useRequestStore();
  const { vehicles } = useVehicleStore();

  const [activeTab, setActiveTab] = useState('pending');

  const tabs = [
    { id: 'pending', label: 'QUEUE', count: requests.filter((r) => r.status === 'pending').length },
    { id: 'accepted', label: 'ASSIGNED', count: requests.filter((r) => r.status === 'accepted').length },
    { id: 'in_progress', label: 'ACTIVE', count: requests.filter((r) => r.status === 'in_progress').length },
    { id: 'completed', label: 'ARCHIVE', count: requests.filter((r) => r.status === 'completed').length },
  ];

  const filteredRequests = requests.filter((r) => r.status === activeTab);

  const handleAccept = (requestId) => {
    const availableVehicle = vehicles.find((v) => v.status === 'parked');
    if (availableVehicle) {
      acceptRequest(requestId, availableVehicle.id, 'Dispatch Driver');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Request Form */}
      <div className="lg:col-span-1">
        <RequestForm onSubmit={addRequest} />
      </div>

      {/* Request Board */}
      <div className="lg:col-span-2">
        <div className="retro-panel">
          <div className="retro-panel-header flex justify-between items-center">
            <span>DISPATCH BOARD</span>
            <span className="text-xs opacity-70">
              {requests.length} TOTAL REQUESTS
            </span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-green-900">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-950/50 text-green-400 border-b-2 border-green-500'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-green-900 text-xs rounded">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Request List */}
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAccept}
                  onReject={rejectRequest}
                  onStart={startTrip}
                  onComplete={completeRequest}
                />
              ))
            ) : (
              <div className="text-center py-12 opacity-50">
                <div className="text-2xl mb-2">[EMPTY]</div>
                <div className="text-sm">NO {activeTab.toUpperCase().replace('_', ' ')} REQUESTS</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-green-900 text-xs opacity-50 text-center">
            COMMUNITY DISPATCH SYSTEM v1.4
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatchCenter;
