import { useState, useEffect } from 'react';
import { Plus, Users, FileText, X, PanelRightOpen, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import PersonChip from './PersonChip';

export default function SidePanel({
  people,
  cars,
  rooms,
  tables,
  carLegs,
  onCreatePerson,
  onPersonDragStart,
  onPersonDragEnd,
  draggedPersonId,
  onPersonDelete,
  isVisible,
  onToggleVisibility,
  currentStageIndex,
  onStageChange,
  journeyDirection,
  showStars = true,
}) {
  const [newPersonName, setNewPersonName] = useState('');
  const [canDrive, setCanDrive] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Define filter stages
  const stages = [
    { label: 'All', filter: (_person) => true },
    { label: 'Unassigned', filter: (person) => person.car_id === null && person.room_id === null && person.table_id === null },
    { label: 'Car Only', filter: (person) => person.car_id !== null && person.room_id === null && person.table_id === null },
    { label: 'Room Only', filter: (person) => person.car_id === null && person.room_id !== null && person.table_id === null },
    { label: 'Table Only', filter: (person) => person.car_id === null && person.room_id === null && person.table_id !== null },
    { label: 'Car + Room', filter: (person) => person.car_id !== null && person.room_id !== null && person.table_id === null },
    { label: 'Car + Table', filter: (person) => person.car_id !== null && person.room_id === null && person.table_id !== null },
    { label: 'Room + Table', filter: (person) => person.car_id === null && person.room_id !== null && person.table_id !== null },
    { label: 'Fully Assigned', filter: (person) => person.car_id !== null && person.room_id !== null && person.table_id !== null },
  ];

  const currentStage = stages[currentStageIndex] || stages[0];

  const handlePrevStage = () => {
    const newIndex = currentStageIndex === 0 ? stages.length - 1 : currentStageIndex - 1;
    onStageChange(newIndex);
  };

  const handleNextStage = () => {
    const newIndex = currentStageIndex === stages.length - 1 ? 0 : currentStageIndex + 1;
    onStageChange(newIndex);
  };

  // Map people to show journey-specific assignments, then filter
  const peopleWithJourneyAssignments = people.map(person => ({
    ...person,
    car_id: journeyDirection === 'outbound' ? person.outbound_car_id : person.return_car_id,
    seat_position: journeyDirection === 'outbound' ? person.outbound_seat_position : person.return_seat_position,
    car_leg_id: journeyDirection === 'outbound' ? person.outbound_car_leg_id : person.return_car_leg_id,
  }));
  const filteredPeople = peopleWithJourneyAssignments.filter(p => currentStage.filter(p));

  // Sort filtered people: VIPs first, then completely unassigned, then partially assigned, then fully assigned (greyed out)
  const sortedPeople = [...filteredPeople].sort((a, b) => {
    // VIPs always come first
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;

    // For non-VIPs or when both are VIPs, sort by assignment status
    const aHasNoAssignments = a.car_id === null && a.room_id === null;
    const bHasNoAssignments = b.car_id === null && b.room_id === null;
    const aFullyAssigned = a.car_id !== null && a.room_id !== null;
    const bFullyAssigned = b.car_id !== null && b.room_id !== null;

    // Completely unassigned people come before partially assigned
    if (aHasNoAssignments && !bHasNoAssignments) return -1;
    if (!aHasNoAssignments && bHasNoAssignments) return 1;

    // Fully assigned people come last
    if (aFullyAssigned && !bFullyAssigned) return 1;
    if (!aFullyAssigned && bFullyAssigned) return -1;

    // Same priority, maintain order
    return 0;
  });

  const allPeople = sortedPeople;

  // Auto-adjust stage when current stage becomes empty
  useEffect(() => {
    if (people.length > 0 && allPeople.length === 0) {
      // Find the first stage with people
      for (let i = 0; i < stages.length; i++) {
        const stageHasPeople = people.filter(stages[i].filter).length > 0;
        if (stageHasPeople) {
          onStageChange(i);
          break;
        }
      }
    }
  }, [people, allPeople.length, currentStageIndex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      await onCreatePerson(newPersonName.trim(), canDrive, isVip);
      setNewPersonName('');
      setCanDrive(false);
      setIsVip(false);
      setIsAdding(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.trim().split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let name = trimmedLine;
      let isDriver = false;
      let isVipPerson = false;

      // Check for multiple flags (D and/or V)
      const flags = name.split(' ').slice(-1)[0].toLowerCase();
      if (flags.includes('d') || flags.includes('v')) {
        isDriver = flags.includes('d');
        isVipPerson = flags.includes('v');
        // Remove the flag part from the name
        name = name.split(' ').slice(0, -1).join(' ').trim();
      }

      if (name) {
        await onCreatePerson(name, isDriver, isVipPerson);
      }
    }

    setBulkText('');
    setIsBulkAdding(false);
  };

  const resetForms = () => {
    setIsAdding(false);
    setIsBulkAdding(false);
    setNewPersonName('');
    setCanDrive(false);
    setIsVip(false);
    setBulkText('');
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed top-6 right-4 z-50 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors shadow-lg"
        title="Show panel"
      >
        <PanelRightOpen className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-gradient-to-br from-slate-900 to-slate-800 border-l border-slate-700 flex flex-col z-40">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">People</h3>
          <button
            onClick={onToggleVisibility}
            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
            title="Hide panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdding && !isBulkAdding ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Add Person"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsBulkAdding(true)}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              title="Bulk Add"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        ) : isBulkAdding ? (
          <form onSubmit={handleBulkSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Paste names (one per line, add "D" for drivers, "V" for VIPs)
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="John D&#10;Mary V&#10;Bob DV&#10;Alice"
                className="w-full h-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                Example: "John D" = driver, "Mary V" = VIP, "Bob DV" = both
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Add All
              </button>
              <button
                type="button"
                onClick={resetForms}
                className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Enter person's name"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={canDrive}
                  onChange={(e) => setCanDrive(e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-slate-800 border-slate-600 rounded focus:ring-red-500 focus:ring-2"
                />
                Can drive
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                  className="w-4 h-4 text-yellow-600 bg-slate-800 border-slate-600 rounded focus:ring-yellow-500 focus:ring-2"
                />
                VIP ⭐
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={resetForms}
                className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stage Navigation */}
      {people.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevStage}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
              title="Previous stage"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center flex-1">
              <div className="text-sm font-medium text-white">{currentStage.label}</div>
              <div className="text-xs text-slate-400">{allPeople.length} people</div>
            </div>
            <button
              onClick={handleNextStage}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
              title="Next stage"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* People List */}
      <div className="flex-1 p-4 overflow-y-auto">
        {people.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No people added yet</p>
            <p className="text-xs mt-1">Add someone to get started</p>
          </div>
        ) : allPeople.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No people in this stage</p>
            <p className="text-xs mt-1">Use arrows to navigate stages</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {allPeople.map(person => {
              const hasCarAssignment = person.car_id !== null;
              const hasRoomAssignment = person.room_id !== null;
              const hasTableAssignment = person.table_id !== null;
              const assignmentCount = [hasCarAssignment, hasRoomAssignment, hasTableAssignment].filter(Boolean).length;
              const isFullyAssigned = assignmentCount === 3;

              // Find the leg order for this person's car leg
              const carLeg = person.car_leg_id ? carLegs.find(leg => leg.id === person.car_leg_id) : undefined;

              let assignmentText = '';
              let assignmentIcon = null;
              if (assignmentCount === 0) {
                assignmentText = '';
                assignmentIcon = null;
              } else if (assignmentCount === 3) {
                assignmentText = 'CRT';
                assignmentIcon = null;
              } else {
                const assignments = [];
                if (hasCarAssignment) assignments.push('C');
                if (hasRoomAssignment) assignments.push('R');
                if (hasTableAssignment) assignments.push('T');
                assignmentText = assignments.join('');

                // Special cases for icons
                if (hasCarAssignment && hasRoomAssignment && !hasTableAssignment) {
                  // Car + Room = show car letter and leg number
                  const assignedCar = cars.find(c => c.id === person.car_id);
                  const carLetter = assignedCar ? assignedCar.name.charAt(0).toUpperCase() : 'C';
                  const legNum = carLeg ? carLeg.leg_order : '1';
                  assignmentText = `${carLetter}${legNum}`;
                  assignmentIcon = null;
                } else if (hasRoomAssignment && !hasCarAssignment && !hasTableAssignment) {
                  // Room only = room icon
                  assignmentIcon = <Home className="w-3 h-3" />;
                  assignmentText = '';
                }
              }

              const hasNoRoomAssignment = person.room_id === null;

              return (
                <div key={person.id} className={`relative ${isFullyAssigned ? 'opacity-50' : ''}`}>
                  <PersonChip
                    person={person}
                    onRemove={() => onPersonDelete(person.id)}
                    isDragging={draggedPersonId === person.id}
                    onDragStart={() => onPersonDragStart(person.id)}
                    onDragEnd={onPersonDragEnd}
                    className={`w-full justify-center text-xs ${isFullyAssigned ? 'bg-slate-600/50' : ''} ${
                      hasNoRoomAssignment ? 'ring-2 ring-orange-400 ring-opacity-70' : ''
                    }`}
                    carLegOrder={carLeg?.leg_order}
                    showStars={showStars}
                  />
                  {(assignmentText || assignmentIcon) && (
                    <div className={`absolute -top-1 -right-1 text-xs px-1 py-0.5 rounded-full flex items-center justify-center ${
                      isFullyAssigned ? 'bg-slate-500 text-slate-300' : 'bg-blue-600 text-white'
                    }`}>
                      {assignmentIcon || assignmentText}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
}
