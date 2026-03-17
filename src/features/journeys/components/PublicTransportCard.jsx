import { Bus } from 'lucide-react';
import PersonChip from './PersonChip';

export default function PublicTransportCard({
  people,
  onPersonDrop,
  onPersonRemove,
  draggedPersonId,
  onPersonDragStart,
  onPersonDragEnd,
  showStars = true,
}) {
  const publicTransportPeople = people.filter(p => p.car_id === -1);

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedPersonId) onPersonDrop(draggedPersonId);
  };

  const canDrop = draggedPersonId !== null;

  return (
    <div
      className={`
        relative p-6 rounded-xl shadow-lg backdrop-blur-sm border border-white/10 min-w-[300px]
        bg-gradient-to-br from-emerald-600/40 to-emerald-800/40 transition-all duration-200
        ${canDrop ? 'ring-2 ring-emerald-400/50 bg-emerald-600/50' : ''}
      `}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-emerald-600">
          <Bus className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Public Transport</h3>
        <span className="text-sm text-white/70 bg-white/20 px-2 py-1 rounded-full">
          {publicTransportPeople.length} people
        </span>
      </div>

      <div className="space-y-3">
        {publicTransportPeople.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <Bus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No one using public transport</p>
            <p className="text-xs mt-1">Drag people here for unlimited capacity</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {publicTransportPeople.map(person => (
              <PersonChip
                key={person.id}
                person={person}
                onRemove={() => onPersonRemove(person.id)}
                isDragging={draggedPersonId === person.id}
                onDragStart={() => onPersonDragStart(person.id)}
                onDragEnd={onPersonDragEnd}
                className="bg-gradient-to-r from-white/20 to-white/30 text-white border border-white/20"
                showStars={showStars}
              />
            ))}
          </div>
        )}
      </div>

      {canDrop && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-emerald-400/60 bg-emerald-500/20 flex items-center justify-center pointer-events-none">
          <div className="text-emerald-200 text-sm font-medium">Drop here for public transport</div>
        </div>
      )}
    </div>
  );
}
