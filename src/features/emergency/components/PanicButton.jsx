import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useVehicleStore, useEmergencyStore } from '../../../store';

export function PanicButton({ compact = false }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [emergencyType, setEmergencyType] = useState('police_stop');
  const [isConfirming, setIsConfirming] = useState(false);

  const { vehicles } = useVehicleStore();
  const { triggerEmergency, isEmergencyMode } = useEmergencyStore();

  const handleTrigger = () => {
    if (!selectedVehicle) return;
    setIsConfirming(true);
  };

  const confirmEmergency = () => {
    triggerEmergency(selectedVehicle, emergencyType);
    setIsConfirming(false);
    setSelectedVehicle('');
  };

  if (isEmergencyMode) {
    return null;
  }

  // Compact version for horizontal bar
  if (compact) {
    return (
      <>
        <div
          style={{
            background: '#c4001a',
            borderRadius: '4px',
            padding: '16px 20px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: '#ffffff' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
              Emergency Alert
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                border: 'none',
                borderRadius: '2px',
                background: 'rgba(255,255,255,0.9)',
                color: '#000000',
              }}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model}
                </option>
              ))}
            </select>
            <button
              onClick={handleTrigger}
              disabled={!selectedVehicle}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                background: selectedVehicle ? '#ffffff' : 'rgba(255,255,255,0.5)',
                color: '#c4001a',
                border: 'none',
                borderRadius: '2px',
                cursor: selectedVehicle ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              ALERT
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {isConfirming && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
              background: 'rgba(0,0,0,0.7)',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '100%',
                padding: '32px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '4px',
                    background: 'rgba(196, 0, 26, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <AlertTriangle style={{ width: '28px', height: '28px', color: '#c4001a' }} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '400', color: '#000000', margin: '0 0 8px' }}>
                  Confirm Emergency
                </h3>
                <p style={{ fontSize: '14px', color: '#626669', marginBottom: '24px' }}>
                  This will broadcast an alert to all community members. Are you sure?
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsConfirming(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '400',
                    background: 'transparent',
                    color: '#323639',
                    border: '1px solid #c9cacb',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEmergency}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    background: '#c4001a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  CONFIRM
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full version
  return (
    <>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            background: '#c4001a',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertTriangle style={{ width: '32px', height: '32px', color: '#ffffff' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '400', color: '#ffffff', margin: 0 }}>
            Emergency Panic Button
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
            Quick access to documents & community alert
          </p>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#323639',
                marginBottom: '8px',
              }}
            >
              Select Vehicle
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                color: '#000000',
                background: '#ffffff',
                border: '1px solid #c9cacb',
                borderRadius: '2px',
              }}
            >
              <option value="">Choose a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} - {v.licensePlate}
                  {v.currentDriver ? ` (${v.currentDriver})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#323639',
                marginBottom: '8px',
              }}
            >
              Emergency Type
            </label>
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                color: '#000000',
                background: '#ffffff',
                border: '1px solid #c9cacb',
                borderRadius: '2px',
              }}
            >
              <option value="police_stop">Police Stop</option>
              <option value="accident">Accident</option>
              <option value="breakdown">Breakdown</option>
              <option value="medical">Medical Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            onClick={handleTrigger}
            disabled={!selectedVehicle}
            style={{
              width: '100%',
              padding: '14px 32px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#ffffff',
              background: selectedVehicle ? '#c4001a' : 'rgba(196, 0, 26, 0.5)',
              border: 'none',
              borderRadius: '2px',
              cursor: selectedVehicle ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle style={{ width: '18px', height: '18px' }} />
            TRIGGER EMERGENCY
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#626669' }}>
            This will alert all community members and provide instant document access
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirming && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            background: 'rgba(0,0,0,0.7)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '4px',
                  background: 'rgba(196, 0, 26, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertTriangle style={{ width: '28px', height: '28px', color: '#c4001a' }} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '400', color: '#000000', margin: '0 0 8px' }}>
                Confirm Emergency
              </h3>
              <p style={{ fontSize: '14px', color: '#626669', marginBottom: '24px' }}>
                This will broadcast an alert to all community members. Are you sure?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsConfirming(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '400',
                  background: 'transparent',
                  color: '#323639',
                  border: '1px solid #c9cacb',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmEmergency}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: '#c4001a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
