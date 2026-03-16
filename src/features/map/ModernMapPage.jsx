import { useState, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { LiveMap } from './components/LiveMap';
import { useVehicleStore, useParkingStore, useSavedLocationStore } from '../../store';
import { Layers, ChevronDown, MapPin, X, Plus, Trash2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function ModernMapPage() {
  const { vehicles } = useVehicleStore();
  const { zones } = useParkingStore();
  const { locations, addLocation, removeLocation } = useSavedLocationStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [geocodeError, setGeocodeError] = useState('');
  const autocompleteRef = useRef(null);
  const mobile = useIsMobile();

  const handlePlaceSelected = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      setSelectedAddress({
        address: place.formatted_address || place.name,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
      setGeocodeError('');
    }
  };

  const handleSaveLocation = () => {
    if (!newLocationName.trim()) {
      setGeocodeError('Enter a location name.');
      return;
    }
    if (!selectedAddress) {
      setGeocodeError('Search and select an address first.');
      return;
    }
    addLocation(newLocationName.trim(), selectedAddress.address, selectedAddress.lat, selectedAddress.lng);
    setNewLocationName('');
    setSelectedAddress(null);
    setShowAddLocation(false);
    setGeocodeError('');
  };

  const [filters, setFilters] = useState({
    showActiveVehicles: true,
    showParkedVehicles: true,
    showRoutes: true,
    showParkingZones: true,
    selectedZoneStatus: 'all',
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LiveMap
        vehicles={vehicles}
        parkingZones={zones}
        filters={filters}
      />

      {/* Filter Panel — top right */}
      <div style={{ position: 'absolute', top: mobile ? '12px' : '16px', right: mobile ? '12px' : '16px', zIndex: 1000 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#000000' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers style={{ width: '16px', height: '16px', color: '#626669' }} />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Layers</span>
            </div>
            <ChevronDown style={{ width: '16px', height: '16px', color: '#626669', transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }} />
          </button>

          {showFilters && (
            <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'showActiveVehicles', label: 'Active Vehicles' },
                  { key: 'showParkedVehicles', label: 'Parked Vehicles' },
                  { key: 'showRoutes', label: 'Routes' },
                  { key: 'showParkingZones', label: 'Parking Zones' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#000000' }} />
                    <span style={{ fontSize: '14px', color: '#323639' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Locations Button — top left */}
      <button
        onClick={() => setShowLocationsModal(true)}
        style={{
          position: 'absolute',
          top: mobile ? '12px' : '16px',
          left: mobile ? '12px' : '16px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          padding: mobile ? '8px 12px' : '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
          color: '#000000',
          fontSize: mobile ? '13px' : '14px',
          fontWeight: '500',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
      >
        <MapPin style={{ width: '16px', height: '16px', color: '#626669' }} />
        {!mobile && 'Saved Locations'}
        <span style={{
          background: '#000000',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '600',
          padding: '2px 7px',
          borderRadius: '10px',
          marginLeft: mobile ? '0' : '2px',
        }}>
          {locations.length}
        </span>
      </button>

      {/* Saved Locations Modal */}
      {showLocationsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowLocationsModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: mobile ? '12px 12px 0 0' : '8px',
              width: '100%',
              maxWidth: mobile ? '100%' : '480px',
              maxHeight: mobile ? '85vh' : '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              ...(mobile ? { position: 'fixed', bottom: 0, left: 0, right: 0 } : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: mobile ? '16px' : '20px 24px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin style={{ width: '20px', height: '20px', color: '#000000' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#000000', margin: 0 }}>
                  Saved Locations
                </h3>
              </div>
              <button
                onClick={() => setShowLocationsModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
              >
                <X style={{ width: '20px', height: '20px', color: '#626669' }} />
              </button>
            </div>

            {/* Add Location Form */}
            <div style={{ padding: mobile ? '16px' : '20px 24px', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
              {!showAddLocation ? (
                <button
                  onClick={() => setShowAddLocation(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    background: '#000000',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  Add Location
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Location name (e.g. Office, Warehouse)"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: mobile ? '16px' : '14px',
                      border: '1px solid #c9cacb',
                      borderRadius: '4px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Autocomplete
                    onLoad={(ref) => (autocompleteRef.current = ref)}
                    onPlaceChanged={handlePlaceSelected}
                    options={{ componentRestrictions: { country: 'gb' } }}
                  >
                    <input
                      type="text"
                      placeholder="Search address..."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: '1px solid #c9cacb',
                        borderRadius: '4px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </Autocomplete>
                  {selectedAddress && (
                    <p style={{ fontSize: '12px', color: '#018a16', margin: 0 }}>
                      Selected: {selectedAddress.address}
                    </p>
                  )}
                  {geocodeError && (
                    <p style={{ fontSize: '12px', color: '#c4001a', margin: 0 }}>{geocodeError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setShowAddLocation(false);
                        setNewLocationName('');
                        setSelectedAddress(null);
                        setGeocodeError('');
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: 'transparent',
                        border: '1px solid #c9cacb',
                        borderRadius: '4px',
                        color: '#323639',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveLocation}
                      style={{
                        flex: 1,
                        padding: '10px',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: '#000000',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Locations List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {locations.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <MapPin style={{ width: '32px', height: '32px', color: '#c9cacb', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '14px', color: '#626669', margin: 0 }}>No saved locations yet</p>
                </div>
              ) : (
                locations.map((loc) => (
                  <div
                    key={loc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 24px',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#f4f4f4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <MapPin style={{ width: '16px', height: '16px', color: '#626669' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#000000', margin: 0 }}>
                          {loc.name}
                        </p>
                        <p style={{
                          fontSize: '12px',
                          color: '#626669',
                          margin: '2px 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {loc.address}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLocation(loc.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        flexShrink: 0,
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fff0f0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px', color: '#c4001a' }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModernMapPage;
