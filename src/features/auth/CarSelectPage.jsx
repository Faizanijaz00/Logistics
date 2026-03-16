import { useState, useEffect } from 'react';
import { useAuthStore, useVehicleStore, useCarImageStore } from '../../store';
import { Loader2, ArrowRight } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function CarSelectPage() {
  const { user, selectVehicle, fetchUsers, logout, setCarSelectReady } = useAuthStore();
  const { vehicles } = useVehicleStore();
  const { images: carImages } = useCarImageStore();
  const [allUsers, setAllUsers] = useState([]);
  const [selecting, setSelecting] = useState(null);
  const mobile = useIsMobile();

  useEffect(() => {
    fetchUsers().then(setAllUsers);
  }, [fetchUsers]);

  const getDriver = (vehicleId) => {
    return allUsers.find(u => u.selectedVehicleId === vehicleId);
  };

  const getCarImage = (vehicle) => {
    if (!vehicle.imageId) return null;
    return carImages?.find(img => img.id === vehicle.imageId)?.url || null;
  };

  const handleSelect = async (vehicleId) => {
    setSelecting(vehicleId);
    const previousVehicleId = user?.selectedVehicleId;
    await selectVehicle(vehicleId);

    // Bridge auth → vehicle store
    const { assignDriver, clearDriver } = useVehicleStore.getState();
    if (previousVehicleId && previousVehicleId !== '__skip__' && previousVehicleId !== vehicleId) {
      clearDriver(previousVehicleId);
    }
    assignDriver(vehicleId, user.name, null);

    const updated = await fetchUsers();
    setAllUsers(updated);
    setSelecting(null);
  };

  const handleContinue = () => {
    setCarSelectReady(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4f4f4',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          padding: mobile ? '16px' : '20px 40px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
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
            Fleet Hub
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {user?.name}
          </span>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              background: 'transparent',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              color: '#666',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#666'; }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: mobile ? '24px 16px' : '48px 40px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: mobile ? '24px' : '40px' }}>
            <h2
              style={{
                fontSize: mobile ? '20px' : '24px',
                fontWeight: '500',
                color: '#000',
                margin: '0 0 8px',
              }}
            >
              Select Your Car
            </h2>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              Choose the vehicle you are driving today
            </p>
          </div>

          {/* Vehicle Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: mobile ? '12px' : '16px',
            }}
          >
            {vehicles.map((vehicle) => {
              const driver = getDriver(vehicle.id);
              const isMySelection = driver?.id === user?.id;
              const image = getCarImage(vehicle);

              return (
                <button
                  key={vehicle.id}
                  onClick={() => handleSelect(vehicle.id)}
                  disabled={selecting !== null}
                  style={{
                    background: isMySelection ? '#f0f0f0' : '#ffffff',
                    border: isMySelection ? '2px solid #000' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: mobile ? '16px 12px' : '24px 20px',
                    cursor: selecting !== null ? 'wait' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    transform: selecting === vehicle.id ? 'scale(0.98)' : 'none',
                    boxShadow: isMySelection ? '0 4px 16px rgba(0,0,0,0.1)' : 'none',
                  }}
                  onMouseOver={(e) => {
                    if (!isMySelection) {
                      e.currentTarget.style.borderColor = '#000';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isMySelection) {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {/* Car image */}
                  <div style={{ height: mobile ? '70px' : '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: mobile ? '10px' : '16px' }}>
                    {image ? (
                      <img
                        src={image}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        style={{ maxWidth: '100%', maxHeight: mobile ? '70px' : '100px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ width: mobile ? '56px' : '80px', height: mobile ? '56px' : '80px', borderRadius: '50%', background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: mobile ? '22px' : '28px', color: '#ccc' }}>🚗</span>
                      </div>
                    )}
                  </div>

                  {/* Vehicle info */}
                  <p style={{ fontSize: mobile ? '14px' : '16px', fontWeight: '600', color: '#000', margin: '0 0 4px' }}>
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p style={{ fontSize: mobile ? '11px' : '13px', color: '#666', margin: mobile ? '0 0 8px' : '0 0 12px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                    {vehicle.licensePlate}
                  </p>

                  {/* Driver status */}
                  {selecting === vehicle.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '12px', color: '#000', fontWeight: '500' }}>Selecting...</span>
                    </div>
                  ) : isMySelection ? (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#fff',
                        background: '#000',
                        padding: '4px 12px',
                        borderRadius: '12px',
                      }}
                    >
                      YOUR CAR
                    </span>
                  ) : driver ? (
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      Driven by <span style={{ fontWeight: '500', color: '#666' }}>{driver.name}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#ccc' }}>Available</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Continue / Not Driving */}
          <div style={{ textAlign: 'center', marginTop: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {user?.selectedVehicleId && (
              <button
                onClick={handleContinue}
                style={{
                  padding: '14px 48px',
                  fontSize: '15px',
                  fontWeight: '500',
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#000')}
              >
                Continue
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </button>
            )}
            <button
              onClick={() => {
                useAuthStore.setState(s => ({ user: { ...s.user, selectedVehicleId: '__skip__' }, carSelectReady: true }));
              }}
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: '500',
                background: 'transparent',
                border: '1px solid #d1d1d1',
                borderRadius: '4px',
                color: '#666',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#666'; }}
            >
              Not Driving
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default CarSelectPage;
