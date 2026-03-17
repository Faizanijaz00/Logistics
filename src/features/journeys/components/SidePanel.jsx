import { useState, useEffect } from 'react';
import { Plus, Users, FileText, X, PanelRightOpen, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import PersonChip from './PersonChip';

export default function SidePanel({
  people, cars, rooms, tables, carLegs,
  onCreatePerson, onPersonDragStart, onPersonDragEnd, draggedPersonId, onPersonDelete,
  isVisible, onToggleVisibility, currentStageIndex, onStageChange, journeyDirection,
  showStars = true,
}) {
  const [newPersonName, setNewPersonName] = useState('');
  const [canDrive, setCanDrive] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const stages = [
    { label: 'All', filter: () => true },
    { label: 'Unassigned', filter: (p) => p.car_id === null && p.room_id === null && p.table_id === null },
    { label: 'Car Only', filter: (p) => p.car_id !== null && p.room_id === null && p.table_id === null },
    { label: 'Room Only', filter: (p) => p.car_id === null && p.room_id !== null && p.table_id === null },
    { label: 'Table Only', filter: (p) => p.car_id === null && p.room_id === null && p.table_id !== null },
    { label: 'Car + Room', filter: (p) => p.car_id !== null && p.room_id !== null && p.table_id === null },
    { label: 'Car + Table', filter: (p) => p.car_id !== null && p.room_id === null && p.table_id !== null },
    { label: 'Room + Table', filter: (p) => p.car_id === null && p.room_id !== null && p.table_id !== null },
    { label: 'Fully Assigned', filter: (p) => p.car_id !== null && p.room_id !== null && p.table_id !== null },
  ];

  const currentStage = stages[currentStageIndex] || stages[0];

  const peopleWithJourneyAssignments = people.map(p => ({
    ...p,
    car_id: journeyDirection === 'outbound' ? p.outbound_car_id : p.return_car_id,
    seat_position: journeyDirection === 'outbound' ? p.outbound_seat_position : p.return_seat_position,
    car_leg_id: journeyDirection === 'outbound' ? p.outbound_car_leg_id : p.return_car_leg_id,
  }));
  const filteredPeople = peopleWithJourneyAssignments.filter(p => currentStage.filter(p));

  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;
    const aNo = a.car_id === null && a.room_id === null;
    const bNo = b.car_id === null && b.room_id === null;
    const aFull = a.car_id !== null && a.room_id !== null;
    const bFull = b.car_id !== null && b.room_id !== null;
    if (aNo && !bNo) return -1;
    if (!aNo && bNo) return 1;
    if (aFull && !bFull) return 1;
    if (!aFull && bFull) return -1;
    return 0;
  });

  useEffect(() => {
    if (people.length > 0 && sortedPeople.length === 0) {
      for (let i = 0; i < stages.length; i++) {
        if (peopleWithJourneyAssignments.filter(stages[i].filter).length > 0) { onStageChange(i); break; }
      }
    }
  }, [people, sortedPeople.length, currentStageIndex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      await onCreatePerson(newPersonName.trim(), canDrive, isVip);
      setNewPersonName(''); setCanDrive(false); setIsVip(false); setIsAdding(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) return;
    for (const line of bulkText.trim().split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let name = trimmed, isDriver = false, isVipPerson = false;
      const flags = name.split(' ').slice(-1)[0].toLowerCase();
      if (flags.includes('d') || flags.includes('v')) {
        isDriver = flags.includes('d');
        isVipPerson = flags.includes('v');
        name = name.split(' ').slice(0, -1).join(' ').trim();
      }
      if (name) await onCreatePerson(name, isDriver, isVipPerson);
    }
    setBulkText(''); setIsBulkAdding(false);
  };

  const resetForms = () => { setIsAdding(false); setIsBulkAdding(false); setNewPersonName(''); setCanDrive(false); setIsVip(false); setBulkText(''); };

  if (!isVisible) {
    return (
      <button onClick={onToggleVisibility} className="fixed top-6 right-4 z-50 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 shadow-lg" title="Show panel">
        <PanelRightOpen className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-gradient-to-br from-slate-900 to-slate-800 border-l border-slate-700 flex flex-col z-40">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">People</h3>
          <button onClick={onToggleVisibility} className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"><X className="w-5 h-5" /></button>
        </div>
        {!isAdding && !isBulkAdding ? (
          <div className="flex gap-2">
            <button onClick={() => setIsAdding(true)} className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus className="w-4 h-4" /></button>
            <button onClick={() => setIsBulkAdding(true)} className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"><FileText className="w-4 h-4" /></button>
          </div>
        ) : isBulkAdding ? (
          <form onSubmit={handleBulkSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Paste names (one per line, add "D" for drivers, "V" for VIPs)</label>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={'John D\nMary V\nBob DV\nAlice'}
                className="w-full h-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" autoFocus />
              <p className="text-xs text-slate-400 mt-1">Example: "John D" = driver, "Mary V" = VIP, "Bob DV" = both</p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Add All</button>
              <button type="button" onClick={resetForms} className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg">Cancel</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Enter person's name"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={canDrive} onChange={(e) => setCanDrive(e.target.checked)} className="w-4 h-4" /> Can drive
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} className="w-4 h-4" /> VIP ⭐
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Add</button>
              <button type="button" onClick={resetForms} className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {people.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <button onClick={() => onStageChange(currentStageIndex === 0 ? stages.length - 1 : currentStageIndex - 1)} className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"><ChevronLeft className="w-5 h-5" /></button>
            <div className="text-center flex-1">
              <div className="text-sm font-medium text-white">{currentStage.label}</div>
              <div className="text-xs text-slate-400">{sortedPeople.length} people</div>
            </div>
            <button onClick={() => onStageChange(currentStageIndex === stages.length - 1 ? 0 : currentStageIndex + 1)} className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto">
        {people.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">No people added yet</p><p className="text-xs mt-1">Add someone to get started</p>
          </div>
        ) : sortedPeople.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">No people in this stage</p><p className="text-xs mt-1">Use arrows to navigate stages</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sortedPeople.map(person => {
              const hasCar = person.car_id !== null;
              const hasRoom = person.room_id !== null;
              const hasTable = person.table_id !== null;
              const count = [hasCar, hasRoom, hasTable].filter(Boolean).length;
              const isFullyAssigned = count === 3;
              const carLeg = person.car_leg_id ? carLegs.find(l => l.id === person.car_leg_id) : undefined;
              let assignmentText = '';
              let assignmentIcon = null;
              if (count > 0 && count < 3) {
                const a = [];
                if (hasCar) a.push('C');
                if (hasRoom) a.push('R');
                if (hasTable) a.push('T');
                assignmentText = a.join('');
                if (hasCar && hasRoom && !hasTable) {
                  const car = cars.find(c => c.id === person.car_id);
                  assignmentText = `${car ? car.name.charAt(0).toUpperCase() : 'C'}${carLeg ? carLeg.leg_order : '1'}`;
                } else if (hasRoom && !hasCar && !hasTable) {
                  assignmentIcon = <Home className="w-3 h-3" />;
                  assignmentText = '';
                }
              } else if (count === 3) {
                assignmentText = 'CRT';
              }
              return (
                <div key={person.id} className={`relative ${isFullyAssigned ? 'opacity-50' : ''}`}>
                  <PersonChip person={person} onRemove={() => onPersonDelete(person.id)}
                    isDragging={draggedPersonId === person.id} onDragStart={() => onPersonDragStart(person.id)} onDragEnd={onPersonDragEnd}
                    className={`w-full justify-center text-xs ${isFullyAssigned ? 'bg-slate-600/50' : ''} ${person.room_id === null ? 'ring-2 ring-orange-400 ring-opacity-70' : ''}`}
                    carLegOrder={carLeg?.leg_order} showStars={showStars} />
                  {(assignmentText || assignmentIcon) && (
                    <div className={`absolute -top-1 -right-1 text-xs px-1 py-0.5 rounded-full flex items-center justify-center ${isFullyAssigned ? 'bg-slate-500 text-slate-300' : 'bg-blue-600 text-white'}`}>
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
