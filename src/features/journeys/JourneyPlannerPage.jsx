import React, { useState, useEffect, useRef } from 'react';
import { Plus, Car, Home as HomeIcon, Users, ArrowRight, ArrowLeft, Star, Train } from 'lucide-react';
import { useLogisticsStore } from '../../store/logisticsStore';
import { useVehicleStore } from '../../store/vehicleStore';
import CarCard from './components/CarCard';
import SidePanel from './components/SidePanel';
import PublicTransportCard from './components/PublicTransportCard';
import RoomCard from './components/RoomCard';
import TableCard from './components/TableCard';

const carColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

const roomColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

const tableColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

const inputStyle = {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid #d1d1d1',
  background: '#fff',
  color: '#000',
  outline: 'none',
};

const btnPrimary = {
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: '500',
  background: '#000',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
};

const btnSecondary = {
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: '500',
  background: '#f0f0f0',
  color: '#333',
  border: '1px solid #d1d1d1',
  cursor: 'pointer',
};

export default function JourneyPlannerPage() {
  const cars = useLogisticsStore(s => s.cars);
  const people = useLogisticsStore(s => s.people);
  const rooms = useLogisticsStore(s => s.rooms);
  const tables = useLogisticsStore(s => s.tables);
  const routes = useLogisticsStore(s => s.routes);
  const carLegs = useLogisticsStore(s => s.carLegs);

  const createCar = useLogisticsStore(s => s.createCar);
  const updateCar = useLogisticsStore(s => s.updateCar);
  const deleteCar = useLogisticsStore(s => s.deleteCar);
  const createPerson = useLogisticsStore(s => s.createPerson);
  const assignPersonToCar = useLogisticsStore(s => s.assignPersonToCar);
  const assignPersonToRoom = useLogisticsStore(s => s.assignPersonToRoom);
  const assignPersonToTable = useLogisticsStore(s => s.assignPersonToTable);
  const deletePerson = useLogisticsStore(s => s.deletePerson);
  const createRoom = useLogisticsStore(s => s.createRoom);
  const updateRoom = useLogisticsStore(s => s.updateRoom);
  const deleteRoom = useLogisticsStore(s => s.deleteRoom);
  const createTable = useLogisticsStore(s => s.createTable);
  const updateTable = useLogisticsStore(s => s.updateTable);
  const deleteTable = useLogisticsStore(s => s.deleteTable);
  const createRoute = useLogisticsStore(s => s.createRoute);
  const updateRoute = useLogisticsStore(s => s.updateRoute);
  const createRouteStop = useLogisticsStore(s => s.createRouteStop);
  const getStopsForRoute = useLogisticsStore(s => s.getStopsForRoute);

  // Fleet integration
  const vehicles = useVehicleStore(s => s.vehicles);
  const updateVehicle = useVehicleStore(s => s.updateVehicle);

  const [draggedPersonId, setDraggedPersonId] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Ctrl+Z keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, people]);

  const [newCarName, setNewCarName] = useState('');
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [carCapacity, setCarCapacity] = useState(5);
  const [newCarOrigin, setNewCarOrigin] = useState('');
  const [newCarDestination, setNewCarDestination] = useState('');
  const [linkedVehicleId, setLinkedVehicleId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(4);
  const [newRoomBedspace, setNewRoomBedspace] = useState(2);
  const [newRoomFloor, setNewRoomFloor] = useState('G');
  const [newRoomIsEnsuite, setNewRoomIsEnsuite] = useState(false);
  const [newRoomPhotoUrl, setNewRoomPhotoUrl] = useState('');
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableType, setNewTableType] = useState('rectangular');
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [activeTab, setActiveTab] = useState('transportation');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [journeyDirection, setJourneyDirection] = useState('outbound');

  // Refs for inputs that need focus on form open — preventScroll avoids page-jump on re-render
  const carSelectRef = useRef(null);
  const roomNameRef = useRef(null);
  const tableNameRef = useRef(null);
  useEffect(() => { if (isAddingCar && carSelectRef.current) carSelectRef.current.focus({ preventScroll: true }); }, [isAddingCar]);
  useEffect(() => { if (isAddingRoom && roomNameRef.current) roomNameRef.current.focus({ preventScroll: true }); }, [isAddingRoom]);
  useEffect(() => { if (isAddingTable && tableNameRef.current) tableNameRef.current.focus({ preventScroll: true }); }, [isAddingTable]);

  // Sync journey car destinations to fleet vehicles
  const syncCarToFleet = (car) => {
    if (car.linkedVehicleId && car.destination) {
      updateVehicle(car.linkedVehicleId, { destination: car.destination });
    }
  };

  const handleCarUpdate = (carId, updates) => {
    updateCar(carId, updates);
    const car = cars.find(c => c.id === carId);
    if (car) {
      const merged = { ...car, ...updates };
      syncCarToFleet(merged);
    }
  };

  const recordUndo = (personId) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    const undoAction = {
      personId,
      previousState: {
        car_id: person.car_id,
        seat_position: person.seat_position,
        car_leg_id: person.car_leg_id,
        room_id: person.room_id,
        bed_position: person.bed_position,
        table_id: person.table_id,
        table_position: person.table_position,
      },
    };

    setUndoStack(prev => [...prev.slice(-49), undoAction]);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    const { personId, previousState } = lastAction;

    try {
      assignPersonToCar(personId, {
        car_id: previousState.car_id,
        seat_position: previousState.seat_position,
        car_leg_id: previousState.car_leg_id,
      }, journeyDirection);

      assignPersonToRoom(personId, {
        room_id: previousState.room_id,
        bed_position: previousState.bed_position,
      });

      assignPersonToTable(personId, {
        table_id: previousState.table_id,
        table_position: previousState.table_position,
      });

      setUndoStack(prev => prev.slice(0, -1));
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  const handlePersonSwapInCar = async (draggedId, targetId) => {
    const draggedPerson = people.find(p => p.id === draggedId);
    const targetPerson = people.find(p => p.id === targetId);
    if (!draggedPerson || !targetPerson) return;

    recordUndo(draggedId);
    recordUndo(targetId);

    const draggedCarId = journeyDirection === 'outbound' ? draggedPerson.outbound_car_id : draggedPerson.return_car_id;
    const draggedSeatPos = journeyDirection === 'outbound' ? draggedPerson.outbound_seat_position : draggedPerson.return_seat_position;
    const targetCarId = journeyDirection === 'outbound' ? targetPerson.outbound_car_id : targetPerson.return_car_id;
    const targetSeatPos = journeyDirection === 'outbound' ? targetPerson.outbound_seat_position : targetPerson.return_seat_position;

    assignPersonToCar(draggedId, { car_id: targetCarId, seat_position: targetSeatPos }, journeyDirection);
    assignPersonToCar(targetId, { car_id: draggedCarId, seat_position: draggedSeatPos }, journeyDirection);
    setDraggedPersonId(null);
  };

  const handlePersonSwapInRoom = async (draggedId, targetId) => {
    const draggedPerson = people.find(p => p.id === draggedId);
    const targetPerson = people.find(p => p.id === targetId);
    if (!draggedPerson || !targetPerson) return;

    recordUndo(draggedId);
    recordUndo(targetId);

    assignPersonToRoom(draggedId, { room_id: targetPerson.room_id, bed_position: targetPerson.bed_position });
    assignPersonToRoom(targetId, { room_id: draggedPerson.room_id, bed_position: draggedPerson.bed_position });
    setDraggedPersonId(null);
  };

  const handlePersonSwapInTable = async (draggedId, targetId) => {
    const draggedPerson = people.find(p => p.id === draggedId);
    const targetPerson = people.find(p => p.id === targetId);
    if (!draggedPerson || !targetPerson) return;

    recordUndo(draggedId);
    recordUndo(targetId);

    assignPersonToTable(draggedId, { table_id: targetPerson.table_id, table_position: targetPerson.table_position });
    assignPersonToTable(targetId, { table_id: draggedPerson.table_id, table_position: draggedPerson.table_position });
    setDraggedPersonId(null);
  };

  const handlePersonDropOnCar = async (personId, carId, seatPosition, legId) => {
    recordUndo(personId);
    assignPersonToCar(personId, { car_id: carId, seat_position: seatPosition, car_leg_id: legId || null }, journeyDirection);
    setDraggedPersonId(null);
  };

  const handlePersonDropOnPublicTransport = async (personId) => {
    recordUndo(personId);
    assignPersonToCar(personId, { car_id: -1, seat_position: null }, journeyDirection);
    setDraggedPersonId(null);
  };

  const handlePersonRemove = async (personId) => {
    recordUndo(personId);
    assignPersonToCar(personId, { car_id: null, seat_position: null }, journeyDirection);
  };

  const handlePersonDropOnRoom = async (personId, roomId, bedPosition) => {
    recordUndo(personId);
    assignPersonToRoom(personId, { room_id: roomId, bed_position: bedPosition });
    setDraggedPersonId(null);
  };

  const handlePersonRemoveFromRoom = async (personId) => {
    recordUndo(personId);
    assignPersonToRoom(personId, { room_id: null, bed_position: null });
  };

  const handlePersonDropOnTable = async (personId, tableId, position) => {
    recordUndo(personId);
    assignPersonToTable(personId, { table_id: tableId, table_position: position });
    setDraggedPersonId(null);
  };

  const handlePersonRemoveFromTable = async (personId) => {
    recordUndo(personId);
    assignPersonToTable(personId, { table_id: null, table_position: null });
  };

  const handleCreateCar = async (e) => {
    e.preventDefault();
    const isFleetCar = linkedVehicleId && linkedVehicleId !== '__other__';
    const carName = isFleetCar ? newCarName : newCarName.trim();
    if (!carName) return;

    const randomColor = carColors[Math.floor(Math.random() * carColors.length)];
    const actualLinkedId = isFleetCar ? linkedVehicleId : undefined;
    createCar({
      name: carName,
      color: randomColor,
      capacity: carCapacity,
      origin: newCarOrigin.trim() || undefined,
      destination: newCarDestination.trim() || undefined,
      linkedVehicleId: actualLinkedId,
    });
    // Sync destination to fleet vehicle
    if (actualLinkedId && newCarDestination.trim()) {
      updateVehicle(actualLinkedId, { destination: newCarDestination.trim() });
    }
    setNewCarName('');
    setCarCapacity(5);
    setNewCarOrigin('');
    setNewCarDestination('');
    setLinkedVehicleId('');
    setIsAddingCar(false);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      const randomColor = roomColors[Math.floor(Math.random() * roomColors.length)];
      createRoom({
        name: newRoomName.trim(),
        color: randomColor,
        capacity: newRoomCapacity,
        bedspace: newRoomBedspace,
        floor: newRoomFloor,
        is_ensuite: newRoomIsEnsuite,
        photo_url: newRoomPhotoUrl.trim() || undefined
      });
      setNewRoomName('');
      setNewRoomCapacity(4);
      setNewRoomBedspace(2);
      setNewRoomFloor('G');
      setNewRoomIsEnsuite(false);
      setNewRoomPhotoUrl('');
      setIsAddingRoom(false);
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    if (newTableName.trim()) {
      const randomColor = tableColors[Math.floor(Math.random() * tableColors.length)];
      createTable({
        name: newTableName.trim(),
        color: randomColor,
        capacity: newTableCapacity,
        table_type: newTableType
      });
      setNewTableName('');
      setNewTableCapacity(4);
      setNewTableType('rectangular');
      setIsAddingTable(false);
    }
  };

  const tabs = [
    { id: 'transportation', label: 'Transportation', icon: Car },
    { id: 'rooms', label: 'Rooms', icon: HomeIcon },
    { id: 'tables', label: 'Tables', icon: Users },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0, padding: '24px', overflowY: 'auto' }}>
        {/* Header bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {/* Journey Direction Toggle */}
            <div style={{ display: 'flex', background: '#e0e0e0', padding: '2px', gap: '2px' }}>
              <button
                onClick={() => setJourneyDirection('outbound')}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: journeyDirection === 'outbound' ? '#000' : 'transparent',
                  color: journeyDirection === 'outbound' ? '#fff' : '#666',
                }}
              >
                <ArrowRight size={14} /> Outbound
              </button>
              <button
                onClick={() => setJourneyDirection('return')}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: journeyDirection === 'return' ? '#000' : 'transparent',
                  color: journeyDirection === 'return' ? '#fff' : '#666',
                }}
              >
                <ArrowLeft size={14} /> Return
              </button>
            </div>

            <div style={{ width: '1px', height: '28px', background: '#d1d1d1' }} />

            {/* Tab buttons */}
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: isActive ? '1px solid #000' : '1px solid #d1d1d1',
                    background: isActive ? '#000' : '#fff',
                    color: isActive ? '#fff' : '#333',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}

            <div style={{ width: '1px', height: '28px', background: '#d1d1d1' }} />

            {/* VIP toggle */}
            <button
              onClick={() => setShowStars(!showStars)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '500',
                border: '1px solid #d1d1d1',
                background: showStars ? '#fef3c7' : '#fff',
                color: '#333',
                cursor: 'pointer',
              }}
            >
              <Star size={14} fill={showStars ? '#f59e0b' : 'none'} color={showStars ? '#f59e0b' : '#999'} />
              VIP
            </button>

            {/* Add button */}
            <button
              onClick={() => {
                if (activeTab === 'transportation') setIsAddingCar(true);
                else if (activeTab === 'rooms') setIsAddingRoom(true);
                else if (activeTab === 'tables') setIsAddingTable(true);
              }}
              style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              Add {activeTab === 'transportation' ? 'Car' : activeTab === 'rooms' ? 'Room' : 'Table'}
            </button>
          </div>

          {/* Add Car Form */}
          {activeTab === 'transportation' && isAddingCar && (
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '16px', marginBottom: '16px' }}>
              <form onSubmit={handleCreateCar} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={linkedVehicleId}
                  onChange={(e) => {
                    const vid = e.target.value;
                    setLinkedVehicleId(vid);
                    if (vid && vid !== '__other__') {
                      const v = vehicles.find(x => x.id === vid);
                      if (v) {
                        setNewCarName(`${v.make} ${v.model}`);
                        const cap = v.capacity || (v.is_two_seater ? 2 : 5);
                        setCarCapacity(cap);
                      }
                    } else {
                      setNewCarName('');
                      setCarCapacity(5);
                    }
                  }}
                  style={{ ...inputStyle, minWidth: '200px' }}
                  ref={carSelectRef}
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</option>
                  ))}
                  <option value="__other__">Other (custom car)</option>
                </select>
                {linkedVehicleId === '__other__' && (
                  <input type="text" value={newCarName} onChange={(e) => setNewCarName(e.target.value)} placeholder="Car name" style={inputStyle} />
                )}
                {linkedVehicleId === '__other__' && (
                  <select value={carCapacity} onChange={(e) => setCarCapacity(parseInt(e.target.value))} style={inputStyle}>
                    <option value="2">2-seater</option>
                    <option value="5">5-seater</option>
                    <option value="7">7-seater</option>
                    <option value="9">Van (9+)</option>
                  </select>
                )}
                {linkedVehicleId && linkedVehicleId !== '__other__' && (
                  <span style={{ fontSize: '13px', color: '#666', padding: '8px 0' }}>{carCapacity}-seater</span>
                )}
                <input type="text" value={newCarOrigin} onChange={(e) => setNewCarOrigin(e.target.value)} placeholder="Origin" style={inputStyle} />
                <input type="text" value={newCarDestination} onChange={(e) => setNewCarDestination(e.target.value)} placeholder="Destination" style={inputStyle} />
                <button type="submit" style={btnPrimary} disabled={!linkedVehicleId || (linkedVehicleId === '__other__' && !newCarName.trim())}>Add</button>
                <button type="button" onClick={() => { setIsAddingCar(false); setNewCarName(''); setCarCapacity(5); setNewCarOrigin(''); setNewCarDestination(''); setLinkedVehicleId(''); }} style={btnSecondary}>Cancel</button>
              </form>
            </div>
          )}

          {/* Add Room Form */}
          {activeTab === 'rooms' && isAddingRoom && (
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '16px', marginBottom: '16px' }}>
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name" style={inputStyle} ref={roomNameRef} />
                <label style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Capacity:
                  <input type="number" min="1" max="20" value={newRoomCapacity} onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || 4)} style={{ ...inputStyle, width: '60px' }} />
                </label>
                <label style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Beds:
                  <input type="number" min="1" max="10" value={newRoomBedspace} onChange={(e) => setNewRoomBedspace(parseInt(e.target.value) || 2)} style={{ ...inputStyle, width: '60px' }} />
                </label>
                <label style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Floor:
                  <select value={newRoomFloor} onChange={(e) => setNewRoomFloor(e.target.value)} style={inputStyle}>
                    <option value="G">G</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </label>
                <label style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newRoomIsEnsuite} onChange={(e) => setNewRoomIsEnsuite(e.target.checked)} />
                  Ensuite
                </label>
                <button type="submit" style={btnPrimary}>Add</button>
                <button type="button" onClick={() => { setIsAddingRoom(false); setNewRoomName(''); }} style={btnSecondary}>Cancel</button>
              </form>
            </div>
          )}

          {/* Add Table Form */}
          {activeTab === 'tables' && isAddingTable && (
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '16px', marginBottom: '16px' }}>
              <form onSubmit={handleCreateTable} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Table name" style={inputStyle} ref={tableNameRef} />
                <label style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Capacity:
                  <input type="number" min="2" max="20" value={newTableCapacity} onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 4)} style={{ ...inputStyle, width: '60px' }} />
                </label>
                <label style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Type:
                  <select value={newTableType} onChange={(e) => setNewTableType(e.target.value)} style={inputStyle}>
                    <option value="rectangular">Rectangular</option>
                    <option value="round">Round</option>
                  </select>
                </label>
                <button type="submit" style={btnPrimary}>Add</button>
                <button type="button" onClick={() => { setIsAddingTable(false); setNewTableName(''); }} style={btnSecondary}>Cancel</button>
              </form>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {activeTab === 'transportation' ? (
            <>
              {(() => {
                const filteredPeople = people.map(person => ({
                  ...person,
                  car_id: journeyDirection === 'outbound' ? person.outbound_car_id : person.return_car_id,
                  seat_position: journeyDirection === 'outbound' ? person.outbound_seat_position : person.return_seat_position,
                  car_leg_id: journeyDirection === 'outbound' ? person.outbound_car_leg_id : person.return_car_leg_id,
                }));

                return (
                  <>
                    {cars.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
                        <Car size={48} color="#ccc" style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>No cars added yet</h3>
                        <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>Add your first car to start organizing people</p>
                        <button onClick={() => setIsAddingCar(true)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Plus size={16} /> Add First Car
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-6">
                        {cars.map((car, index) => (
                          <CarCard
                            key={car.id}
                            car={car}
                            carLetter={String.fromCharCode(65 + index)}
                            people={filteredPeople}
                            routes={routes}
                            onPersonDrop={(personId, seatPosition) => handlePersonDropOnCar(personId, car.id, seatPosition)}
                            onPersonRemove={handlePersonRemove}
                            onPersonSwap={handlePersonSwapInCar}
                            onCarDelete={deleteCar}
                            onCarUpdate={handleCarUpdate}
                            onRouteCreate={createRoute}
                            onRouteUpdate={updateRoute}
                            onRouteStopCreate={createRouteStop}
                            getRouteStops={getStopsForRoute}
                            draggedPersonId={draggedPersonId}
                            onPersonDragStart={setDraggedPersonId}
                            onPersonDragEnd={() => setDraggedPersonId(null)}
                            onPeopleRefetch={() => {}}
                            showStars={showStars}
                          />
                        ))}
                      </div>
                    )}

                    {/* Public Transport */}
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Train size={18} /> Public Transport
                      </h2>
                      <PublicTransportCard
                        people={filteredPeople}
                        onPersonDrop={handlePersonDropOnPublicTransport}
                        onPersonRemove={handlePersonRemove}
                        draggedPersonId={draggedPersonId}
                        onPersonDragStart={setDraggedPersonId}
                        onPersonDragEnd={() => setDraggedPersonId(null)}
                        showStars={showStars}
                      />
                    </div>
                  </>
                );
              })()}
            </>
          ) : activeTab === 'rooms' ? (
            <>
              {rooms.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
                  <HomeIcon size={48} color="#ccc" style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>No rooms added yet</h3>
                  <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>Add your first room to start organizing people</p>
                  <button onClick={() => setIsAddingRoom(true)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} /> Add First Room
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {['G', '1', '2', '3'].map(floor => {
                    const floorRooms = rooms.filter(room => room.floor === floor);
                    if (floorRooms.length === 0) return null;

                    return (
                      <div key={floor}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                          Floor {floor === 'G' ? 'Ground' : floor}
                        </h2>
                        <div className="flex flex-wrap gap-6">
                          {floorRooms.map(room => (
                            <RoomCard
                              key={room.id}
                              room={room}
                              people={people}
                              onPersonDrop={(personId, bedPosition) => handlePersonDropOnRoom(personId, room.id, bedPosition)}
                              onPersonRemove={handlePersonRemoveFromRoom}
                              onPersonSwap={handlePersonSwapInRoom}
                              onRoomDelete={deleteRoom}
                              onRoomUpdate={updateRoom}
                              draggedPersonId={draggedPersonId}
                              onPersonDragStart={setDraggedPersonId}
                              onPersonDragEnd={() => setDraggedPersonId(null)}
                              showStars={showStars}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : activeTab === 'tables' ? (
            <>
              {tables.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
                  <Users size={48} color="#ccc" style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>No tables added yet</h3>
                  <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>Add your first table to start organizing seating</p>
                  <button onClick={() => setIsAddingTable(true)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} /> Add First Table
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-6">
                  {tables.map(table => (
                    <TableCard
                      key={table.id}
                      table={table}
                      people={people}
                      onPersonDrop={(personId, position) => handlePersonDropOnTable(personId, table.id, position)}
                      onPersonRemove={handlePersonRemoveFromTable}
                      onPersonSwap={handlePersonSwapInTable}
                      onTableDelete={deleteTable}
                      onTableUpdate={updateTable}
                      draggedPersonId={draggedPersonId}
                      onPersonDragStart={setDraggedPersonId}
                      onPersonDragEnd={() => setDraggedPersonId(null)}
                      showStars={showStars}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Side Panel */}
      <SidePanel
        people={people}
        cars={cars}
        rooms={rooms}
        tables={tables}
        carLegs={carLegs}
        onCreatePerson={async (name, canDrive, isVip) => { createPerson({ name, can_drive: canDrive, is_vip: isVip }); }}
        onPersonDragStart={setDraggedPersonId}
        onPersonDragEnd={() => setDraggedPersonId(null)}
        draggedPersonId={draggedPersonId}
        onPersonDelete={deletePerson}
        isVisible={isPanelVisible}
        onToggleVisibility={() => setIsPanelVisible(!isPanelVisible)}
        currentStageIndex={currentStageIndex}
        onStageChange={setCurrentStageIndex}
        journeyDirection={journeyDirection}
        showStars={showStars}
      />
    </div>
  );
}
