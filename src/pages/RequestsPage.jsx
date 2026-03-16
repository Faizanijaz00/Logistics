import { useState } from 'react';
import { RequestForm, RequestCard } from '../components/Requests';
import { useRideRequests } from '../hooks/useRideRequests';
import { useVehicles } from '../hooks/useVehicles';

export function RequestsPage() {
  const { requests, loading, addRequest, acceptRequest, rejectRequest, getPendingRequests } =
    useRideRequests();
  const { vehicles, getActiveVehicles } = useVehicles();
  const [activeTab, setActiveTab] = useState('pending');

  const pendingRequests = getPendingRequests();
  const acceptedRequests = requests.filter((r) => r.status === 'accepted');
  const activeVehicles = getActiveVehicles();

  const handleAccept = (requestId) => {
    const availableVehicle = vehicles.find((v) => v.status === 'parked');
    if (availableVehicle) {
      acceptRequest(requestId, availableVehicle.id, 'Mike Davis');
    }
  };

  const handleSubmit = (formData) => {
    addRequest(formData);
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
        <h1 className="text-2xl font-bold">Community Ride Requests</h1>
        <p className="text-slate-500">Request rides or manage incoming requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RequestForm onSubmit={handleSubmit} />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === 'pending'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Pending ({pendingRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab('accepted')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === 'accepted'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Accepted ({acceptedRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === 'all'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All ({requests.length})
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="grid gap-4">
                {(activeTab === 'pending'
                  ? pendingRequests
                  : activeTab === 'accepted'
                  ? acceptedRequests
                  : requests
                ).map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    showActions={activeTab === 'pending'}
                    onAccept={handleAccept}
                    onReject={rejectRequest}
                  />
                ))}

                {(activeTab === 'pending' ? pendingRequests : activeTab === 'accepted' ? acceptedRequests : requests).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No {activeTab} requests
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
