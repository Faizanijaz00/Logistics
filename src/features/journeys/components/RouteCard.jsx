import { useState, useEffect, useRef } from 'react';
import { Trash2, CheckCircle2, Circle, Car as CarIcon, MapPin, Navigation, Plus, Clock, X, GripVertical } from 'lucide-react';
import { useLogisticsStore } from '../../../store/logisticsStore';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'REDACTED_USE_VITE_MAPBOX_TOKEN';

export default function RouteCard({
  route,
  cars,
  onRouteDelete,
  onRouteUpdate,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(route.name);
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState(route.assigned_car_id);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [newStopLocation, setNewStopLocation] = useState('');
  const [newStopTime, setNewStopTime] = useState('');
  const [draggedStopId, setDraggedStopId] = useState(null);
  const [dragOverStopId, setDragOverStopId] = useState(null);
  const [editingStopId, setEditingStopId] = useState(null);
  const [editStopLocation, setEditStopLocation] = useState('');
  const [editStopTime, setEditStopTime] = useState('');
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  const allRouteStops = useLogisticsStore(s => s.routeStops);
  const stops = allRouteStops.filter(s => s.route_id === route.id).sort((a, b) => a.stop_order - b.stop_order);
  const storeCreateRouteStop = useLogisticsStore(s => s.createRouteStop);
  const storeUpdateRouteStop = useLogisticsStore(s => s.updateRouteStop);
  const storeDeleteRouteStop = useLogisticsStore(s => s.deleteRouteStop);

  const assignedCar = cars.find(car => car.id === route.assigned_car_id);

  // Update map when stops change
  useEffect(() => {
    if (!map.current) return;

    const updateMap = async () => {
      try {
        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Build list of all locations: origin, stops (sorted), destination
        const allLocations = [
          { location: route.origin, label: 'Origin', type: 'origin' },
          ...stops.map((stop, index) => ({
            location: stop.location,
            label: `Stop ${index + 1}${stop.scheduled_time ? ` (${stop.scheduled_time})` : ''}`,
            type: 'stop',
            time: stop.scheduled_time
          })),
          { location: route.destination, label: 'Destination', type: 'destination' }
        ];

        // Geocode all locations
        const geocodedLocations = await Promise.all(
          allLocations.map(async (loc) => {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(loc.location)}.json?access_token=${MAPBOX_TOKEN}`
            );
            const data = await response.json();
            const coords = data.features?.[0]?.center;
            return coords ? { ...loc, coords } : null;
          })
        );

        const validLocations = geocodedLocations.filter(loc => loc !== null);

        if (validLocations.length < 2) {
          console.error('Not enough valid locations');
          return;
        }

        // Get directions through all points
        const coordsString = validLocations.map(loc => `${loc.coords[0]},${loc.coords[1]}`).join(';');
        const directionsResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );

        const directionsData = await directionsResponse.json();
        const routeGeometry = directionsData.routes?.[0]?.geometry;

        if (!routeGeometry) {
          console.error('Could not get route');
          return;
        }

        // Update route layer
        if (map.current.getSource('route')) {
          map.current.getSource('route').setData({
            type: 'Feature',
            properties: {},
            geometry: routeGeometry,
          });
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: routeGeometry,
            },
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': route.color,
              'line-width': 4,
            },
          });
        }

        // Add markers for all locations
        validLocations.forEach((loc) => {
          const markerColor = loc.type === 'origin' ? route.color :
                             loc.type === 'destination' ? route.color :
                             '#FFA500'; // Orange for stops

          const marker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat(loc.coords)
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${loc.label}:</strong><br>${loc.location}`))
            .addTo(map.current);

          markers.current.push(marker);
        });

        // Fit bounds to show all points
        const bounds = new mapboxgl.LngLatBounds();
        validLocations.forEach(loc => bounds.extend(loc.coords));
        map.current.fitBounds(bounds, { padding: 50 });
      } catch (error) {
        console.error('Error updating map:', error);
      }
    };

    updateMap();
  }, [stops, route.origin, route.destination, route.color]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.1278, 51.5074],
      zoom: 9,
      interactive: true,
    });

    map.current = initMap;
    initMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const handleFinalizeToggle = () => {
    onRouteUpdate(route.id, { is_finalized: !route.is_finalized });
  };

  const handleNameSubmit = () => {
    onRouteUpdate(route.id, { name: nameValue });
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setNameValue(route.name);
    setIsEditingName(false);
  };

  const handleCarSubmit = () => {
    onRouteUpdate(route.id, { assigned_car_id: selectedCarId });
    setIsEditingCar(false);
  };

  const handleCarCancel = () => {
    setSelectedCarId(route.assigned_car_id);
    setIsEditingCar(false);
  };

  const handleAddStop = async (e) => {
    e.preventDefault();
    if (newStopLocation.trim()) {
      await storeCreateRouteStop({
        route_id: route.id,
        location: newStopLocation.trim(),
        stop_order: stops.length + 1,
        scheduled_time: newStopTime || undefined,
      });
      setNewStopLocation('');
      setNewStopTime('');
      setIsAddingStop(false);
    }
  };

  const handleStopDragStart = (stopId) => {
    setDraggedStopId(stopId);
  };

  const handleStopDragOver = (e, stopId) => {
    e.preventDefault();
    setDragOverStopId(stopId);
  };

  const handleStopDrop = async (e, targetStopId) => {
    e.preventDefault();

    if (!draggedStopId || draggedStopId === targetStopId) {
      setDraggedStopId(null);
      setDragOverStopId(null);
      return;
    }

    const draggedStop = stops.find(s => s.id === draggedStopId);
    const targetStop = stops.find(s => s.id === targetStopId);

    if (!draggedStop || !targetStop) {
      setDraggedStopId(null);
      setDragOverStopId(null);
      return;
    }

    // Reorder stops
    const oldOrder = draggedStop.stop_order;
    const newOrder = targetStop.stop_order;

    // Update all affected stops
    if (oldOrder < newOrder) {
      // Moving down: shift stops between old and new position up
      for (const stop of stops) {
        if (stop.stop_order > oldOrder && stop.stop_order <= newOrder) {
          await storeUpdateRouteStop(stop.id, { stop_order: stop.stop_order - 1 });
        }
      }
    } else {
      // Moving up: shift stops between new and old position down
      for (const stop of stops) {
        if (stop.stop_order >= newOrder && stop.stop_order < oldOrder) {
          await storeUpdateRouteStop(stop.id, { stop_order: stop.stop_order + 1 });
        }
      }
    }

    // Update the dragged stop to new position
    await storeUpdateRouteStop(draggedStopId, { stop_order: newOrder });

    setDraggedStopId(null);
    setDragOverStopId(null);
  };

  const handleStopDragEnd = () => {
    setDraggedStopId(null);
    setDragOverStopId(null);
  };

  const handleEditStop = (stop) => {
    setEditingStopId(stop.id);
    setEditStopLocation(stop.location);
    setEditStopTime(stop.scheduled_time || '');
  };

  const handleStopEditSubmit = async (stopId) => {
    if (editStopLocation.trim()) {
      await storeUpdateRouteStop(stopId, {
        location: editStopLocation.trim(),
        scheduled_time: editStopTime || null,
      });
      setEditingStopId(null);
      setEditStopLocation('');
      setEditStopTime('');
    }
  };

  const handleStopEditCancel = () => {
    setEditingStopId(null);
    setEditStopLocation('');
    setEditStopTime('');
  };

  return (
    <div
      className={`relative rounded-xl shadow-lg backdrop-blur-sm border w-full max-w-2xl ${
        route.is_finalized ? 'border-green-400 border-2' : 'border-white/10'
      }`}
      style={{
        background: `linear-gradient(135deg, ${route.color}80, ${route.color}40)`
      }}
    >
      {/* Route Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
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
              <button
                onClick={() => setIsEditingName(true)}
                className="text-lg font-semibold text-white hover:text-white/80 transition-colors text-left"
              >
                {route.name}
              </button>
            )}

            {/* Finalize Toggle */}
            <button
              onClick={handleFinalizeToggle}
              className={`p-1 rounded transition-colors ${
                route.is_finalized
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-white/50 hover:text-white/70'
              }`}
              title={route.is_finalized ? 'Route is finalized (click to unlock)' : 'Click to finalize route'}
            >
              {route.is_finalized ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>

            {/* Car Assignment - Moved to header */}
            <div className="flex items-center gap-2 text-sm text-white/90 ml-4">
              <CarIcon className="w-4 h-4" />
              {isEditingCar ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCarId || ''}
                    onChange={(e) => setSelectedCarId(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-white/20 border border-white/30 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                    autoFocus
                  >
                    <option value="">No car assigned</option>
                    {cars.map(car => (
                      <option key={car.id} value={car.id}>{car.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCarSubmit}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCarCancel}
                    className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingCar(true)}
                  className="hover:text-white transition-colors"
                >
                  {assignedCar ? (
                    <span>Assigned to: <strong>{assignedCar.name}</strong></span>
                  ) : (
                    <span className="text-white/60">Click to assign car</span>
                  )}
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => onRouteDelete(route.id)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Container with Overlay */}
      <div className="relative w-full h-96 rounded-b-xl">
        <div
          ref={mapContainer}
          className="w-full h-full rounded-b-xl"
        />

        {/* Route Details Panel - Inside Map */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md rounded-lg shadow-2xl p-4 max-w-sm border border-white/10">
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-white/90">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Origin:</div>
                <div className="text-white/70">{route.origin}</div>
              </div>
            </div>

            {/* Stops Section */}
            {stops.length > 0 && (
              <div className="space-y-1 ml-6 pl-4 border-l-2 border-white/20">
                {stops.map((stop, index) => (
                  editingStopId === stop.id ? (
                    <div key={stop.id} className="bg-white/10 rounded px-2 py-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60">Stop {index + 1}:</span>
                      </div>
                      <input
                        type="text"
                        value={editStopLocation}
                        onChange={(e) => setEditStopLocation(e.target.value)}
                        placeholder="Location"
                        className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                        autoFocus
                      />
                      <input
                        type="time"
                        value={editStopTime}
                        onChange={(e) => setEditStopTime(e.target.value)}
                        placeholder="Time (optional)"
                        className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStopEditSubmit(stop.id)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleStopEditCancel}
                          className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={stop.id}
                      draggable
                      onDragStart={() => handleStopDragStart(stop.id)}
                      onDragOver={(e) => handleStopDragOver(e, stop.id)}
                      onDrop={(e) => handleStopDrop(e, stop.id)}
                      onDragEnd={handleStopDragEnd}
                      className={`flex items-center justify-between gap-2 text-sm text-white/90 bg-white/10 rounded px-2 py-1 cursor-move transition-all ${
                        draggedStopId === stop.id ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverStopId === stop.id && draggedStopId !== stop.id ? 'border-2 border-dashed border-white/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-3 h-3 text-white/40" />
                        <span className="text-xs text-white/60">Stop {index + 1}:</span>
                        <button
                          onClick={() => handleEditStop(stop)}
                          className="text-white/80 hover:text-white transition-colors text-left"
                        >
                          {stop.location}
                        </button>
                        {stop.scheduled_time && (
                          <span className="flex items-center gap-1 text-xs text-white/60">
                            <Clock className="w-3 h-3" />
                            {stop.scheduled_time}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => storeDeleteRouteStop(stop.id)}
                        className="p-0.5 hover:bg-white/20 rounded transition-colors text-white/50 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Add Stop Button/Form */}
            {isAddingStop ? (
              <form onSubmit={handleAddStop} className="ml-6 pl-4 border-l-2 border-white/20 space-y-2">
                <input
                  type="text"
                  value={newStopLocation}
                  onChange={(e) => setNewStopLocation(e.target.value)}
                  placeholder="Stop location (e.g., 'Philadelphia, PA')"
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newStopTime}
                    onChange={(e) => setNewStopTime(e.target.value)}
                    placeholder="Time (optional)"
                    className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingStop(false);
                      setNewStopLocation('');
                      setNewStopTime('');
                    }}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingStop(true)}
                className="ml-6 pl-4 flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add stop
              </button>
            )}

            <div className="flex items-start gap-2 text-sm text-white/90">
              <Navigation className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Destination:</div>
                <div className="text-white/70">{route.destination}</div>
              </div>
            </div>

            {/* Distance and Duration */}
            {(route.estimated_distance || route.estimated_duration) && (
              <div className="flex gap-4 text-xs text-white/70">
                {route.estimated_distance && (
                  <div>Distance: {route.estimated_distance.toFixed(1)} km</div>
                )}
                {route.estimated_duration && (
                  <div>Duration: {Math.round(route.estimated_duration)} min</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
