import { useState, useEffect, useRef } from 'react';
import { Trash2, X, CheckCircle2, Circle, Plus, Map, MapPin, Navigation, Edit2, ChevronLeft, ChevronRight, MapPinned, Route as RouteIcon, Save, Minimize2, Maximize2 } from 'lucide-react';
import PersonChip from './PersonChip';
import { useLogisticsStore } from '../../../store/logisticsStore';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function CarCard({
  car,
  people,
  routes,
  carLetter,
  onPersonDrop,
  onPersonRemove,
  onPersonSwap,
  onCarDelete,
  onCarUpdate,
  onRouteCreate,
  onRouteUpdate,
  onRouteStopCreate,
  getRouteStops,
  draggedPersonId,
  onPersonDragStart,
  onPersonDragEnd,
  onPeopleRefetch,
  showStars = true,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(car.name);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [originValue, setOriginValue] = useState(car.origin || '');
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [destinationValue, setDestinationValue] = useState(car.destination || '');
  const [showMap, setShowMap] = useState(false);
  const [isAddingStopInMap, setIsAddingStopInMap] = useState(false);
  const [isAddingStopInline, setIsAddingStopInline] = useState(false);
  const [newStopLocationMap, setNewStopLocationMap] = useState('');
  const [newStopLocationInline, setNewStopLocationInline] = useState('');
  const [editingStopId, setEditingStopId] = useState(null);
  const [editingStopLocation, setEditingStopLocation] = useState('');
  const [isEditingFromInline, setIsEditingFromInline] = useState(false);
  const [isEditingToInline, setIsEditingToInline] = useState(false);
  const [fromValueInline, setFromValueInline] = useState('');
  const [toValueInline, setToValueInline] = useState('');
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [isMapPanelMinimized, setIsMapPanelMinimized] = useState(false);
  const [legDurations, setLegDurations] = useState([]);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [customDurationValue, setCustomDurationValue] = useState('');
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const cardRef = useRef(null);

  const storeLegs = useLogisticsStore(s => s.getLegsForCar)(car.id);
  const storeCreateLeg = useLogisticsStore(s => s.createCarLeg);
  const storeUpdateLeg = useLogisticsStore(s => s.updateCarLeg);
  const storeDeleteLeg = useLogisticsStore(s => s.deleteCarLeg);

  // active_leg_index is which leg you're viewing in the UI
  const viewingLegIndex = car.active_leg_index || 0;
  // current_leg_index is which leg the car is actually on
  const currentLegIndex = car.current_leg_index || 0;

  // Build all waypoints in order: origin, stops, destination
  const waypoints = [
    car.origin || null,
    ...storeLegs.map(s => s.location || null),
    car.destination || null
  ].filter(w => w !== null);

  // Total number of journey segments (legs)
  const totalLegs = Math.max(1, waypoints.length - 1);

  // Get the "from" and "to" for a leg segment
  const getLegSegment = (legIndex) => {
    if (waypoints.length < 2) {
      return { from: car.origin || 'Origin', to: car.destination || 'Destination' };
    }
    const fromIndex = legIndex;
    const toIndex = legIndex + 1;
    return {
      from: waypoints[fromIndex] || 'Start',
      to: waypoints[toIndex] || 'End'
    };
  };

  const viewingSegment = getLegSegment(viewingLegIndex);

  // Get the stop corresponding to the viewing leg (if any)
  const viewingLegStop = storeLegs[viewingLegIndex] || null;

  // Initialize map when shown
  useEffect(() => {
    if (!mapContainer.current || map.current || !showMap) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.1278, 51.5074],
      zoom: 9,
      interactive: true,
    });

    initMap.on('load', () => {
      setMapInitialized(true);
    });

    map.current = initMap;
    initMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapInitialized(false);
      }
    };
  }, [showMap]);

  // Calculate durations automatically (without map)
  useEffect(() => {
    const calculateDurations = async () => {
      if (!car.origin || !car.destination) {
        setLegDurations([]);
        return;
      }

      try {
        // Build list of all locations: origin, stops (sorted), destination
        const allLocations = [
          car.origin,
          ...storeLegs.map(s => s.location).filter(l => l),
          car.destination
        ].filter(l => l);

        if (allLocations.length < 2) return;

        // Geocode all locations
        const geocodedLocations = await Promise.all(
          allLocations.map(async (location) => {
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_TOKEN}`
              );
              const data = await response.json();
              return data.features?.[0]?.center;
            } catch (err) {
              console.error(`Failed to geocode ${location}:`, err);
              return null;
            }
          })
        );

        const validCoords = geocodedLocations.filter(c => c !== null);

        if (validCoords.length < 2) return;

        // Get directions through all points
        const coordsString = validCoords.map(c => `${c[0]},${c[1]}`).join(';');

        const directionsResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );

        const directionsData = await directionsResponse.json();
        const routeLegs = directionsData.routes?.[0]?.legs || [];

        // Extract duration for each leg (in seconds) and convert to hours
        const durations = routeLegs.map((leg) => Math.round(leg.duration / 3600 * 10) / 10);
        setLegDurations(durations);
      } catch (error) {
        console.error('Error calculating durations:', error);
      }
    };

    calculateDurations();
  }, [car.origin, car.destination, storeLegs, car.id]);

  // Update map when stops, origin, or destination change
  useEffect(() => {
    if (!map.current || !showMap || !mapInitialized) return;

    const updateMap = async () => {
      if (!map.current) return;

      try {
        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Remove existing route layer and source if they exist
        if (map.current.getLayer('route')) {
          map.current.removeLayer('route');
        }
        if (map.current.getSource('route')) {
          map.current.removeSource('route');
        }

        // Need at least origin and destination
        if (!car.origin || !car.destination) {
          return;
        }

        // Build list of all locations: origin, stops (sorted), destination
        const allLocations = [
          { location: car.origin, label: 'Origin', type: 'origin' },
          ...storeLegs.map((stop, index) => ({
            location: stop.location || '',
            label: `Stop ${index + 1}`,
            type: 'stop',
            id: stop.id
          })).filter(loc => loc.location),
          { location: car.destination, label: 'Destination', type: 'destination' }
        ];

        if (allLocations.length < 2) return;

        // Geocode all locations
        const geocodedLocations = await Promise.all(
          allLocations.map(async (loc) => {
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(loc.location)}.json?access_token=${MAPBOX_TOKEN}`
              );
              const data = await response.json();
              const coords = data.features?.[0]?.center;
              return coords ? { ...loc, coords } : null;
            } catch (err) {
              console.error(`Failed to geocode ${loc.location}:`, err);
              return null;
            }
          })
        );

        const validLocations = geocodedLocations.filter(loc => loc !== null);

        if (validLocations.length < 2) {
          return;
        }

        // Get directions through all points
        const coordsString = validLocations.map(loc => `${loc.coords[0]},${loc.coords[1]}`).join(';');

        const directionsResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );

        const directionsData = await directionsResponse.json();
        const routeGeometry = directionsData.routes?.[0]?.geometry;
        const routeLegs = directionsData.routes?.[0]?.legs || [];

        // Extract duration for each leg (in seconds) and convert to hours
        const durations = routeLegs.map((leg) => Math.round(leg.duration / 3600 * 10) / 10);
        setLegDurations(durations);

        if (!routeGeometry) {
          console.error('No route geometry returned');
          return;
        }

        if (!map.current) return;

        // Add route source
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeGeometry,
          },
        });

        // Add route layer
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': car.color,
            'line-width': 4,
            'line-opacity': 0.75,
          },
        });

        // Add markers for all locations
        const currentMap = map.current;
        validLocations.forEach((loc) => {
          const markerColor = loc.type === 'origin' ? car.color :
                             loc.type === 'destination' ? car.color :
                             '#FFA500';

          const marker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat(loc.coords)
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${loc.label}:</strong><br>${loc.location}`))
            .addTo(currentMap);

          markers.current.push(marker);
        });

        // Fit bounds to show all points
        const bounds = new mapboxgl.LngLatBounds();
        validLocations.forEach(loc => bounds.extend(loc.coords));
        map.current.fitBounds(bounds, { padding: 80 });
      } catch (error) {
        console.error('Error updating map:', error);
      }
    };

    updateMap();
  }, [storeLegs, car.origin, car.destination, car.color, showMap, mapInitialized]);

  // Keyboard navigation for legs
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if this card is focused or contains the focused element
      if (!cardRef.current?.contains(document.activeElement)) return;

      // Don't interfere with input fields
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const numLegs = Math.max(1, waypoints.length - 1);

      if (e.key === 'ArrowLeft' && numLegs > 1 && viewingLegIndex > 0) {
        e.preventDefault();
        onCarUpdate(car.id, { active_leg_index: viewingLegIndex - 1 });
      } else if (e.key === 'ArrowRight' && numLegs > 1 && viewingLegIndex < numLegs - 1) {
        e.preventDefault();
        onCarUpdate(car.id, { active_leg_index: viewingLegIndex + 1 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [car.id, viewingLegIndex, waypoints.length, onCarUpdate]);

  // Show people assigned to this car for the viewing leg
  const carPeople = people.filter(person =>
    person.car_id === car.id && (person.car_leg_id === null || person.car_leg_id === viewingLegStop?.id)
  );

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, seatPosition) => {
    e.preventDefault();
    if (draggedPersonId && !car.is_finalized) {
      const targetPerson = getSeatPerson(seatPosition);
      if (targetPerson) {
        onPersonSwap(draggedPersonId, targetPerson.id);
      } else {
        onPersonDrop(draggedPersonId, seatPosition, viewingLegStop?.id);
      }
    }
  };

  const getSeatPerson = (seatPosition) => {
    return carPeople.find(person => person.seat_position === seatPosition);
  };

  const handleFinalizeToggle = () => {
    onCarUpdate(car.id, { is_finalized: !car.is_finalized });
  };

  const handleSetViewingLeg = (legIndex) => {
    onCarUpdate(car.id, { active_leg_index: legIndex });
  };

  const handleSetCurrentLeg = (legIndex) => {
    onCarUpdate(car.id, { current_leg_index: legIndex });
  };

  const handleNameSubmit = () => {
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setNameValue(car.name);
    setIsEditingName(false);
  };

  const handleAddStopFromMap = async (e) => {
    e.preventDefault();
    if (newStopLocationMap.trim()) {
      await storeCreateLeg({
        car_id: car.id,
        name: `Stop ${storeLegs.length + 1}`,
        leg_order: storeLegs.length + 1,
        route_id: null,
        location: newStopLocationMap.trim(),
      });
      setNewStopLocationMap('');
      setIsAddingStopInMap(false);
    }
  };

  const handleEditStopFromMap = (stopId, location) => {
    setEditingStopId(stopId);
    setEditingStopLocation(location);
  };

  const handleUpdateStopFromMap = async (stopId) => {
    if (editingStopLocation.trim()) {
      await storeUpdateLeg(stopId, { location: editingStopLocation.trim() });
      setEditingStopId(null);
      setEditingStopLocation('');
    }
  };

  const handleCancelEditStopFromMap = () => {
    setEditingStopId(null);
    setEditingStopLocation('');
  };

  const handleDeleteStopFromMap = async (stopId) => {
    await storeDeleteLeg(stopId);
    onPeopleRefetch();
    // Adjust viewing and current leg indices if needed
    if (viewingLegIndex >= storeLegs.length) {
      onCarUpdate(car.id, { active_leg_index: Math.max(0, storeLegs.length - 1) });
    }
    if (currentLegIndex >= storeLegs.length) {
      onCarUpdate(car.id, { current_leg_index: Math.max(0, storeLegs.length - 1) });
    }
  };

  const handleOriginSubmit = () => {
    onCarUpdate(car.id, { origin: originValue.trim() || null });
    setIsEditingOrigin(false);
  };

  const handleOriginCancel = () => {
    setOriginValue(car.origin || '');
    setIsEditingOrigin(false);
  };

  const handleDestinationSubmit = () => {
    onCarUpdate(car.id, { destination: destinationValue.trim() || null });
    setIsEditingDestination(false);
  };

  const handleDestinationCancel = () => {
    setDestinationValue(car.destination || '');
    setIsEditingDestination(false);
  };

  const handleAddStopInline = async (e) => {
    e.preventDefault();
    if (newStopLocationInline.trim()) {
      await storeCreateLeg({
        car_id: car.id,
        name: `Stop ${storeLegs.length + 1}`,
        leg_order: storeLegs.length + 1,
        route_id: null,
        location: newStopLocationInline.trim(),
      });
      setNewStopLocationInline('');
      setIsAddingStopInline(false);
    }
  };

  const handleEditFromInline = () => {
    // Determine what "from" represents based on viewing leg
    if (viewingLegIndex === 0) {
      setFromValueInline(car.origin || '');
      setIsEditingFromInline(true);
    } else {
      // Editing a stop location
      const stop = storeLegs[viewingLegIndex - 1];
      if (stop) {
        setEditingStopId(stop.id);
        setEditingStopLocation(stop.location || '');
      }
    }
  };

  const handleEditToInline = () => {
    // Determine what "to" represents based on viewing leg
    if (viewingLegIndex === totalLegs - 1) {
      setToValueInline(car.destination || '');
      setIsEditingToInline(true);
    } else {
      // Editing a stop location
      const stop = storeLegs[viewingLegIndex];
      if (stop) {
        setEditingStopId(stop.id);
        setEditingStopLocation(stop.location || '');
      }
    }
  };

  const handleSaveFromInline = async () => {
    if (viewingLegIndex === 0) {
      await onCarUpdate(car.id, { origin: fromValueInline.trim() || null });
    }
    setIsEditingFromInline(false);
  };

  const handleSaveToInline = async () => {
    if (viewingLegIndex === totalLegs - 1) {
      await onCarUpdate(car.id, { destination: toValueInline.trim() || null });
    }
    setIsEditingToInline(false);
  };

  const handleSaveStopInline = async () => {
    if (editingStopId && editingStopLocation.trim()) {
      await storeUpdateLeg(editingStopId, { location: editingStopLocation.trim() });
      setEditingStopId(null);
      setEditingStopLocation('');
    }
  };

  const handleSaveAsRoute = async () => {
    if (!car.origin || !car.destination) {
      alert('Please set origin and destination first');
      return;
    }

    const routeName = newRouteName.trim() || `${car.origin} to ${car.destination}`;
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);

    const newRoute = await onRouteCreate({
      name: routeName,
      origin: car.origin,
      destination: car.destination,
      color: randomColor,
      assigned_car_id: car.id,
    });

    // Create route stops from car legs
    for (const stop of storeLegs) {
      if (stop.location) {
        await onRouteStopCreate(newRoute.id, {
          location: stop.location,
          stop_order: stop.leg_order,
        });
      }
    }

    setIsCreatingRoute(false);
    setNewRouteName('');
    alert('Route saved successfully!');
  };

  const handleLoadRoute = async (routeId) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Update car origin and destination
    await onCarUpdate(car.id, {
      origin: route.origin,
      destination: route.destination,
    });

    // Get route stops and create car legs
    const routeStops = getRouteStops(routeId);

    // Delete existing car legs
    for (const leg of storeLegs) {
      await storeDeleteLeg(leg.id);
    }

    // Create new car legs from route stops
    for (const routeStop of routeStops) {
      await storeCreateLeg({
        car_id: car.id,
        name: `Stop ${routeStop.stop_order}`,
        leg_order: routeStop.stop_order,
        route_id: routeId,
        location: routeStop.location,
      });
    }

    // Assign route to this car
    await onRouteUpdate(routeId, { assigned_car_id: car.id });

    setShowRouteSelector(false);
    alert('Route loaded successfully!');
  };

  const renderSeat = (seatPosition, label) => {
    const person = getSeatPerson(seatPosition);
    const canDrop = draggedPersonId && !person && !car.is_finalized;
    const isDriver = seatPosition === 1;

    return (
      <div
        key={seatPosition}
        className={`
          relative min-h-[45px] w-[120px] p-2 rounded-lg border-2 border-dashed
          transition-all duration-200 flex items-center justify-center
          ${person ? 'border-transparent bg-white/10' : `border-white/30 ${isDriver ? 'border-4' : ''}`}
          ${canDrop ? 'border-white/60 bg-white/20' : ''}
          ${car.is_finalized ? 'opacity-75' : ''}
        `}
        onDragOver={car.is_finalized ? undefined : handleDragOver}
        onDrop={car.is_finalized ? undefined : (e) => handleDrop(e, seatPosition)}
      >
        {person ? (
          <PersonChip
            person={person}
            onRemove={car.is_finalized ? undefined : () => onPersonRemove(person.id)}
            isDragging={draggedPersonId === person.id}
            onDragStart={() => onPersonDragStart(person.id)}
            onDragEnd={onPersonDragEnd}
            className="bg-gradient-to-r from-white/20 to-white/30 text-white border border-white/20"
            showStars={showStars}
          />
        ) : (
          <span className={`text-white/60 text-sm select-none ${isDriver ? 'font-bold' : 'font-medium'}`}>
            {label}
          </span>
        )}
      </div>
    );
  };

  // Determine seat layout based on capacity
  const renderSeatsLayout = () => {
    const capacity = car.capacity || 5;

    if (capacity === 2) {
      return (
        <div className="flex gap-3 items-center">
          <div className="flex flex-col gap-2">
            {renderSeat(1, 'Driver')}
            {renderSeat(2, 'Front')}
          </div>
        </div>
      );
    } else if (capacity === 5) {
      return (
        <div className="flex gap-3 items-center">
          <div className="flex flex-col gap-2">
            {renderSeat(1, 'Driver')}
            {renderSeat(2, 'Front')}
          </div>
          <div className="flex flex-col gap-1.5">
            {renderSeat(3, 'Back')}
            {renderSeat(4, 'Back')}
            {renderSeat(5, 'Back')}
          </div>
        </div>
      );
    } else if (capacity === 7) {
      return (
        <div className="flex gap-3 items-center">
          <div className="flex flex-col gap-2">
            {renderSeat(1, 'Driver')}
            {renderSeat(2, 'Front')}
          </div>
          <div className="flex flex-col gap-1.5">
            {renderSeat(3, 'Row 2')}
            {renderSeat(4, 'Row 2')}
            {renderSeat(5, 'Row 2')}
          </div>
          <div className="flex flex-col gap-2">
            {renderSeat(6, 'Row 3')}
            {renderSeat(7, 'Row 3')}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex gap-3 items-center">
          <div className="flex flex-col gap-2">
            {renderSeat(1, 'Driver')}
            {renderSeat(2, 'Front')}
          </div>
          <div className="flex flex-col gap-1.5">
            {renderSeat(3, 'Row 2')}
            {renderSeat(4, 'Row 2')}
            {renderSeat(5, 'Row 2')}
          </div>
          <div className="flex flex-col gap-1.5">
            {renderSeat(6, 'Row 3')}
            {renderSeat(7, 'Row 3')}
            {renderSeat(8, 'Row 3')}
          </div>
          {capacity >= 10 && (
            <div className="flex flex-col gap-2">
              {renderSeat(9, 'Row 4')}
              {capacity >= 10 && renderSeat(10, 'Row 4')}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      className={`relative p-4 rounded-xl shadow-lg backdrop-blur-sm border w-fit focus:outline-none focus:ring-2 focus:ring-white/30 ${
        car.is_finalized
          ? 'border-green-400 border-2'
          : 'border-white/10'
      }`}
      style={{
        background: `linear-gradient(135deg, ${car.color}80, ${car.color}40)`
      }}
    >
      {/* Car Header */}
      <div className="mb-3">
        {/* Journey Segment Display (From/To based on viewing leg) */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">From:</span>
              {isEditingFromInline ? (
                <input
                  type="text"
                  value={fromValueInline}
                  onChange={(e) => setFromValueInline(e.target.value)}
                  onBlur={handleSaveFromInline}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveFromInline();
                    if (e.key === 'Escape') setIsEditingFromInline(false);
                  }}
                  className="text-sm px-2 py-0.5 bg-white/20 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                  autoFocus
                />
              ) : editingStopId && viewingLegIndex > 0 && storeLegs[viewingLegIndex - 1]?.id === editingStopId ? (
                <input
                  type="text"
                  value={editingStopLocation}
                  onChange={(e) => setEditingStopLocation(e.target.value)}
                  onBlur={handleSaveStopInline}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveStopInline();
                    if (e.key === 'Escape') {
                      setEditingStopId(null);
                      setEditingStopLocation('');
                    }
                  }}
                  className="text-sm px-2 py-0.5 bg-white/20 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                  autoFocus
                />
              ) : (
                <button
                  onClick={handleEditFromInline}
                  className="text-sm text-white font-medium hover:text-white/80 transition-colors"
                >
                  {viewingSegment.from}
                </button>
              )}
            </div>

            {/* Leg Navigation - Combined View & Current */}
            {totalLegs > 1 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                <button
                  onClick={() => handleSetViewingLeg(Math.max(0, viewingLegIndex - 1))}
                  disabled={viewingLegIndex === 0}
                  className="p-1 rounded transition-colors text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous leg"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                  <span className="text-sm text-white font-medium">
                    {viewingLegIndex + 1}/{totalLegs}
                  </span>
                  {viewingLegIndex === currentLegIndex && (
                    <MapPinned className="w-3 h-3 text-red-400" />
                  )}
                </div>
                <button
                  onClick={() => handleSetViewingLeg(Math.min(totalLegs - 1, viewingLegIndex + 1))}
                  disabled={viewingLegIndex === totalLegs - 1}
                  className="p-1 rounded transition-colors text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next leg"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {viewingLegIndex !== currentLegIndex && (
                  <>
                    <div className="w-px h-4 bg-white/30" />
                    <button
                      onClick={() => handleSetCurrentLeg(viewingLegIndex)}
                      className="p-1 rounded transition-colors text-white/70 hover:text-red-400 hover:bg-white/20"
                      title="Mark this leg as current"
                    >
                      <MapPinned className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Add Stop Button */}
            {isAddingStopInline ? (
              <form onSubmit={handleAddStopInline} className="flex items-center gap-1">
                <input
                  type="text"
                  value={newStopLocationInline}
                  onChange={(e) => setNewStopLocationInline(e.target.value)}
                  placeholder="Stop location"
                  className="text-sm px-2 py-0.5 bg-white/20 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/50"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                  title="Save stop"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingStopInline(false);
                    setNewStopLocationInline('');
                  }}
                  className="p-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                  title="Cancel"
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingStopInline(true)}
                className="p-1 rounded transition-colors bg-white/10 text-white hover:bg-white/20"
                title="Add stop"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">To:</span>
              {isEditingToInline ? (
                <input
                  type="text"
                  value={toValueInline}
                  onChange={(e) => setToValueInline(e.target.value)}
                  onBlur={handleSaveToInline}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveToInline();
                    if (e.key === 'Escape') setIsEditingToInline(false);
                  }}
                  className="text-sm px-2 py-0.5 bg-white/20 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                  autoFocus
                />
              ) : editingStopId && viewingLegIndex < totalLegs - 1 && storeLegs[viewingLegIndex]?.id === editingStopId ? (
                <input
                  type="text"
                  value={editingStopLocation}
                  onChange={(e) => setEditingStopLocation(e.target.value)}
                  onBlur={handleSaveStopInline}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveStopInline();
                    if (e.key === 'Escape') {
                      setEditingStopId(null);
                      setEditingStopLocation('');
                    }
                  }}
                  className="text-sm px-2 py-0.5 bg-white/20 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                  autoFocus
                />
              ) : (
                <button
                  onClick={handleEditToInline}
                  className="text-sm text-white font-medium hover:text-white/80 transition-colors"
                >
                  {viewingSegment.to}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRouteSelector(!showRouteSelector)}
              className={`p-1.5 rounded-lg transition-colors ${
                showRouteSelector
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
              }`}
              title={showRouteSelector ? 'Hide routes' : 'Load/Save route'}
            >
              <RouteIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMap(!showMap)}
              className={`p-1.5 rounded-lg transition-colors ${
                showMap
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
              }`}
              title={showMap ? 'Hide map' : 'Show map'}
            >
              <Map className="w-4 h-4" />
            </button>
            <button
              onClick={() => onCarDelete(car.id)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title Row with Car Name and Controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            {/* Car Letter Badge */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{carLetter}</span>
            </div>

            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="text-lg font-semibold bg-white/20 border border-white/30 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                  autoFocus
                  onBlur={handleNameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSubmit();
                    if (e.key === 'Escape') handleNameCancel();
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-lg font-semibold text-white hover:text-white/80 transition-colors text-left"
                >
                  {car.name}
                </button>
                {(car.custom_duration || (legDurations.length > 0 && legDurations[viewingLegIndex])) && (
                  isEditingDuration ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={customDurationValue}
                        onChange={(e) => setCustomDurationValue(e.target.value)}
                        className="w-16 px-2 py-0.5 bg-white/20 border border-white/30 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                        autoFocus
                        onBlur={() => {
                          const value = parseFloat(customDurationValue);
                          if (!isNaN(value) && value > 0) {
                            onCarUpdate(car.id, { custom_duration: value });
                          }
                          setIsEditingDuration(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = parseFloat(customDurationValue);
                            if (!isNaN(value) && value > 0) {
                              onCarUpdate(car.id, { custom_duration: value });
                            }
                            setIsEditingDuration(false);
                          }
                          if (e.key === 'Escape') {
                            setIsEditingDuration(false);
                          }
                        }}
                      />
                      <span className="text-sm text-white/70">h</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCustomDurationValue((car.custom_duration || legDurations[viewingLegIndex] || 0).toString());
                        setIsEditingDuration(true);
                      }}
                      className="text-sm text-white/70 font-medium hover:text-white/90 transition-colors"
                    >
                      ~{car.custom_duration || legDurations[viewingLegIndex]}h
                    </button>
                  )
                )}
              </div>
            )}



            {/* Finalize Toggle */}
            <button
              onClick={handleFinalizeToggle}
              className={`p-1 rounded transition-colors ${
                car.is_finalized
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-white/50 hover:text-white/70'
              }`}
              title={car.is_finalized ? 'Car is finalized (click to unlock)' : 'Click to finalize car'}
            >
              {car.is_finalized ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Route Selector */}
      {showRouteSelector && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="bg-white/5 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Route Management</h4>
              <button
                onClick={() => setShowRouteSelector(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Save Current as Route */}
            {(car.origin || car.destination) && (
              <div className="border-b border-white/10 pb-3">
                {isCreatingRoute ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newRouteName}
                      onChange={(e) => setNewRouteName(e.target.value)}
                      placeholder={`${car.origin || 'Origin'} to ${car.destination || 'Destination'}`}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/50 text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveAsRoute}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        Save Route
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingRoute(false);
                          setNewRouteName('');
                        }}
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingRoute(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save current journey as route
                  </button>
                )}
              </div>
            )}

            {/* Load Existing Route */}
            <div>
              <label className="text-xs text-white/70 mb-2 block">Load existing route:</label>
              {routes.length === 0 ? (
                <p className="text-xs text-white/50 text-center py-2">No routes available</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {routes.map(route => (
                    <button
                      key={route.id}
                      onClick={() => {
                        if (confirm(`Load route "${route.name}"? This will replace current origin, destination, and stops.`)) {
                          handleLoadRoute(route.id);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: route.color }}
                        />
                        <span className="text-left">{route.name}</span>
                      </div>
                      <span className="text-xs text-white/50">
                        {route.assigned_car_id === car.id && '✓ Assigned'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map View */}
      {showMap && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="relative w-full h-80 rounded-lg overflow-hidden">
            <div
              ref={mapContainer}
              className="w-full h-full"
            />

            {/* Route Details Overlay */}
            <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md rounded-lg shadow-xl border border-white/10 transition-all">
              {/* Minimize/Maximize Header */}
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <span className="text-xs font-medium text-white">Route Details</span>
                <button
                  onClick={() => setIsMapPanelMinimized(!isMapPanelMinimized)}
                  className="p-1 hover:bg-white/20 rounded transition-colors text-white/70 hover:text-white"
                  title={isMapPanelMinimized ? 'Maximize panel' : 'Minimize panel'}
                >
                  {isMapPanelMinimized ? (
                    <Maximize2 className="w-3 h-3" />
                  ) : (
                    <Minimize2 className="w-3 h-3" />
                  )}
                </button>
              </div>

              {!isMapPanelMinimized && (
                <div className="p-3 max-w-xs max-h-[calc(90vh-6rem)] overflow-y-auto">
                  {(car.origin || car.destination) ? (
                <div className="space-y-2 text-xs">
                  {/* Origin */}
                  <div className="flex items-start gap-2 text-white/90">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">Origin:</div>
                      {isEditingOrigin ? (
                        <input
                          type="text"
                          value={originValue}
                          onChange={(e) => setOriginValue(e.target.value)}
                          placeholder="Origin location"
                          className="w-full mt-1 px-2 py-1 bg-white/20 border border-white/30 rounded text-white placeholder-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                          autoFocus
                          onBlur={handleOriginSubmit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleOriginSubmit();
                            if (e.key === 'Escape') handleOriginCancel();
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setIsEditingOrigin(true)}
                          className="text-white/70 hover:text-white text-left w-full"
                        >
                          {car.origin || 'Click to set'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stops */}
                  {storeLegs.length > 0 && (
                    <div className="space-y-1.5 ml-5 pl-3 border-l-2 border-white/20">
                      {storeLegs.map((stop, index) => (
                        <div key={stop.id} className="bg-white/5 rounded p-2">
                          {editingStopId === stop.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingStopLocation}
                                onChange={(e) => setEditingStopLocation(e.target.value)}
                                className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleUpdateStopFromMap(stop.id)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEditStopFromMap}
                                  className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1">
                                <span className="text-white/60">Stop {index + 1}:</span>
                                <span className="text-white/90 ml-1">{stop.location || 'Not set'}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditStopFromMap(stop.id, stop.location || '')}
                                  className="p-0.5 hover:bg-white/20 rounded transition-colors text-white/50 hover:text-blue-300"
                                  title="Edit stop"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStopFromMap(stop.id)}
                                  className="p-0.5 hover:bg-white/20 rounded transition-colors text-white/50 hover:text-red-300"
                                  title="Delete stop"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Stop Button/Form */}
                  {isAddingStopInMap ? (
                    <form onSubmit={handleAddStopFromMap} className="ml-5 pl-3 border-l-2 border-white/20 space-y-2">
                      <input
                        type="text"
                        value={newStopLocationMap}
                        onChange={(e) => setNewStopLocationMap(e.target.value)}
                        placeholder="Stop location"
                        className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          type="submit"
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingStopInMap(false);
                            setNewStopLocationMap('');
                          }}
                          className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsAddingStopInMap(true)}
                      className="ml-5 pl-3 flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add stop
                    </button>
                  )}

                  {/* Route Selector in Map View */}
                  {!showRouteSelector && routes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <button
                        onClick={() => setShowRouteSelector(true)}
                        className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors"
                      >
                        <RouteIcon className="w-3 h-3" />
                        Load/Save route
                      </button>
                    </div>
                  )}

                  {/* Destination */}
                  <div className="flex items-start gap-2 text-white/90">
                    <Navigation className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">Destination:</div>
                      {isEditingDestination ? (
                        <input
                          type="text"
                          value={destinationValue}
                          onChange={(e) => setDestinationValue(e.target.value)}
                          placeholder="Destination location"
                          className="w-full mt-1 px-2 py-1 bg-white/20 border border-white/30 rounded text-white placeholder-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                          autoFocus
                          onBlur={handleDestinationSubmit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleDestinationSubmit();
                            if (e.key === 'Escape') handleDestinationCancel();
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setIsEditingDestination(true)}
                          className="text-white/70 hover:text-white text-left w-full"
                        >
                          {car.destination || 'Click to set'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                    <div className="text-xs text-white/70">
                      <p className="mb-2 font-medium text-white/90">Set route details:</p>
                      <p>1. Click to set origin and destination above</p>
                      <p>2. Add intermediate stops as needed</p>
                      <p>3. Use leg buttons to view different segments</p>
                      <p>4. Use red buttons to mark current position</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Car-shaped Seats Layout */}
      {renderSeatsLayout()}
    </div>
  );
}
