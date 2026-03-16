import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore, useVehicleStore, useCarImageStore, useSavedLocationStore } from '../../store';
import { MapPin, Car, Check, ArrowRight, LogOut, ParkingSquare, MapPinned, X, Loader2, Navigation, Fuel, Crosshair, AlertTriangle } from 'lucide-react';
import { calculateRoute } from '../../services/routeService';
import { useIsMobile } from '../../hooks/useIsMobile';

export function MyProfilePage() {
  const { user } = useAuthStore();
  const { vehicles, updateVehicle, setVehicleRoute, reportProblem } = useVehicleStore();
  const { images: carImages } = useCarImageStore();
  const { locations: savedLocations, addLocation: saveLocation } = useSavedLocationStore();
  const mobile = useIsMobile();

  const myVehicle = user?.selectedVehicleId && user.selectedVehicleId !== '__skip__'
    ? vehicles.find(v => v.id === user.selectedVehicleId)
    : null;

  // Destination autocomplete state
  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const destDebounceRef = useRef(null);

  // Fuel modal state
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelAmount, setFuelAmount] = useState('');

  // Report issue modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueText, setIssueText] = useState('');

  // Stop driving modal state
  const [showStopModal, setShowStopModal] = useState(false);
  const [parkedLocation, setParkedLocation] = useState('');
  const [parkedCoords, setParkedCoords] = useState(null);
  const [parkSuggestions, setParkSuggestions] = useState([]);
  const parkDebounceRef = useRef(null);
  const [parkNickname, setParkNickname] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const hasActiveRoute = !!(myVehicle?.route && myVehicle?.destination);

  const getCarImage = (vehicle) => {
    if (!vehicle?.imageId) return null;
    return carImages?.find(img => img.id === vehicle.imageId)?.url || null;
  };

  // --- Destination autocomplete ---
  const handleDestInput = useCallback((value) => {
    setDestQuery(value);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }
    destDebounceRef.current = setTimeout(() => {
      if (!window.google?.maps?.places) return;
      if (!window._destAutocomplete) {
        window._destAutocomplete = new window.google.maps.places.AutocompleteService();
      }
      window._destAutocomplete.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'gb' } },
        (predictions, status) => {
          if (status === 'OK' && predictions) setDestSuggestions(predictions);
          else setDestSuggestions([]);
        }
      );
    }, 250);
  }, []);

  const handlePickDestSuggestion = async (suggestion) => {
    setDestQuery(suggestion.description);
    setDestSuggestions([]);
    if (!myVehicle) return;
    setIsCalculating(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const geo = await new Promise((resolve, reject) => {
        geocoder.geocode({ placeId: suggestion.place_id }, (results, status) => {
          if (status === 'OK' && results[0]) resolve(results[0]);
          else reject(new Error('Geocode failed'));
        });
      });
      const lat = geo.geometry.location.lat();
      const lng = geo.geometry.location.lng();
      const route = await calculateRoute(myVehicle.position, { lat, lng });
      setVehicleRoute(myVehicle.id, route.coordinates);
      updateVehicle(myVehicle.id, {
        destination: suggestion.description,
        estimatedArrival: route.durationText,
        routeDistance: route.distanceText,
      });
      setDestQuery('');
    } catch (err) {
      console.error('Route calculation failed:', err);
    }
    setIsCalculating(false);
  };

  const handlePickSavedDest = async (loc) => {
    setDestSuggestions([]);
    setDestQuery('');
    if (!myVehicle) return;
    setIsCalculating(true);
    try {
      const route = await calculateRoute(myVehicle.position, loc.position);
      setVehicleRoute(myVehicle.id, route.coordinates);
      updateVehicle(myVehicle.id, {
        destination: loc.name,
        estimatedArrival: route.durationText,
        routeDistance: route.distanceText,
      });
    } catch (err) {
      console.error('Route calculation failed:', err);
    }
    setIsCalculating(false);
  };

  const handleClearRoute = () => {
    if (!myVehicle) return;
    setVehicleRoute(myVehicle.id, null);
    updateVehicle(myVehicle.id, {
      destination: null,
      estimatedArrival: null,
      routeDistance: null,
    });
  };

  // --- Car actions ---
  const handleChangeCar = () => {
    if (myVehicle) {
      const { clearDriver } = useVehicleStore.getState();
      clearDriver(myVehicle.id);
    }
    useAuthStore.setState(s => ({
      user: { ...s.user, selectedVehicleId: null },
      carSelectReady: false,
    }));
  };

  const handleStopDriving = () => {
    setShowStopModal(true);
    setParkedLocation('');
    setParkedCoords(null);
    setParkSuggestions([]);
    setParkNickname('');
    setLocationConfirmed(false);
    setIsGettingLocation(false);
  };

  const handleFuelUp = () => {
    setShowFuelModal(true);
    setFuelAmount('');
  };

  const handleConfirmFuel = () => {
    const amount = parseFloat(fuelAmount);
    if (!amount || amount <= 0 || !myVehicle) return;
    const { addFuelRecord } = useVehicleStore.getState();
    addFuelRecord(myVehicle.id, amount, user?.name || 'Unknown');
    setShowFuelModal(false);
    setFuelAmount('');
  };

  // --- Parked location autocomplete ---
  const handleParkedInput = useCallback((value) => {
    setParkedLocation(value);
    setParkedCoords(null);
    setLocationConfirmed(false);
    setParkNickname('');
    if (parkDebounceRef.current) clearTimeout(parkDebounceRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setParkSuggestions([]);
      return;
    }
    parkDebounceRef.current = setTimeout(() => {
      if (!window.google?.maps?.places) return;
      if (!window._parkAutocomplete) {
        window._parkAutocomplete = new window.google.maps.places.AutocompleteService();
      }
      window._parkAutocomplete.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'gb' } },
        (predictions, status) => {
          if (status === 'OK' && predictions) setParkSuggestions(predictions);
          else setParkSuggestions([]);
        }
      );
    }, 250);
  }, []);

  const handleSelectParkSuggestion = async (suggestion) => {
    setParkedLocation(suggestion.description);
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
      setParkedCoords({
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
      });
    } catch {}
  };

  const handleSelectParkSavedLocation = (loc) => {
    setParkedLocation(loc.name);
    setParkedCoords(loc.position);
    setParkSuggestions([]);
    setLocationConfirmed(true);
    setParkNickname('');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setParkedCoords({ lat: latitude, lng: longitude });
        try {
          const geocoder = new window.google.maps.Geocoder();
          const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === 'OK' && results[0]) resolve(results[0]);
              else reject(new Error('Reverse geocode failed'));
            });
          });
          setParkedLocation(result.formatted_address);
        } catch {
          setParkedLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setLocationConfirmed(true);
        setIsGettingLocation(false);
      },
      () => { setIsGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirmStop = async () => {
    if (!parkedLocation.trim()) return;
    const location = parkedLocation.trim();
    const vehicleId = myVehicle?.id;
    if (vehicleId) {
      const { clearDriver, updateVehiclePosition } = useVehicleStore.getState();
      clearDriver(vehicleId, location);
      if (parkedCoords) {
        updateVehiclePosition(vehicleId, parkedCoords);
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
          console.error('Failed to geocode parked location:', err);
        }
      }
    }
    // Save nickname if provided
    if (parkNickname.trim() && parkedCoords) {
      saveLocation(parkNickname.trim(), location, parkedCoords.lat, parkedCoords.lng);
    }
    useAuthStore.setState(s => ({
      user: { ...s.user, selectedVehicleId: null },
      carSelectReady: false,
    }));
    setShowStopModal(false);
  };

  const carImage = getCarImage(myVehicle);

  // Reusable autocomplete dropdown renderer
  const renderSuggestions = (items, onPick) => (
    items.length > 0 && (
      <div style={{
        border: '1px solid #e0e0e0', borderTop: 'none',
        borderRadius: '0 0 10px 10px', overflow: 'hidden',
        background: '#fff',
      }}>
        {items.map((s) => (
          <button
            key={s.place_id}
            onClick={() => onPick(s)}
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
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.description}
            </span>
          </button>
        ))}
      </div>
    )
  );

  const renderSavedChips = (onPick, activeLabel) => (
    savedLocations.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {savedLocations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => onPick(loc)}
            style={{
              padding: '7px 14px', fontSize: '13px', fontWeight: '500',
              background: activeLabel === loc.name ? '#000' : '#f0f0f0',
              color: activeLabel === loc.name ? '#fff' : '#555',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseOver={(e) => { if (activeLabel !== loc.name) e.currentTarget.style.background = '#e0e0e0'; }}
            onMouseOut={(e) => { if (activeLabel !== loc.name) e.currentTarget.style.background = '#f0f0f0'; }}
          >
            <MapPinned style={{ width: '12px', height: '12px' }} />
            {loc.name}
          </button>
        ))}
      </div>
    )
  );

  return (
    <div style={{ minHeight: '100%', background: '#EEEFF2' }}>
      {/* Page Header */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          padding: mobile ? '12px 16px' : '16px 40px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 style={{
            fontSize: '15px', fontWeight: '600', margin: 0, color: '#000',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>My Profile</h1>
          <span style={{
            fontSize: '11px', fontWeight: '500',
            color: user?.role === 'admin' ? '#fff' : '#666',
            background: user?.role === 'admin' ? '#000' : '#f0f0f0',
            padding: '3px 10px', borderRadius: '10px', textTransform: 'capitalize',
          }}>{user?.role}</span>
        </div>
      </div>

      {/* Content — centered */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: mobile ? '24px 16px 40px' : '48px 40px 80px' }}>
        {myVehicle ? (
          <div style={{ width: '100%', maxWidth: '520px' }}>
            {/* Driver name */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                Driving as
              </div>
              <div style={{ fontSize: '22px', fontWeight: '600', color: '#000', letterSpacing: '-0.02em' }}>
                {user?.name}
              </div>
            </div>

            {/* Vehicle card */}
            <div style={{
              background: '#fff', borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
            }}>
              {/* Car image */}
              <div style={{
                height: mobile ? '140px' : '180px', background: '#f8f8f8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {carImage ? (
                  <img src={carImage} alt={`${myVehicle.make} ${myVehicle.model}`}
                    style={{ maxWidth: '85%', maxHeight: '160px', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))' }}
                  />
                ) : (
                  <Car style={{ width: '48px', height: '48px', color: '#d4d4d4' }} />
                )}
              </div>

              {/* Vehicle info */}
              <div style={{ padding: mobile ? '20px 16px 16px' : '28px 32px 20px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#000', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                  {myVehicle.make} {myVehicle.model}
                </h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', fontSize: '14px', color: '#888' }}>
                  <span>{myVehicle.year}</span>
                  <span style={{ color: '#d9d9d9' }}>/</span>
                  <span>{myVehicle.color}</span>
                  <span style={{ color: '#d9d9d9' }}>/</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '600', letterSpacing: '1px', color: '#555' }}>{myVehicle.licensePlate}</span>
                </div>
              </div>

              {/* Destination section */}
              <div style={{ padding: '0 32px 28px' }}>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Navigation style={{ width: '15px', height: '15px', color: '#000' }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Destination
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 16px', textAlign: 'center' }}>
                    Route & ETA calculated via Google Maps
                  </p>

                  {hasActiveRoute ? (
                    /* Active route display */
                    <div style={{
                      background: '#f0fdf4', borderRadius: '12px', padding: '16px 20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#000' }}>
                          {myVehicle.destination}
                        </span>
                        <button
                          onClick={handleClearRoute}
                          style={{
                            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#999', borderRadius: '50%', transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#c4001a'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#999'; }}
                        >
                          <X style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                        {myVehicle.estimatedArrival && (
                          <span style={{ color: '#16a34a', fontWeight: '600' }}>
                            {myVehicle.estimatedArrival}
                          </span>
                        )}
                        {myVehicle.routeDistance && (
                          <span style={{ color: '#666' }}>
                            {myVehicle.routeDistance}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Destination search */
                    <div>
                      {isCalculating ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                          padding: '16px', background: '#f8f8f8', borderRadius: '12px',
                        }}>
                          <Loader2 style={{ width: '18px', height: '18px', color: '#000', animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '14px', color: '#666' }}>Calculating route...</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              value={destQuery}
                              onChange={(e) => handleDestInput(e.target.value)}
                              placeholder="Search for a destination..."
                              style={{
                                width: '100%', padding: '12px 16px', fontSize: mobile ? '16px' : '14px',
                                border: '1px solid #e0e0e0',
                                borderRadius: destSuggestions.length > 0 ? '10px 10px 0 0' : '10px',
                                outline: 'none', background: '#f8f8f8', color: '#000',
                                boxSizing: 'border-box', transition: 'all 0.2s',
                              }}
                              onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                              onBlur={(e) => { setTimeout(() => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }, 150); }}
                            />
                            {renderSuggestions(destSuggestions, handlePickDestSuggestion)}
                          </div>
                          {destSuggestions.length === 0 && savedLocations.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                                Saved Locations
                              </div>
                              {renderSavedChips(handlePickSavedDest, null)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={handleChangeCar}
                style={{
                  flex: 1, padding: '13px 20px', fontSize: '13px', fontWeight: '500',
                  background: '#fff', border: 'none', borderRadius: '12px', color: '#555',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#000'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
              >
                Switch Vehicle
              </button>
              <button
                onClick={handleFuelUp}
                style={{
                  flex: 1, padding: '13px 20px', fontSize: '13px', fontWeight: '500',
                  background: '#fff', border: 'none', borderRadius: '12px', color: '#555',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#f97316'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
              >
                <Fuel style={{ width: '14px', height: '14px' }} />
                Fuel Up
              </button>
              <button
                onClick={() => { setShowIssueModal(true); setIssueText(''); }}
                style={{
                  flex: 1, padding: '13px 20px', fontSize: '13px', fontWeight: '500',
                  background: '#fff', border: 'none', borderRadius: '12px', color: '#555',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  position: 'relative',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
              >
                <AlertTriangle style={{ width: '14px', height: '14px' }} />
                Report Issue
                {(myVehicle?.problems?.length || 0) > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{myVehicle.problems.length}</span>
                )}
              </button>
              <button
                onClick={handleStopDriving}
                style={{
                  flex: 1, padding: '13px 20px', fontSize: '13px', fontWeight: '500',
                  background: '#fff', border: 'none', borderRadius: '12px', color: '#c4001a',
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#c4001a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(196,0,26,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#c4001a'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
              >
                <LogOut style={{ width: '14px', height: '14px' }} />
                Stop Driving
              </button>
            </div>
          </div>
        ) : (
          /* No vehicle selected */
          <div style={{ textAlign: 'center', maxWidth: '400px', paddingTop: '60px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <Car style={{ width: '32px', height: '32px', color: '#ccc' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000', margin: '0 0 8px' }}>No vehicle selected</h2>
            <p style={{ fontSize: '14px', color: '#999', margin: '0 0 28px' }}>Select a car to start driving</p>
            <button
              onClick={() => { useAuthStore.setState(s => ({ user: { ...s.user, selectedVehicleId: null }, carSelectReady: false })); }}
              style={{
                padding: '13px 36px', fontSize: '14px', fontWeight: '500',
                background: '#000', color: '#fff', border: 'none', borderRadius: '12px',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#000')}
            >
              Select a Car
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        )}
      </div>

      {/* Stop Driving Modal */}
      {showStopModal && (
        <div
          style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '20px',
          }}
          onClick={() => setShowStopModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px',
              margin: mobile ? '0 16px' : undefined,
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
              Where is the car parked?
            </h3>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 24px', textAlign: 'center' }}>
              Let the team know where you left the vehicle
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
                type="text" value={parkedLocation}
                onChange={(e) => handleParkedInput(e.target.value)}
                placeholder="Search for a location..." autoFocus
                style={{
                  width: '100%', padding: '13px 16px', fontSize: mobile ? '16px' : '14px',
                  border: '1px solid #e0e0e0',
                  borderRadius: parkSuggestions.length > 0 ? '10px 10px 0 0' : '10px',
                  outline: 'none', background: '#f8f8f8', color: '#000',
                  boxSizing: 'border-box', transition: 'all 0.2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { setTimeout(() => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }, 150); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && parkedLocation.trim()) handleConfirmStop(); }}
              />
              {renderSuggestions(parkSuggestions, handleSelectParkSuggestion)}
            </div>

            {/* Saved locations */}
            {savedLocations.length > 0 && !parkedCoords && parkSuggestions.length === 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Saved Locations
                </div>
                {renderSavedChips(handleSelectParkSavedLocation, parkedLocation)}
              </div>
            )}

            {parkedCoords && (
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
                onClick={() => setShowStopModal(false)}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500',
                  background: '#f5f5f5', border: 'none', borderRadius: '10px',
                  color: '#666', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
              >Cancel</button>
              <button
                onClick={handleConfirmStop}
                disabled={!parkedLocation.trim()}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
                  background: parkedLocation.trim() ? '#c4001a' : '#e8e8e8',
                  border: 'none', borderRadius: '10px',
                  color: parkedLocation.trim() ? '#fff' : '#aaa',
                  cursor: parkedLocation.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { if (parkedLocation.trim()) e.currentTarget.style.background = '#a00015'; }}
                onMouseOut={(e) => { if (parkedLocation.trim()) e.currentTarget.style.background = '#c4001a'; }}
              >Confirm & Park</button>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Up Modal */}
      {showFuelModal && (
        <div
          style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '20px',
          }}
          onClick={() => setShowFuelModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px',
              margin: mobile ? '0 16px' : undefined,
              padding: mobile ? '20px' : '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: '#fff7ed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Fuel style={{ width: '24px', height: '24px', color: '#f97316' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000', margin: '0 0 8px', textAlign: 'center' }}>
              Fuel Up
            </h3>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 24px', textAlign: 'center' }}>
              Enter the fuel cost for {myVehicle?.make} {myVehicle?.model}
            </p>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '16px', fontWeight: '600', color: '#666',
              }}>£</span>
              <input
                type="number"
                value={fuelAmount}
                onChange={(e) => setFuelAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                autoFocus
                style={{
                  width: '100%', padding: '13px 16px 13px 30px', fontSize: mobile ? '16px' : '14px',
                  border: '1px solid #e0e0e0', borderRadius: '10px',
                  outline: 'none', background: '#f8f8f8', color: '#000',
                  boxSizing: 'border-box', transition: 'all 0.2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && fuelAmount) handleConfirmFuel(); }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowFuelModal(false)}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500',
                  background: '#f5f5f5', border: 'none', borderRadius: '10px',
                  color: '#666', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
              >Cancel</button>
              <button
                onClick={handleConfirmFuel}
                disabled={!fuelAmount || parseFloat(fuelAmount) <= 0}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
                  background: (fuelAmount && parseFloat(fuelAmount) > 0) ? '#f97316' : '#e8e8e8',
                  border: 'none', borderRadius: '10px',
                  color: (fuelAmount && parseFloat(fuelAmount) > 0) ? '#fff' : '#aaa',
                  cursor: (fuelAmount && parseFloat(fuelAmount) > 0) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { if (fuelAmount && parseFloat(fuelAmount) > 0) e.currentTarget.style.background = '#ea580c'; }}
                onMouseOut={(e) => { if (fuelAmount && parseFloat(fuelAmount) > 0) e.currentTarget.style.background = '#f97316'; }}
              >Add Fuel Cost</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showIssueModal && (
        <div
          style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '20px',
          }}
          onClick={() => setShowIssueModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px',
              margin: mobile ? '0 16px' : undefined,
              padding: mobile ? '20px' : '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <AlertTriangle style={{ width: '24px', height: '24px', color: '#dc2626' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000', margin: '0 0 8px', textAlign: 'center' }}>
              Report an Issue
            </h3>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 20px', textAlign: 'center' }}>
              Describe the problem with {myVehicle?.make} {myVehicle?.model}
            </p>

            <textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="e.g. Warning light on dashboard, strange noise from engine, scratch on rear bumper..."
              rows={4}
              autoFocus
              style={{
                width: '100%', padding: '13px 16px', fontSize: mobile ? '16px' : '14px',
                border: '1px solid #e0e0e0', borderRadius: '10px',
                outline: 'none', background: '#f8f8f8', color: '#000',
                boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5,
                transition: 'all 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#dc2626'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f8f8'; }}
            />

            {/* Existing issues */}
            {(myVehicle?.problems?.length || 0) > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Previous Issues
                </div>
                {myVehicle.problems.map((p) => (
                  <div key={p.id} style={{
                    padding: '8px 12px', marginBottom: '6px', borderRadius: '8px',
                    background: '#fef2f2', border: '1px solid #fecaca',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>{p.text}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        {p.reportedBy} · {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const { clearProblem } = useVehicleStore.getState();
                        clearProblem(myVehicle.id, p.id);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '14px', lineHeight: 1, padding: '2px', flexShrink: 0 }}
                    >&times;</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowIssueModal(false)}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '500',
                  background: '#f5f5f5', border: 'none', borderRadius: '10px',
                  color: '#666', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (!issueText.trim() || !myVehicle) return;
                  reportProblem(myVehicle.id, issueText.trim(), user?.name || 'Unknown');
                  setIssueText('');
                }}
                disabled={!issueText.trim()}
                style={{
                  flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
                  background: issueText.trim() ? '#dc2626' : '#e8e8e8',
                  border: 'none', borderRadius: '10px',
                  color: issueText.trim() ? '#fff' : '#aaa',
                  cursor: issueText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { if (issueText.trim()) e.currentTarget.style.background = '#b91c1c'; }}
                onMouseOut={(e) => { if (issueText.trim()) e.currentTarget.style.background = '#dc2626'; }}
              >Submit Report</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default MyProfilePage;
