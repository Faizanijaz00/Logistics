import { useState } from 'react';
import { useParkingStore } from '../../store';
import { Plus, Trash2, MapPin, Clock, X } from 'lucide-react';
import { LiveMap } from '../map/components/LiveMap';

const statusOptions = [
  { value: 'free', label: 'Free', color: '#018a16' },
  { value: 'risky', label: 'Risky', color: '#cc7700' },
  { value: 'high-risk', label: 'High Risk', color: '#c4001a' },
  { value: 'private', label: 'Private', color: '#c4001a' },
];

export function ParkingPage() {
  const { zones, addZone, removeZone, getAvailableSpots } = useParkingStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'free',
    capacity: 10,
    occupied: 0,
    hours: '24/7',
    description: '',
    permitRequired: false,
  });

  const totalSpots = zones.reduce((acc, z) => acc + z.capacity, 0);
  const availableSpots = getAvailableSpots();
  const occupiedSpots = totalSpots - availableSpots;

  const handleSubmit = (e) => {
    e.preventDefault();
    addZone({
      ...formData,
      bounds: [
        [51.505 + Math.random() * 0.01, -0.09 + Math.random() * 0.01],
        [51.505 + Math.random() * 0.01, -0.085 + Math.random() * 0.01],
        [51.507 + Math.random() * 0.01, -0.085 + Math.random() * 0.01],
        [51.507 + Math.random() * 0.01, -0.09 + Math.random() * 0.01],
      ],
    });
    setFormData({
      name: '',
      status: 'free',
      capacity: 10,
      occupied: 0,
      hours: '24/7',
      description: '',
      permitRequired: false,
    });
    setShowAddForm(false);
  };

  const handleDelete = (zoneId) => {
    if (confirm('Are you sure you want to remove this parking zone?')) {
      removeZone(zoneId);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      free: '#018a16',
      risky: '#cc7700',
      'high-risk': '#c4001a',
      private: '#c4001a',
    };
    return colors[status] || '#626669';
  };

  const getStatusBg = (status) => {
    const colors = {
      free: 'rgba(1, 138, 22, 0.08)',
      risky: 'rgba(204, 119, 0, 0.08)',
      'high-risk': 'rgba(196, 0, 26, 0.08)',
      private: 'rgba(196, 0, 26, 0.08)',
    };
    return colors[status] || '#f4f4f4';
  };

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
          Parking
        </h1>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', padding: '24px 40px', gap: '24px' }}>
        {/* Left Panel - Stats & Zone List */}
        <div
          style={{
            width: '360px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          {/* Stats */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '4px',
              padding: '20px',
              border: '1px solid #e0e0e0',
            }}
          >
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '32px', fontWeight: '400', color: '#000000', margin: 0 }}>
                  {zones.length}
                </p>
                <p style={{ fontSize: '12px', color: '#626669', margin: '4px 0 0' }}>Zones</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '32px', fontWeight: '400', color: '#018a16', margin: 0 }}>
                  {availableSpots}
                </p>
                <p style={{ fontSize: '12px', color: '#626669', margin: '4px 0 0' }}>Available</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '32px', fontWeight: '400', color: '#cc7700', margin: 0 }}>
                  {occupiedSpots}
                </p>
                <p style={{ fontSize: '12px', color: '#626669', margin: '4px 0 0' }}>Occupied</p>
              </div>
            </div>
          </div>

          {/* Add Zone Button */}
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#ffffff',
              background: '#000000',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            Add Parking Zone
          </button>

          {/* Zone List */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
              overflow: 'hidden',
              flex: 1,
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 380px)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e0e0e0',
                background: '#f4f4f4',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#626669',
                  margin: 0,
                  letterSpacing: '0.05em',
                }}
              >
                PARKING ZONES
              </p>
            </div>

            {zones.map((zone) => (
              <div
                key={zone.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getStatusColor(zone.status),
                    marginTop: '6px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#000000', margin: 0 }}>
                    {zone.name}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '500',
                        padding: '2px 8px',
                        borderRadius: '2px',
                        background: getStatusBg(zone.status),
                        color: getStatusColor(zone.status),
                        textTransform: 'capitalize',
                      }}
                    >
                      {zone.status.replace('-', ' ')}
                    </span>
                    <span style={{ fontSize: '12px', color: '#626669' }}>
                      {zone.capacity - zone.occupied} / {zone.capacity} spots
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '8px',
                    }}
                  >
                    <Clock style={{ width: '12px', height: '12px', color: '#626669' }} />
                    <span style={{ fontSize: '12px', color: '#626669' }}>{zone.hours}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(zone.id)}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#626669',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(196, 0, 26, 0.08)';
                    e.currentTarget.style.color = '#c4001a';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#626669';
                  }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            ))}

            {zones.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <MapPin style={{ width: '32px', height: '32px', color: '#c9cacb', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', color: '#626669', margin: 0 }}>No parking zones</p>
                <p style={{ fontSize: '12px', color: '#c9cacb', marginTop: '4px' }}>
                  Add a zone to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            style={{
              height: '450px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              background: '#ffffff',
            }}
          >
            <LiveMap
              vehicles={[]}
              parkingZones={zones}
              filters={{
                showActiveVehicles: false,
                showParkedVehicles: false,
                showRoutes: false,
                showParkingZones: true,
                selectedZoneStatus: 'all',
              }}
            />
          </div>

          {/* Legend */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              zIndex: 1000,
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '16px 20px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#626669',
                marginBottom: '12px',
                letterSpacing: '0.05em',
              }}
            >
              ZONE STATUS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              {statusOptions.map((opt) => (
                <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: opt.color,
                    }}
                  />
                  <span style={{ color: '#323639' }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Zone Modal */}
      {showAddForm && (
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
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '24px',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#ffffff', margin: 0 }}>
                Add Parking Zone
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ffffff',
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Name */}
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
                    Zone Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Main Street Parking"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14px',
                      border: '1px solid #c9cacb',
                      borderRadius: '2px',
                      background: '#ffffff',
                    }}
                  />
                </div>

                {/* Status */}
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
                    Status
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: opt.value })}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          fontSize: '13px',
                          fontWeight: '400',
                          background: formData.status === opt.value ? '#000000' : 'transparent',
                          color: formData.status === opt.value ? '#ffffff' : '#323639',
                          border: `1px solid ${formData.status === opt.value ? '#000000' : '#c9cacb'}`,
                          borderRadius: '2px',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capacity & Occupied */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                      Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '14px',
                        border: '1px solid #c9cacb',
                        borderRadius: '2px',
                        background: '#ffffff',
                      }}
                    />
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
                      Currently Occupied
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.occupied}
                      onChange={(e) => setFormData({ ...formData, occupied: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '14px',
                        border: '1px solid #c9cacb',
                        borderRadius: '2px',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                </div>

                {/* Hours */}
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
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="e.g. 24/7 or 8am-6pm"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14px',
                      border: '1px solid #c9cacb',
                      borderRadius: '2px',
                      background: '#ffffff',
                    }}
                  />
                </div>

                {/* Permit Required */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.permitRequired}
                    onChange={(e) => setFormData({ ...formData, permitRequired: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#000000' }}
                  />
                  <span style={{ fontSize: '14px', color: '#323639' }}>Permit Required</span>
                </label>

                {/* Submit */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
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
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: '#000000',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    Add Zone
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParkingPage;
