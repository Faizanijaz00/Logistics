import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicleStore, useActivityStore, useAuthStore, useSavedLocationStore } from '../../store';
import { MapPin, MapPinned, Users, ParkingSquare, Crosshair, Check, Loader2, UserPlus, Trash2, ArrowLeft, Car, Fuel, Clock, Activity, Calendar, Eye } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

const activityTypeConfig = {
  driver_assigned: { color: '#22c55e', label: 'Started driving' },
  driver_cleared: { color: '#9ca3af', label: 'Stopped driving' },
  route_set: { color: '#0061bd', label: 'Route set' },
  route_cleared: { color: '#f59e0b', label: 'Route cleared' },
  status_changed: { color: '#cc7700', label: 'Status changed' },
  destination_set: { color: '#7c3aed', label: 'Destination set' },
  fuel_added: { color: '#f97316', label: 'Fuel up' },
};

function formatRelativeTime(timestamp) {
  const now = new Date();
  const t = new Date(timestamp);
  const diffMs = now - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function formatAbsoluteTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getDateGroupLabel(timestamp) {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dStr = d.toDateString();
  if (dStr === today.toDateString()) return 'Today';
  if (dStr === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function AdminOverviewPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const { vehicles } = useVehicleStore();
  const { activities } = useActivityStore();
  const { fetchUsers, registerUser, deleteUser, updateUserTabs } = useAuthStore();
  const { locations: savedLocations, addLocation: saveLocation } = useSavedLocationStore();

  // Fleet management state
  const [allUsers, setAllUsers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(null); // vehicleId or null
  const [showParkModal, setShowParkModal] = useState(null); // vehicleId or null
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [assignDest, setAssignDest] = useState('');

  // Park modal state
  const [parkQuery, setParkQuery] = useState('');
  const [parkSuggestions, setParkSuggestions] = useState([]);
  const [parkCoords, setParkCoords] = useState(null);
  const [parkNickname, setParkNickname] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const parkDebounceRef = useRef(null);

  // Driver management state
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverUsername, setNewDriverUsername] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('driver123');
  const [newDriverRole, setNewDriverRole] = useState('driver');
  const [addDriverError, setAddDriverError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers().then(users => setAllUsers(users || []));
  }, [fetchUsers]);

  // Park location autocomplete
  const handleParkInput = useCallback((value) => {
    setParkQuery(value);
    setParkCoords(null);
    setLocationConfirmed(false);
    setParkNickname('');
    if (parkDebounceRef.current) clearTimeout(parkDebounceRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setParkSuggestions([]);
      return;
    }
    parkDebounceRef.current = setTimeout(() => {
      if (!window.google?.maps?.places) return;
      if (!window._adminParkAC) {
        window._adminParkAC = new window.google.maps.places.AutocompleteService();
      }
      window._adminParkAC.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'gb' } },
        (predictions, status) => {
          if (status === 'OK' && predictions) setParkSuggestions(predictions);
          else setParkSuggestions([]);
        }
      );
    }, 250);
  }, []);

  const handleSelectParkSuggestion = async (suggestion) => {
    setParkQuery(suggestion.description);
    setParkSuggestions([]);
    setLocationConfirmed(true);
    setParkNickname('');
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ placeId: suggestion.place_id }, (results, status) => {
          if (status === 'OK' && results[0]) resolve(results[0]);
          else reject(new Error('Geocode failed'));
        });
      });
      setParkCoords({ lat: result.geometry.location.lat(), lng: result.geometry.location.lng() });
    } catch {}
  };

  const handleSelectSavedLoc = (loc) => {
    setParkQuery(loc.name);
    setParkCoords(loc.position);
    setParkSuggestions([]);
    setLocationConfirmed(true);
    setParkNickname('');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setParkCoords({ lat: latitude, lng: longitude });
        try {
          const geocoder = new window.google.maps.Geocoder();
          const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === 'OK' && results[0]) resolve(results[0]);
              else reject(new Error('Reverse geocode failed'));
            });
          });
          setParkQuery(result.formatted_address);
        } catch {
          setParkQuery(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setLocationConfirmed(true);
        setIsGettingLocation(false);
      },
      () => { setIsGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const openParkModal = (vehicleId) => {
    setShowParkModal(vehicleId);
    setParkQuery('');
    setParkCoords(null);
    setParkSuggestions([]);
    setParkNickname('');
    setLocationConfirmed(false);
    setIsGettingLocation(false);
  };

  const handleConfirmPark = async () => {
    if (!parkQuery.trim() || !showParkModal) return;
    const location = parkQuery.trim();
    const vehicleId = showParkModal;
    const { parkVehicle, updateVehiclePosition } = useVehicleStore.getState();
    parkVehicle(vehicleId, location);
    if (parkCoords) {
      updateVehiclePosition(vehicleId, parkCoords);
    } else {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: location + ', UK' }, (results, status) => {
            if (status === 'OK' && results[0]) resolve(results[0]);
            else reject(new Error('Geocode failed'));
          });
        });
        updateVehiclePosition(vehicleId, {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
        });
      } catch (err) {
        console.error('Failed to geocode:', err);
      }
    }
    if (parkNickname.trim() && parkCoords) {
      saveLocation(parkNickname.trim(), location, parkCoords.lat, parkCoords.lng);
    }
    setShowParkModal(null);
  };

  const openAssignModal = (vehicleId) => {
    setShowAssignModal(vehicleId);
    setSelectedDriverName('');
    setAssignDest('');
  };

  const handleConfirmAssign = () => {
    if (!selectedDriverName || !showAssignModal) return;
    const { setResponsibleDriver, updateVehicle } = useVehicleStore.getState();
    setResponsibleDriver(showAssignModal, selectedDriverName);
    if (assignDest.trim()) {
      updateVehicle(showAssignModal, { destination: assignDest.trim() });
    }
    setShowAssignModal(null);
  };

  const driverUsers = allUsers.filter(u => u.role === 'driver');

  const refreshUsers = () => fetchUsers().then(users => setAllUsers(users || []));

  const handleAddDriver = async () => {
    if (!newDriverName.trim() || !newDriverUsername.trim() || !newDriverPassword.trim()) return;
    setAddDriverError('');
    const result = await registerUser(
      newDriverUsername.trim(),
      newDriverPassword.trim(),
      newDriverName.trim(),
      newDriverRole
    );
    if (result.error) {
      setAddDriverError(result.error);
      return;
    }
    await refreshUsers();
    setShowAddDriverModal(false);
    setNewDriverName('');
    setNewDriverUsername('');
    setNewDriverPassword('driver123');
    setNewDriverRole('driver');
  };

  const handleDeleteDriver = async (userId) => {
    const user = allUsers.find(u => u.id === userId);
    // If this driver is assigned to a vehicle, clear them
    if (user) {
      const assignedVehicle = vehicles.find(v => v.currentDriver === user.name);
      if (assignedVehicle) {
        const { clearDriver } = useVehicleStore.getState();
        clearDriver(assignedVehicle.id, assignedVehicle.parkedAt || null);
      }
    }
    const result = await deleteUser(userId);
    if (result.error) return;
    await refreshUsers();
    setConfirmDeleteId(null);
  };

  // Activity log — past 30 days for selected vehicle (or all)
  const filteredActivities = useMemo(() => {
    if (!selectedVehicleId) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return activities.filter((a) => {
      if (new Date(a.timestamp) < cutoff) return false;
      if (selectedVehicleId === 'all') return true;
      return a.vehicleId === selectedVehicleId;
    });
  }, [activities, selectedVehicleId]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups = [];
    let currentGroup = null;
    filteredActivities.forEach((a) => {
      const label = getDateGroupLabel(a.timestamp);
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(a);
    });
    return groups;
  }, [filteredActivities]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Sticky Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          padding: mobile ? '12px 16px' : '16px 40px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Admin Overview
        </h1>
      </div>

      {/* Content Area */}
      <div
        style={{
          padding: mobile ? '16px' : '32px 40px',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        {/* Section: Fleet Management */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            marginBottom: '24px',
            padding: mobile ? '16px' : '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginTop: 0, marginBottom: '20px' }}>
            Fleet Management
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            {(vehicles || []).map((vehicle) => {
              const isActive = vehicle.status === 'active' && vehicle.currentDriver;
              return (
                <div
                  key={vehicle.id}
                  style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#fafafa',
                  }}
                >
                  {/* Vehicle info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        {vehicle.licensePlate}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: isActive ? '#f0fdf4' : vehicle.status === 'maintenance' ? '#fffbeb' : '#f5f5f5',
                      color: isActive ? '#16a34a' : vehicle.status === 'maintenance' ? '#cc7700' : '#626669',
                    }}>
                      {isActive ? 'Active' : vehicle.status === 'maintenance' ? 'Maintenance' : 'Parked'}
                    </span>
                  </div>

                  {/* Driver / location info */}
                  <div style={{ fontSize: '13px', marginBottom: '14px', minHeight: '36px' }}>
                    {vehicle.currentDriver ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#333', marginBottom: vehicle.parkedAt ? '4px' : 0 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                        <span style={{ fontWeight: '500' }}>{vehicle.currentDriver}</span>
                        {vehicle.destination && (
                          <span style={{ color: '#999', fontSize: '12px', marginLeft: '4px' }}>{'\u2192'} {vehicle.destination}</span>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#999', marginBottom: vehicle.parkedAt ? '4px' : 0 }}>No driver</div>
                    )}
                    {vehicle.parkedAt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#3b82f6' }}>
                        <MapPin style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicle.parkedAt}</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openAssignModal(vehicle.id)}
                      style={{
                        flex: 1, padding: '8px 12px', fontSize: '12px', fontWeight: '500',
                        background: '#111', color: '#fff', border: 'none', borderRadius: '6px',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                      onMouseOut={(e) => (e.currentTarget.style.background = '#111')}
                    >
                      Assign Driver
                    </button>
                    <button
                      onClick={() => openParkModal(vehicle.id)}
                      style={{
                        flex: 1, padding: '8px 12px', fontSize: '12px', fontWeight: '500',
                        background: 'transparent', color: '#c4001a', border: '1px solid #c4001a', borderRadius: '6px',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#c4001a'; e.currentTarget.style.color = '#fff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c4001a'; }}
                    >
                      Park Vehicle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Universal Tab Access */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            marginBottom: '24px',
            padding: mobile ? '16px' : '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye style={{ width: '18px', height: '18px', color: '#0061bd' }} />
            Universal Tab Access
          </h2>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px 0' }}>
            Set tab visibility for all drivers at once.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: '10px',
          }}>
            {[
              { path: '/map', label: 'Map' },
              { path: '/fleet', label: 'Fleet' },
              { path: '/journeys', label: 'Journeys' },
              { path: '/tickets', label: 'Tickets' },
            ].map(({ path, label }) => {
              const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');
              const allEnabled = nonAdminUsers.length > 0 && nonAdminUsers.every(u => !(u.disabledTabs || []).includes(path));
              const allDisabled = nonAdminUsers.length > 0 && nonAdminUsers.every(u => (u.disabledTabs || []).includes(path));
              const currentValue = allEnabled ? 'on' : allDisabled ? 'off' : 'mixed';
              return (
                <div
                  key={path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{label}</span>
                  <select
                    value={currentValue}
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (val === 'mixed') return;
                      const shouldDisable = val === 'off';
                      const updatedUsers = [...allUsers];
                      for (const u of nonAdminUsers) {
                        const currentDisabled = u.disabledTabs || [];
                        const newDisabled = shouldDisable
                          ? [...new Set([...currentDisabled, path])]
                          : currentDisabled.filter(t => t !== path);
                        const result = await updateUserTabs(u.id, newDisabled);
                        if (result?.user) {
                          const idx = updatedUsers.findIndex(x => x.id === u.id);
                          if (idx !== -1) updatedUsers[idx] = { ...updatedUsers[idx], disabledTabs: result.user.disabledTabs };
                        }
                      }
                      setAllUsers(updatedUsers);
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: currentValue === 'on' ? '#f0fdf4' : currentValue === 'off' ? '#fef2f2' : '#fffbeb',
                      color: currentValue === 'on' ? '#15803d' : currentValue === 'off' ? '#b91c1c' : '#92400e',
                      outline: 'none',
                    }}
                  >
                    <option value="on">Visible</option>
                    <option value="off">Hidden</option>
                    {currentValue === 'mixed' && <option value="mixed">Mixed</option>}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Driver Management */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            marginBottom: '24px',
            padding: mobile ? '16px' : '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users style={{ width: '18px', height: '18px' }} />
              Driver Management
            </h2>
            <button
              onClick={() => { setShowAddDriverModal(true); setAddDriverError(''); setNewDriverName(''); setNewDriverUsername(''); setNewDriverPassword('driver123'); setNewDriverRole('driver'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', fontSize: '13px', fontWeight: '500',
                background: '#000', color: '#fff', border: 'none', borderRadius: '6px',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#333'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#000'; }}
            >
              <UserPlus style={{ width: '14px', height: '14px' }} />
              Add Driver
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '12px',
          }}>
            {allUsers.filter(u => u.role !== 'admin').map((user) => {
              const assignedVehicle = vehicles.find(v => v.currentDriver === user.name);
              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedDriver(user)}
                  style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#fafafa',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#999'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: assignedVehicle ? '#e8f5e9' : '#f0f0f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Users style={{ width: '16px', height: '16px', color: assignedVehicle ? '#22c55e' : '#999' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>{user.name}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: '500', padding: '1px 7px', borderRadius: '10px', textTransform: 'capitalize',
                        background: user.role === 'passenger' ? '#f3e8ff' : '#e8f5e9',
                        color: user.role === 'passenger' ? '#7c3aed' : '#15803d',
                      }}>{user.role}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>@{user.username}</div>
                    {assignedVehicle && (
                      <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>
                        Driving: {assignedVehicle.make} {assignedVehicle.model}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedDriver(user); }}
                      title="View activity"
                      style={{
                        padding: '6px', background: 'transparent', border: 'none',
                        cursor: 'pointer', borderRadius: '4px', color: '#bbb',
                        transition: 'color 0.15s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = '#3b82f6'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = '#bbb'; }}
                    >
                      <Eye style={{ width: '15px', height: '15px' }} />
                    </button>
                  {confirmDeleteId === user.id ? (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDriver(user.id); }}
                        style={{
                          padding: '4px 10px', fontSize: '11px', fontWeight: '600',
                          background: '#c4001a', color: '#fff', border: 'none', borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >Remove</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        style={{
                          padding: '4px 10px', fontSize: '11px', fontWeight: '500',
                          background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(user.id); }}
                      style={{
                        padding: '6px', background: 'transparent', border: 'none',
                        cursor: 'pointer', borderRadius: '4px', color: '#ccc',
                        transition: 'color 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = '#c4001a'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = '#ccc'; }}
                      title="Remove driver"
                    >
                      <Trash2 style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section C: Vehicle Activity Log */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            padding: mobile ? '16px' : '24px',
            marginTop: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginTop: 0, marginBottom: '16px' }}>
            Vehicle Activity
          </h2>

          {/* Vehicle Selector */}
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '10px 14px',
              fontSize: mobile ? '16px' : '14px',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              outline: 'none',
              background: '#fff',
              color: '#000',
              marginBottom: '20px',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Select a vehicle...</option>
            <option value="all">All Vehicles</option>
            {(vehicles || []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} — {v.licensePlate}
              </option>
            ))}
          </select>

          {selectedVehicleId && (
            <p style={{ fontSize: '12px', color: '#626669', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              Past 30 days
            </p>
          )}

          {/* Activity Timeline */}
          {selectedVehicleId && groupedActivities.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
              <p style={{ fontSize: '14px', margin: '0 0 8px' }}>No activity recorded yet</p>
              <p style={{ fontSize: '12px', margin: 0, color: '#bbb' }}>
                Activity is logged when drivers are assigned, routes are set, or vehicles are parked.
              </p>
            </div>
          )}

          {selectedVehicleId && groupedActivities.length > 0 && (
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {groupedActivities.map((group, gi) => (
                <div key={gi} style={{ marginBottom: gi < groupedActivities.length - 1 ? '20px' : 0 }}>
                  {/* Date Header */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#626669',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '10px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    {group.label}
                  </div>

                  {/* Activity Items */}
                  {group.items.map((activity) => {
                    const config = activityTypeConfig[activity.type] || { color: '#999', label: activity.type };
                    return (
                      <div
                        key={activity.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '10px 0',
                          borderBottom: '1px solid #f8f8f8',
                        }}
                      >
                        {/* Colored dot */}
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: config.color,
                          flexShrink: 0,
                          marginTop: '4px',
                        }} />

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {selectedVehicleId === 'all' && activity.vehicleName && (
                            <div style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '2px' }}>
                              {activity.vehicleName}
                            </div>
                          )}
                          <div style={{ fontSize: '14px', color: '#111', fontWeight: '500' }}>
                            {activity.description}
                          </div>
                          {activity.type === 'driver_assigned' && activity.details?.origin && (
                            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                              From: {activity.details.origin}
                            </div>
                          )}
                          {activity.type === 'driver_assigned' && activity.details?.destination && (
                            <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '2px' }}>
                              To: {activity.details.destination}
                            </div>
                          )}
                          {activity.details?.parkedAt && activity.type !== 'driver_assigned' && (
                            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                              Parked at {activity.details.parkedAt}
                            </div>
                          )}
                          {activity.details?.destination && activity.type === 'route_set' && (
                            <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '2px' }}>
                              Destination: {activity.details.destination}
                            </div>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: '#323639' }}>
                            {formatRelativeTime(activity.timestamp)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            {formatAbsoluteTime(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Driver Modal */}
      {showAssignModal && (() => {
        const v = vehicles.find(x => x.id === showAssignModal);
        return (
          <div
            style={{
              position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '20px',
            }}
            onClick={() => setShowAssignModal(null)}
          >
            <div
              style={{
                background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px',
                padding: mobile ? '20px' : '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', background: '#f0f4ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <Users style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000', margin: '0 0 8px', textAlign: 'center' }}>
                Assign Driver
              </h3>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 24px', textAlign: 'center' }}>
                {v?.make} {v?.model} — {v?.licensePlate}
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Driver
                </label>
                <select
                  value={selectedDriverName}
                  onChange={(e) => setSelectedDriverName(e.target.value)}
                  style={{
                    width: '100%', padding: '11px 14px', fontSize: mobile ? '16px' : '14px',
                    border: '1px solid #e0e0e0', borderRadius: '10px',
                    outline: 'none', background: '#f8f8f8', color: '#000',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select a driver...</option>
                  {driverUsers.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Destination (optional)
                </label>
                <input
                  type="text"
                  value={assignDest}
                  onChange={(e) => setAssignDest(e.target.value)}
                  placeholder="e.g. Warehouse, Office"
                  style={{
                    width: '100%', padding: '11px 14px', fontSize: mobile ? '16px' : '14px',
                    border: '1px solid #e0e0e0', borderRadius: '10px',
                    outline: 'none', background: '#f8f8f8', color: '#000',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowAssignModal(null)}
                  style={{
                    flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500',
                    background: '#f5f5f5', border: 'none', borderRadius: '10px',
                    color: '#666', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                >Cancel</button>
                <button
                  onClick={handleConfirmAssign}
                  disabled={!selectedDriverName}
                  style={{
                    flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
                    background: selectedDriverName ? '#111' : '#e8e8e8',
                    border: 'none', borderRadius: '10px',
                    color: selectedDriverName ? '#fff' : '#aaa',
                    cursor: selectedDriverName ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { if (selectedDriverName) e.currentTarget.style.background = '#333'; }}
                  onMouseOut={(e) => { if (selectedDriverName) e.currentTarget.style.background = '#111'; }}
                >Assign</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Park Vehicle Modal */}
      {showParkModal && (() => {
        const v = vehicles.find(x => x.id === showParkModal);
        return (
          <div
            style={{
              position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '20px',
            }}
            onClick={() => setShowParkModal(null)}
          >
            <div
              style={{
                background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px',
                padding: mobile ? '20px' : '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', background: '#fff5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <ParkingSquare style={{ width: '24px', height: '24px', color: '#c4001a' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000', margin: '0 0 8px', textAlign: 'center' }}>
                Park Vehicle
              </h3>
              <p style={{ fontSize: '13px', color: '#999', margin: '0 0 24px', textAlign: 'center' }}>
                {v?.make} {v?.model} — {v?.licensePlate}
              </p>

              {/* Use Current Location */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={isGettingLocation}
                style={{
                  width: '100%', padding: '12px 16px', fontSize: '13px', fontWeight: '500',
                  background: '#f8f8f8', border: '1px dashed #d0d0d0', borderRadius: '10px',
                  color: '#555', cursor: isGettingLocation ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginBottom: '12px', transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { if (!isGettingLocation) { e.currentTarget.style.borderColor = '#999'; e.currentTarget.style.color = '#000'; } }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d0d0d0'; e.currentTarget.style.color = '#555'; }}
              >
                {isGettingLocation ? (
                  <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Getting location...</>
                ) : (
                  <><Crosshair style={{ width: '16px', height: '16px' }} /> Use Current Location</>
                )}
              </button>

              {/* Search input */}
              <div style={{ position: 'relative', marginBottom: parkSuggestions.length > 0 ? '0' : '12px' }}>
                <input
                  type="text"
                  value={parkQuery}
                  onChange={(e) => handleParkInput(e.target.value)}
                  placeholder="Search for a location..."
                  style={{
                    width: '100%', padding: '13px 16px', fontSize: mobile ? '16px' : '14px',
                    border: '1px solid #e0e0e0',
                    borderRadius: parkSuggestions.length > 0 ? '10px 10px 0 0' : '10px',
                    outline: 'none', background: '#f8f8f8', color: '#000',
                    boxSizing: 'border-box', transition: 'all 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { setTimeout(() => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }, 150); }}
                />
                {parkSuggestions.length > 0 && (
                  <div style={{ border: '1px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', background: '#fff' }}>
                    {parkSuggestions.map((s) => (
                      <button
                        key={s.place_id}
                        onClick={() => handleSelectParkSuggestion(s)}
                        style={{
                          width: '100%', padding: '11px 16px', fontSize: '13px',
                          color: '#333', background: 'transparent', border: 'none',
                          borderTop: '1px solid #f5f5f5', cursor: 'pointer',
                          textAlign: 'left', transition: 'background 0.15s',
                          display: 'flex', alignItems: 'center', gap: '10px',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#f8f8f8')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <MapPin style={{ width: '14px', height: '14px', color: '#999', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved locations */}
              {savedLocations.length > 0 && !parkCoords && parkSuggestions.length === 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Saved Locations
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {savedLocations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => handleSelectSavedLoc(loc)}
                        style={{
                          padding: '7px 14px', fontSize: '13px', fontWeight: '500',
                          background: parkQuery === loc.name ? '#000' : '#f0f0f0',
                          color: parkQuery === loc.name ? '#fff' : '#555',
                          border: 'none', borderRadius: '8px', cursor: 'pointer',
                          transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                        onMouseOver={(e) => { if (parkQuery !== loc.name) e.currentTarget.style.background = '#e0e0e0'; }}
                        onMouseOut={(e) => { if (parkQuery !== loc.name) e.currentTarget.style.background = '#f0f0f0'; }}
                      >
                        <MapPinned style={{ width: '12px', height: '12px' }} />
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Location confirmed */}
              {parkCoords && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px',
                  marginBottom: '12px', fontSize: '13px', color: '#16a34a',
                }}>
                  <Check style={{ width: '14px', height: '14px' }} />
                  Location selected
                </div>
              )}

              {/* Optional nickname */}
              {locationConfirmed && (
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={parkNickname}
                    onChange={(e) => setParkNickname(e.target.value)}
                    placeholder="Save as... (optional nickname)"
                    style={{
                      width: '100%', padding: '11px 16px', fontSize: mobile ? '16px' : '14px',
                      border: '1px solid #e0e0e0', borderRadius: '10px',
                      outline: 'none', background: '#f8f8f8', color: '#000',
                      boxSizing: 'border-box', transition: 'all 0.2s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }}
                  />
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', paddingLeft: '4px' }}>
                    This location will be saved for quick access
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowParkModal(null)}
                  style={{
                    flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500',
                    background: '#f5f5f5', border: 'none', borderRadius: '10px',
                    color: '#666', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                >Cancel</button>
                <button
                  onClick={handleConfirmPark}
                  disabled={!parkQuery.trim()}
                  style={{
                    flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
                    background: parkQuery.trim() ? '#c4001a' : '#e8e8e8',
                    border: 'none', borderRadius: '10px',
                    color: parkQuery.trim() ? '#fff' : '#aaa',
                    cursor: parkQuery.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { if (parkQuery.trim()) e.currentTarget.style.background = '#a00015'; }}
                  onMouseOut={(e) => { if (parkQuery.trim()) e.currentTarget.style.background = '#c4001a'; }}
                >Confirm & Park</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Driver Modal */}
      {showAddDriverModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowAddDriverModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px',
              width: '100%', maxWidth: '400px',
              padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600' }}>Add New User</h3>

            {addDriverError && (
              <div style={{
                padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', color: '#c4001a', fontSize: '13px', marginBottom: '16px',
              }}>
                {addDriverError}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '6px' }}>Role</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['driver', 'passenger'].map(r => (
                  <button
                    key={r}
                    onClick={() => { setNewDriverRole(r); setNewDriverPassword(r === 'passenger' ? '' : 'driver123'); }}
                    style={{
                      flex: 1, padding: '8px', fontSize: '13px', fontWeight: '500', borderRadius: '8px',
                      border: `1px solid ${newDriverRole === r ? '#000' : '#e0e0e0'}`,
                      background: newDriverRole === r ? '#000' : '#f8f8f8',
                      color: newDriverRole === r ? '#fff' : '#555',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '6px' }}>Name</label>
              <input
                type="text"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="e.g. Hamza"
                style={{
                  width: '100%', padding: '10px 14px', fontSize: '14px',
                  border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f8f8f8',
                  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '6px' }}>Username</label>
              <input
                type="text"
                value={newDriverUsername}
                onChange={(e) => setNewDriverUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="e.g. hamza"
                style={{
                  width: '100%', padding: '10px 14px', fontSize: '14px',
                  border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f8f8f8',
                  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '6px' }}>Password</label>
              <input
                type="text"
                value={newDriverPassword}
                onChange={(e) => setNewDriverPassword(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', fontSize: '14px',
                  border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f8f8f8',
                  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }}
              />
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Default: driver123</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAddDriverModal(false)}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500',
                  background: '#f5f5f5', border: 'none', borderRadius: '10px',
                  color: '#666', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
              >Cancel</button>
              <button
                onClick={handleAddDriver}
                disabled={!newDriverName.trim() || !newDriverUsername.trim() || !newDriverPassword.trim()}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
                  background: (newDriverName.trim() && newDriverUsername.trim() && newDriverPassword.trim()) ? '#000' : '#e8e8e8',
                  border: 'none', borderRadius: '10px',
                  color: (newDriverName.trim() && newDriverUsername.trim() && newDriverPassword.trim()) ? '#fff' : '#aaa',
                  cursor: (newDriverName.trim() && newDriverUsername.trim() && newDriverPassword.trim()) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { if (newDriverName.trim() && newDriverUsername.trim()) e.currentTarget.style.background = '#333'; }}
                onMouseOut={(e) => { if (newDriverName.trim() && newDriverUsername.trim()) e.currentTarget.style.background = '#000'; }}
              >{newDriverRole === 'passenger' ? 'Add Passenger' : 'Add Driver'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Activity Detail Overlay */}
      {selectedDriver && (() => {
        const driverName = selectedDriver.name;

        // Activities involving this driver (check details.driverName or description)
        const driverActivities = activities.filter(a =>
          (a.details?.driverName && a.details.driverName === driverName) ||
          (a.details?.reportedBy && a.details.reportedBy === driverName) ||
          a.description?.includes(driverName)
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Group activities by date
        const activityGroups = {};
        driverActivities.forEach(a => {
          const label = getDateGroupLabel(a.timestamp);
          if (!activityGroups[label]) activityGroups[label] = [];
          activityGroups[label].push(a);
        });

        // Currently driving
        const currentVehicle = vehicles.find(v => v.currentDriver === driverName);

        // Vehicles this driver has been associated with (current or last)
        const associatedVehicles = vehicles.filter(v =>
          v.currentDriver === driverName || v.lastDriver === driverName
        );

        // Fuel records across all vehicles for this driver
        const fuelRecords = [];
        (vehicles || []).forEach(v => {
          const vehicleName = `${v.make} ${v.model}`;
          (v.fuel?.records || []).forEach(r => {
            if (r.driverName === driverName) {
              fuelRecords.push({ ...r, vehicleName, vehicleId: v.id });
            }
          });
        });
        fuelRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Summary stats
        const totalFuelSpent = fuelRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
        const journeyCount = driverActivities.filter(a => a.type === 'driver_assigned').length;
        const destinationCount = driverActivities.filter(a => a.type === 'destination_set').length;

        return (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: '#f5f5f5',
              zIndex: 100,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Header */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 101,
                background: '#ffffff',
                borderBottom: '1px solid #e0e0e0',
                padding: mobile ? '12px 16px' : '16px 40px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <button
                onClick={() => setSelectedDriver(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '34px', height: '34px',
                  background: '#f0f0f0', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e0e0e0'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
              >
                <ArrowLeft style={{ width: '18px', height: '18px' }} />
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{driverName}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  @{selectedDriver.username}
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '10px', fontWeight: '500', padding: '1px 7px', borderRadius: '10px',
                    textTransform: 'capitalize',
                    background: selectedDriver.role === 'passenger' ? '#f3e8ff' : '#e8f5e9',
                    color: selectedDriver.role === 'passenger' ? '#7c3aed' : '#15803d',
                  }}>{selectedDriver.role}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: mobile ? '16px' : '32px 40px', maxWidth: '800px', margin: '0 auto' }}>

              {/* Summary Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '24px',
              }}>
                {[
                  { label: 'Journeys', value: journeyCount, icon: Car, color: '#22c55e' },
                  { label: 'Fuel Spend', value: `\u00A3${totalFuelSpent.toFixed(2)}`, icon: Fuel, color: '#f97316' },
                  { label: 'Destinations', value: destinationCount, icon: MapPin, color: '#7c3aed' },
                  { label: 'Total Activities', value: driverActivities.length, icon: Activity, color: '#0061bd' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <stat.icon style={{ width: '20px', height: '20px', color: stat.color, marginBottom: '6px' }} />
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#111' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Currently Driving */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: mobile ? '16px' : '20px',
                marginBottom: '16px',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Car style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                  Currently Driving
                </h3>
                {currentVehicle ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Car style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{currentVehicle.make} {currentVehicle.model}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{currentVehicle.licensePlate}</div>
                      {currentVehicle.destination && (
                        <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '2px' }}>
                          <MapPin style={{ width: '11px', height: '11px', display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                          {currentVehicle.destination}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                    Not currently assigned to any vehicle
                  </div>
                )}
                {associatedVehicles.length > 0 && !currentVehicle && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Last known vehicle:</div>
                    {associatedVehicles.map(v => (
                      <div key={v.id} style={{ fontSize: '13px', color: '#555' }}>
                        {v.make} {v.model} ({v.licensePlate})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab Access */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: mobile ? '16px' : '20px',
                marginBottom: '16px',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye style={{ width: '16px', height: '16px', color: '#0061bd' }} />
                  Tab Access
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { path: '/map', label: 'Live Map' },
                    { path: '/fleet', label: 'Fleet' },
                    { path: '/journeys', label: 'Journeys' },
                    { path: '/tickets', label: 'Tickets' },
                  ].map(({ path, label }) => {
                    const currentDisabled = selectedDriver.disabledTabs || [];
                    const isEnabled = !currentDisabled.includes(path);
                    return (
                      <div
                        key={path}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#fafafa',
                          borderRadius: '6px',
                          border: '1px solid #f0f0f0',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{label}</span>
                        <select
                          value={isEnabled ? 'on' : 'off'}
                          onChange={async (e) => {
                            e.stopPropagation();
                            const newDisabled = e.target.value === 'off'
                              ? [...new Set([...currentDisabled, path])]
                              : currentDisabled.filter(t => t !== path);
                            const result = await updateUserTabs(selectedDriver.id, newDisabled);
                            if (result?.user) {
                              setSelectedDriver({ ...selectedDriver, disabledTabs: result.user.disabledTabs });
                              setAllUsers(prev => prev.map(u => u.id === selectedDriver.id ? { ...u, disabledTabs: result.user.disabledTabs } : u));
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '500',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isEnabled ? '#f0fdf4' : '#fef2f2',
                            color: isEnabled ? '#15803d' : '#b91c1c',
                            outline: 'none',
                          }}
                        >
                          <option value="on">Visible</option>
                          <option value="off">Hidden</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fuel Records */}
              {fuelRecords.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: mobile ? '16px' : '20px',
                  marginBottom: '16px',
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Fuel style={{ width: '16px', height: '16px', color: '#f97316' }} />
                    Fuel Records
                    <span style={{ fontSize: '12px', fontWeight: '400', color: '#999', marginLeft: 'auto' }}>
                      Total: {'\u00A3'}{totalFuelSpent.toFixed(2)}
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {fuelRecords.map((record) => (
                      <div
                        key={record.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', background: '#fff7ed', borderRadius: '6px',
                          border: '1px solid #fed7aa',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{record.vehicleName}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{formatAbsoluteTime(record.date)}</div>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#ea580c' }}>
                          {'\u00A3'}{record.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: mobile ? '16px' : '20px',
                marginBottom: '16px',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock style={{ width: '16px', height: '16px', color: '#0061bd' }} />
                  Activity Timeline
                </h3>
                {driverActivities.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                    No recorded activity for this person yet
                  </div>
                ) : (
                  <div>
                    {Object.entries(activityGroups).map(([dateLabel, acts]) => (
                      <div key={dateLabel} style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase',
                          letterSpacing: '0.5px', marginBottom: '10px',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <Calendar style={{ width: '12px', height: '12px' }} />
                          {dateLabel}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {acts.map((act) => {
                            const config = activityTypeConfig[act.type] || { color: '#888', label: act.type };
                            return (
                              <div
                                key={act.id}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                                  padding: '10px 12px', borderRadius: '6px',
                                  border: '1px solid #f0f0f0', background: '#fafafa',
                                }}
                              >
                                <div style={{
                                  width: '8px', height: '8px', borderRadius: '50%',
                                  background: config.color, flexShrink: 0, marginTop: '5px',
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>
                                    {act.description}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span>{config.label}</span>
                                    {act.vehicleName && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Car style={{ width: '10px', height: '10px' }} />
                                        {act.vehicleName}
                                      </span>
                                    )}
                                    <span>{formatAbsoluteTime(act.timestamp)}</span>
                                  </div>
                                  {act.details?.destination && (
                                    <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <MapPin style={{ width: '10px', height: '10px' }} />
                                      {act.details.destination}
                                    </div>
                                  )}
                                  {act.details?.parkedAt && (
                                    <div style={{ fontSize: '11px', color: '#cc7700', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <ParkingSquare style={{ width: '10px', height: '10px' }} />
                                      {act.details.parkedAt}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#bbb', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                  {formatRelativeTime(act.timestamp)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default AdminOverviewPage;
