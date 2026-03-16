import { useState } from 'react';
import { RequestForm, RequestCard } from './components';
import { useRequestStore, useVehicleStore } from '../../store';
import { Clock, CheckCircle, Car } from 'lucide-react';

export function RequestsPage() {
  const {
    requests,
    addRequest,
    acceptRequest,
    rejectRequest,
    startTrip,
    completeRequest,
    getPendingRequests,
    getAcceptedRequests,
    getInProgressRequests,
  } = useRequestStore();

  const { vehicles } = useVehicleStore();
  const [activeTab, setActiveTab] = useState('pending');

  const pendingRequests = getPendingRequests();
  const acceptedRequests = getAcceptedRequests();
  const inProgressRequests = getInProgressRequests();
  const completedRequests = requests.filter((r) => r.status === 'completed');

  const handleAccept = (requestId) => {
    const availableVehicle = vehicles.find((v) => v.status === 'parked');
    if (availableVehicle) {
      acceptRequest(requestId, availableVehicle.id, 'Mike Davis');
    } else {
      alert('No vehicles available at the moment');
    }
  };

  const handleStart = (requestId) => {
    startTrip(requestId);
  };

  const handleComplete = (requestId) => {
    completeRequest(requestId);
  };

  const getFilteredRequests = () => {
    switch (activeTab) {
      case 'pending':
        return pendingRequests;
      case 'accepted':
        return acceptedRequests;
      case 'in_progress':
        return inProgressRequests;
      case 'completed':
        return completedRequests;
      default:
        return requests;
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: pendingRequests.length, icon: Clock },
    { id: 'accepted', label: 'Accepted', count: acceptedRequests.length, icon: CheckCircle },
    { id: 'in_progress', label: 'In Progress', count: inProgressRequests.length, icon: Car },
    { id: 'completed', label: 'Completed', count: completedRequests.length, icon: CheckCircle },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4' }}>
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px 40px',
          borderBottom: '1px solid #e0e0e0',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '18px',
            fontWeight: '500',
            margin: 0,
            color: '#000000',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Requests
        </h1>
      </div>

      <div style={{ padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '32px' }}>
          {/* Request Form */}
          <div>
            <RequestForm onSubmit={addRequest} />
          </div>

          {/* Requests Dashboard */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Tabs - Porsche style */}
            <div style={{ borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex' }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1,
                        padding: '16px 24px',
                        fontSize: '14px',
                        fontWeight: '400',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: isActive ? '2px solid #000000' : '2px solid transparent',
                        color: isActive ? '#000000' : '#626669',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <Icon style={{ width: '16px', height: '16px' }} />
                      {tab.label}
                      {tab.count > 0 && (
                        <span
                          style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: isActive ? '#000000' : '#f0f0f0',
                            color: isActive ? '#ffffff' : '#626669',
                            borderRadius: '10px',
                          }}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Request List */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {getFilteredRequests().map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    showActions={['pending', 'accepted', 'in_progress'].includes(activeTab)}
                    onAccept={handleAccept}
                    onReject={rejectRequest}
                    onStart={handleStart}
                    onComplete={handleComplete}
                  />
                ))}

                {getFilteredRequests().length === 0 && (
                  <div style={{ textAlign: 'center', padding: '64px 24px', color: '#626669' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        background: '#f4f4f4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                      }}
                    >
                      {activeTab === 'pending' ? (
                        <Clock style={{ width: '28px', height: '28px' }} />
                      ) : activeTab === 'completed' ? (
                        <CheckCircle style={{ width: '28px', height: '28px' }} />
                      ) : (
                        <Car style={{ width: '28px', height: '28px' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: '500', color: '#323639', margin: 0 }}>
                      No {activeTab.replace('_', ' ')} requests
                    </p>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>
                      {activeTab === 'pending'
                        ? 'New requests will appear here'
                        : 'Complete more rides to see them here'}
                    </p>
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
