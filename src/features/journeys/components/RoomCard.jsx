import { useState } from 'react';
import { Trash2, CheckCircle2, Circle, Edit3, Camera, X } from 'lucide-react';
import PersonChip from './PersonChip';

export default function RoomCard({
  room, people, onPersonDrop, onPersonRemove, onPersonSwap,
  onRoomDelete, onRoomUpdate, draggedPersonId, onPersonDragStart, onPersonDragEnd,
  showStars = true,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [isEditingBedspace, setIsEditingBedspace] = useState(false);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [nameValue, setNameValue] = useState(room.name);
  const [capacityValue, setCapacityValue] = useState(room.capacity);
  const [bedspaceValue, setBedspaceValue] = useState(room.bedspace || 2);
  const [photoValue, setPhotoValue] = useState(room.photo_url || '');

  const roomPeople = people.filter(p => p.room_id === room.id);
  const bedPeople = roomPeople.filter(p => p.bed_position !== null);
  const floorPeople = roomPeople.filter(p => p.bed_position === null);

  const draggedPerson = draggedPersonId ? people.find(p => p.id === draggedPersonId) : null;
  const isInternalMove = draggedPerson?.room_id === room.id;
  const canDrop = draggedPersonId && !room.is_finalized && (roomPeople.length < room.capacity || isInternalMove);
  const isFull = roomPeople.length >= room.capacity;

  const handleDragOver = (e) => e.preventDefault();

  const handleBedDrop = (e, bedPosition) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPersonId && !room.is_finalized) {
      const target = bedPeople.find(p => p.bed_position === bedPosition);
      if (target) {
        onPersonSwap(draggedPersonId, target.id);
      } else if (roomPeople.length < room.capacity || isInternalMove) {
        onPersonDrop(draggedPersonId, bedPosition);
      }
    }
  };

  const handleFloorDrop = (e) => {
    e.preventDefault();
    if (draggedPersonId && !room.is_finalized && (roomPeople.length < room.capacity || isInternalMove)) {
      onPersonDrop(draggedPersonId);
    }
  };

  return (
    <div
      className={`relative p-6 rounded-xl shadow-lg backdrop-blur-sm border min-w-[320px] min-h-[280px] ${
        room.is_finalized ? 'border-green-400 border-2' : 'border-white/10'
      }`}
      style={{ background: `linear-gradient(135deg, ${room.color}80, ${room.color}40)` }}
    >
      {room.photo_url && (
        <div className="relative mb-4 rounded-lg overflow-hidden">
          <img src={room.photo_url} alt={`${room.name} photo`} className="w-full h-32 object-cover"
            onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="absolute top-2 right-2 flex gap-1">
            <button onClick={() => setIsEditingPhoto(true)} className="p-1 rounded bg-black/50 hover:bg-black/70 text-white"><Edit3 className="w-3 h-3" /></button>
            <button onClick={() => onRoomUpdate(room.id, { photo_url: null })} className="p-1 rounded bg-black/50 hover:bg-black/70 text-white"><X className="w-3 h-3" /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {isEditingName ? (
            <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)}
              className="text-lg font-semibold bg-white/20 border border-white/30 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
              autoFocus onBlur={() => { onRoomUpdate(room.id, { name: nameValue }); setIsEditingName(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onRoomUpdate(room.id, { name: nameValue }); setIsEditingName(false); } if (e.key === 'Escape') { setNameValue(room.name); setIsEditingName(false); } }} />
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditingName(true)} className="text-lg font-semibold text-white hover:text-white/80 transition-colors text-left">{room.name}</button>
              <div className="flex items-center gap-2 text-sm text-white/70">
                {isEditingCapacity ? (
                  <div className="flex items-center gap-1">
                    <span>{roomPeople.length}/</span>
                    <input type="number" min="1" max="20" value={capacityValue} onChange={(e) => setCapacityValue(parseInt(e.target.value) || room.capacity)}
                      className="w-12 bg-white/20 border border-white/30 rounded px-1 py-0.5 text-white text-xs focus:outline-none" autoFocus
                      onBlur={() => { onRoomUpdate(room.id, { capacity: capacityValue }); setIsEditingCapacity(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { onRoomUpdate(room.id, { capacity: capacityValue }); setIsEditingCapacity(false); } if (e.key === 'Escape') { setCapacityValue(room.capacity); setIsEditingCapacity(false); } }} />
                  </div>
                ) : (
                  <button onClick={() => setIsEditingCapacity(true)} className="flex items-center gap-1 hover:text-white/90">
                    <span>{roomPeople.length}/{room.capacity}</span><Edit3 className="w-3 h-3" />
                  </button>
                )}
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{room.floor}</span>
                {room.is_ensuite && <span>🚿</span>}
                {isFull && <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">Full</span>}
              </div>
            </div>
          )}
          {!room.photo_url && <button onClick={() => setIsEditingPhoto(true)} className="p-1 text-white/50 hover:text-white/70"><Camera className="w-5 h-5" /></button>}
          <button onClick={() => onRoomUpdate(room.id, { is_finalized: !room.is_finalized })}
            className={`p-1 rounded transition-colors ${room.is_finalized ? 'text-green-400 hover:text-green-300' : 'text-white/50 hover:text-white/70'}`}>
            {room.is_finalized ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </button>
        </div>
        <button onClick={() => onRoomDelete(room.id)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white"><Trash2 className="w-4 h-4" /></button>
      </div>

      {/* Bedspace */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm text-white/80">🛏️ Bedspace</h4>
          {isEditingBedspace ? (
            <div className="flex items-center gap-1">
              <input type="number" min="1" max="10" value={bedspaceValue} onChange={(e) => setBedspaceValue(parseInt(e.target.value) || 2)}
                className="w-12 bg-white/20 border border-white/30 rounded px-1 py-0.5 text-white text-xs focus:outline-none" autoFocus
                onBlur={() => { onRoomUpdate(room.id, { bedspace: bedspaceValue }); setIsEditingBedspace(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { onRoomUpdate(room.id, { bedspace: bedspaceValue }); setIsEditingBedspace(false); } if (e.key === 'Escape') { setBedspaceValue(room.bedspace || 2); setIsEditingBedspace(false); } }} />
              <span className="text-xs text-white/60">available</span>
            </div>
          ) : (
            <button onClick={() => setIsEditingBedspace(true)} className="text-xs text-white/60 hover:text-white/80">{room.bedspace || 2} available</button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: room.bedspace || 2 }, (_, i) => i + 1).map(bedNum => {
            const bedPerson = bedPeople.find(p => p.bed_position === bedNum);
            return (
              <div key={bedNum}
                className={`relative min-w-[80px] min-h-[50px] border-2 border-dashed rounded-lg transition-all ${
                  (canDrop || isInternalMove) && !bedPerson ? 'border-white/60 bg-white/10' : 'border-white/30'
                } ${draggedPersonId && (canDrop || isInternalMove) && !bedPerson ? 'bg-white/20' : ''}`}
                onDragOver={room.is_finalized ? undefined : handleDragOver}
                onDrop={room.is_finalized ? undefined : (e) => handleBedDrop(e, bedNum)}>
                {bedPerson ? (
                  <div className="p-2 flex items-center justify-center">
                    <PersonChip person={bedPerson} onRemove={room.is_finalized ? undefined : () => onPersonRemove(bedPerson.id)}
                      isDragging={draggedPersonId === bedPerson.id} onDragStart={() => onPersonDragStart(bedPerson.id)} onDragEnd={onPersonDragEnd}
                      className="bg-gradient-to-r from-white/20 to-white/30 text-white border border-white/20 text-xs" showStars={showStars} />
                  </div>
                ) : (
                  <div className="p-2 flex items-center justify-center text-white/50 text-xs">Bed {bedNum}</div>
                )}
                {draggedPersonId && bedPerson && (
                  <div className="absolute inset-0 rounded-lg bg-blue-500/20 flex items-center justify-center pointer-events-none">
                    <div className="text-blue-300 text-xs font-medium">Swap</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floor */}
      <div className="space-y-3" onDragOver={room.is_finalized ? undefined : handleDragOver} onDrop={room.is_finalized ? undefined : handleFloorDrop}>
        <h4 className="text-sm text-white/80">🪑 Floor Space</h4>
        {floorPeople.length === 0 ? (
          <div className="text-center py-6 text-white/60 border-2 border-dashed border-white/30 rounded-lg">
            <p className="text-xs">Floor space available</p><p className="text-xs mt-1">Drag people here</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-3 border-2 border-dashed border-white/30 rounded-lg min-h-[60px]">
            {floorPeople.map(p => (
              <PersonChip key={p.id} person={p} onRemove={room.is_finalized ? undefined : () => onPersonRemove(p.id)}
                isDragging={draggedPersonId === p.id} onDragStart={() => onPersonDragStart(p.id)} onDragEnd={onPersonDragEnd}
                className="bg-gradient-to-r from-white/20 to-white/30 text-white border border-white/20 text-xs" showStars={showStars} />
            ))}
          </div>
        )}
      </div>

      {canDrop && <div className="absolute inset-0 rounded-xl border-2 border-dashed border-white/60 bg-white/20 flex items-center justify-center pointer-events-none"><div className="text-white text-sm font-medium">Drop here to assign to room</div></div>}
      {draggedPersonId && room.is_finalized && <div className="absolute inset-0 rounded-xl bg-red-500/20 flex items-center justify-center pointer-events-none"><div className="text-red-300 text-sm font-medium">Room is finalized</div></div>}
      {draggedPersonId && isFull && !room.is_finalized && !isInternalMove && <div className="absolute inset-0 rounded-xl bg-orange-500/20 flex items-center justify-center pointer-events-none"><div className="text-orange-300 text-sm font-medium">Room is full</div></div>}

      {isEditingPhoto && (
        <div className="absolute inset-0 rounded-xl bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="text-white font-semibold mb-3">{room.photo_url ? 'Edit Photo' : 'Add Photo'}</h3>
            <input type="url" value={photoValue} onChange={(e) => setPhotoValue(e.target.value)} placeholder="Enter photo URL"
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 mb-3" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => { onRoomUpdate(room.id, { photo_url: photoValue || null }); setIsEditingPhoto(false); }} className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded">Save</button>
              <button onClick={() => { setPhotoValue(room.photo_url || ''); setIsEditingPhoto(false); }} className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
