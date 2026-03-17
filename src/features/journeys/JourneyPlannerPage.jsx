import React, { useState, useEffect } from 'react';
import { Plus, Car, Home as HomeIcon, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLogisticsStore } from '../../store/logisticsStore';
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

export default function JourneyPlannerPage() {
  const navigate = useNavigate();

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

    setUndoStack(prev => [...prev.slice(-49), undoAction]); // Keep last 50 actions
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    const { personId, previousState } = lastAction;

    try {
      // Restore all assignment states for both journey directions
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

      // Remove this action from the stack
      setUndoStack(prev => prev.slice(0, -1));
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  const handlePersonSwapInCar = async (draggedId, targetId) => {
    const draggedPerson = people.find(p => p.id === draggedId);
    const targetPerson = people.find(p => p.id === targetId);

    if (!draggedPerson || !targetPerson) return;

    // Record undo for both people
    recordUndo(draggedId);
    recordUndo(targetId);

    // Get the appropriate car assignment based on journey direction
    const draggedCarId = journeyDirection === 'outbound' ? draggedPerson.outbound_car_id : draggedPerson.return_car_id;
    const draggedSeatPos = journeyDirection === 'outbound' ? draggedPerson.outbound_seat_position : draggedPerson.return_seat_position;
    const targetCarId = journeyDirection === 'outbound' ? targetPerson.outbound_car_id : targetPerson.return_car_id;
    const targetSeatPos = journeyDirection === 'outbound' ? targetPerson.outbound_seat_position : targetPerson.return_seat_position;

    // Swap their positions
    assignPersonToCar(draggedId, {
      car_id: targetCarId,
      seat_position: targetSeatPos
    }, journeyDirection);

    assignPersonToCar(targetId, {
      car_id: draggedCarId,
      seat_position: draggedSeatPos
    }, journeyDirection);

    setDraggedPersonId(null);
  };

  const handlePersonSwapInRoom = async (draggedId, targetId) => {
    const draggedPerson = people.find(p => p.id === draggedId);
    const targetPerson = people.find(p => p.id === targetId);

    if (!draggedPerson || !targetPerson) return;

    // Record undo for both people
    recordUndo(draggedId);
    recordUndo(targetId);

    // Swap their room positions (rooms don't have journey direction)
    assignPersonToRoom(draggedId, {
      room_id: targetPerson.room_id,
      bed_position: targetPerson.bed_position
    });

    assignPersonToRoom(targetId, {
      room_id: draggedPerson.room_id,
      bed_position: draggedPerson.bed_position
    });

    setDraggedPersonId(null);
  };

  const handlePersonSwapInTable = async (draggedId, targetId) => {
    const draggedPerson = people.find(p => p.id === draggedId);
    const targetPerson = people.find(p => p.id === targetId);

    if (!draggedPerson || !targetPerson) return;

    // Record undo for both people
    recordUndo(draggedId);
    recordUndo(targetId);

    // Swap their table positions (tables don't have journey direction)
    assignPersonToTable(draggedId, {
      table_id: targetPerson.table_id,
      table_position: targetPerson.table_position
    });

    assignPersonToTable(targetId, {
      table_id: draggedPerson.table_id,
      table_position: draggedPerson.table_position
    });

    setDraggedPersonId(null);
  };

  const handlePersonDropOnCar = async (personId, carId, seatPosition, legId) => {
    recordUndo(personId);
    assignPersonToCar(personId, {
      car_id: carId,
      seat_position: seatPosition,
      car_leg_id: legId || null  // Default to null so person appears in all legs
    }, journeyDirection);
    setDraggedPersonId(null);
  };

  const handlePersonDropOnPublicTransport = async (personId) => {
    recordUndo(personId);
    assignPersonToCar(personId, {
      car_id: -1, // Use -1 to represent public transport
      seat_position: null
    }, journeyDirection);
    setDraggedPersonId(null);
  };

  const handlePersonRemove = async (personId) => {
    recordUndo(personId);
    assignPersonToCar(personId, {
      car_id: null,
      seat_position: null
    }, journeyDirection);
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
    if (newCarName.trim()) {
      const randomColor = carColors[Math.floor(Math.random() * carColors.length)];
      createCar({
        name: newCarName.trim(),
        color: randomColor,
        capacity: carCapacity,
        origin: newCarOrigin.trim() || undefined,
        destination: newCarDestination.trim() || undefined,
      });
      setNewCarName('');
      setCarCapacity(5);
      setNewCarOrigin('');
      setNewCarDestination('');
      setIsAddingCar(false);
    }
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



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Main Content */}
      <div className={`p-6 overflow-y-auto transition-all duration-300 ${isPanelVisible ? 'mr-80' : 'mr-0'}`}>
        {/* Header */}
        <div className="mb-8">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6 items-center">
            {/* Back to Fleet Hub */}
            <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Fleet Hub
            </button>
            {/* Journey Direction Toggle */}
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setJourneyDirection('outbound')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  journeyDirection === 'outbound'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Outbound
              </button>
              <button
                onClick={() => setJourneyDirection('return')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  journeyDirection === 'return'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Return
              </button>
            </div>

            <button
              onClick={() => setShowStars(!showStars)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showStars
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={showStars ? 'Hide VIP stars' : 'Show VIP stars'}
            >
              <span className="text-sm">⭐ {showStars ? 'Hide' : 'Show'}</span>
            </button>
            <button
              onClick={() => setActiveTab('transportation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'transportation'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Car className="w-4 h-4" />
              Transportation
            </button>
            {activeTab === 'transportation' && (
              <button
                onClick={() => setIsAddingCar(true)}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                title="Add car"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'rooms'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              Rooms
            </button>
            {activeTab === 'rooms' && (
              <button
                onClick={() => setIsAddingRoom(true)}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                title="Add room"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'tables'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Tables
            </button>
            {activeTab === 'tables' && (
              <button
                onClick={() => setIsAddingTable(true)}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                title="Add table"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

          </div>

          {/* Add Forms */}
          {activeTab === 'transportation' && isAddingCar && (
            <div className="flex items-center justify-end">
              {(
                <form onSubmit={handleCreateCar} className="flex gap-3 items-center flex-wrap">
                  <input
                    type="text"
                    value={newCarName}
                    onChange={(e) => setNewCarName(e.target.value)}
                    placeholder="Car name"
                    className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newCarOrigin}
                    onChange={(e) => setNewCarOrigin(e.target.value)}
                    placeholder="Origin (optional)"
                    className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={newCarDestination}
                    onChange={(e) => setNewCarDestination(e.target.value)}
                    placeholder="Destination (optional)"
                    className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white whitespace-nowrap">Size:</label>
                    <select
                      value={carCapacity}
                      onChange={(e) => setCarCapacity(parseInt(e.target.value))}
                      className="px-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="2">2-seater</option>
                      <option value="5">5-seater</option>
                      <option value="7">7-seater</option>
                      <option value="9">Van (9+)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCar(false);
                      setNewCarName('');
                      setCarCapacity(5);
                      setNewCarOrigin('');
                      setNewCarDestination('');
                    }}
                    className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
          {activeTab === 'rooms' && isAddingRoom && (
            <div className="flex items-center justify-end">
              {(
                <form onSubmit={handleCreateRoom} className="flex gap-3 items-center flex-wrap">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                    className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white whitespace-nowrap">Capacity:</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={newRoomCapacity}
                      onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || 4)}
                      className="w-20 px-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white whitespace-nowrap">Bedspace:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newRoomBedspace}
                      onChange={(e) => setNewRoomBedspace(parseInt(e.target.value) || 2)}
                      className="w-20 px-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white whitespace-nowrap">Floor:</label>
                    <select
                      value={newRoomFloor}
                      onChange={(e) => setNewRoomFloor(e.target.value)}
                      className="px-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="G">G</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={newRoomIsEnsuite}
                      onChange={(e) => setNewRoomIsEnsuite(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    Ensuite
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white whitespace-nowrap">Photo URL:</label>
                    <input
                      type="url"
                      value={newRoomPhotoUrl}
                      onChange={(e) => setNewRoomPhotoUrl(e.target.value)}
                      placeholder="Optional photo URL"
                      className="px-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingRoom(false);
                      setNewRoomName('');
                      setNewRoomCapacity(4);
                      setNewRoomBedspace(2);
                      setNewRoomFloor('G');
                      setNewRoomIsEnsuite(false);
                      setNewRoomPhotoUrl('');
                    }}
                    className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'tables' && isAddingTable && (
            <div className="flex items-center justify-end">
              {(
                <form onSubmit={handleCreateTable} className="flex gap-3 items-center flex-wrap">
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Enter table name"
                    className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white whitespace-nowrap">Capacity:</label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={newTableCapacity}
                      onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 4)}
                      className="w-20 px-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white whitespace-nowrap">Type:</label>
                    <select
                      value={newTableType}
                      onChange={(e) => setNewTableType(e.target.value)}
                      className="px-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="rectangular">Rectangular</option>
                      <option value="round">Round</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTable(false);
                      setNewTableName('');
                      setNewTableCapacity(4);
                      setNewTableType('rectangular');
                    }}
                    className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Content based on active tab */}
        <div className="space-y-8">
          {activeTab === 'transportation' ? (
            <>
              {/* Show all people, but with journey-specific car assignments */}
              {(() => {
                // Map people to show the appropriate car assignment for this journey
                const filteredPeople = people.map(person => ({
                  ...person,
                  car_id: journeyDirection === 'outbound' ? person.outbound_car_id : person.return_car_id,
                  seat_position: journeyDirection === 'outbound' ? person.outbound_seat_position : person.return_seat_position,
                  car_leg_id: journeyDirection === 'outbound' ? person.outbound_car_leg_id : person.return_car_leg_id,
                }));
                const filteredCars = cars;

                return (
                  <>
                    {/* Cars Section */}
                    {filteredCars.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Car className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">No cars added yet</h3>
                  <p className="text-slate-500 mb-6">Add your first car to start organizing people</p>
                  <button
                    onClick={() => setIsAddingCar(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Car
                  </button>
                </div>
              ) : (
                      <div className="flex flex-wrap gap-6">
                        {filteredCars.map((car, index) => (
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
                            onCarUpdate={updateCar}
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

                    {/* Public Transport Section */}
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">Public Transport</h2>
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
              {/* Rooms Section */}
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <HomeIcon className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">No rooms added yet</h3>
                  <p className="text-slate-500 mb-6">Add your first room to start organizing people</p>
                  <button
                    onClick={() => setIsAddingRoom(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Room
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Group rooms by floor */}
                  {['G', '1', '2', '3'].map(floor => {
                    const floorRooms = rooms.filter(room => room.floor === floor);
                    if (floorRooms.length === 0) return null;

                    return (
                      <div key={floor} className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">
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
              {/* Tables Section */}
              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">No tables added yet</h3>
                  <p className="text-slate-500 mb-6">Add your first table to start organizing seating</p>
                  <button
                    onClick={() => setIsAddingTable(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Table
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
