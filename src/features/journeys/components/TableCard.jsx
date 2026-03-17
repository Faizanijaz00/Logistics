import { useState } from 'react';
import { Trash2, CheckCircle2, Circle, Edit3 } from 'lucide-react';
import PersonChip from './PersonChip';

export default function TableCard({
  table,
  people,
  onPersonDrop,
  onPersonRemove,
  onPersonSwap,
  onTableDelete,
  onTableUpdate,
  draggedPersonId,
  onPersonDragStart,
  onPersonDragEnd,
  showStars = true,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [nameValue, setNameValue] = useState(table.name);
  const [capacityValue, setCapacityValue] = useState(table.capacity);
  const tablePeople = people.filter(person => person.table_id === table.id);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, position) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPersonId && !table.is_finalized) {
      if (position) {
        const targetPerson = tablePeople.find(p => p.table_position === position);
        if (targetPerson) {
          // Swap with the person already in this position
          onPersonSwap(draggedPersonId, targetPerson.id);
        } else if (tablePeople.length < table.capacity) {
          // Drop into empty position
          onPersonDrop(draggedPersonId, position);
        }
      } else if (tablePeople.length < table.capacity) {
        onPersonDrop(draggedPersonId, position);
      }
    }
  };

  const handleFinalizeToggle = () => {
    onTableUpdate(table.id, { is_finalized: !table.is_finalized });
  };

  const handleNameSubmit = () => {
    onTableUpdate(table.id, { name: nameValue });
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setNameValue(table.name);
    setIsEditingName(false);
  };

  const handleCapacitySubmit = () => {
    onTableUpdate(table.id, { capacity: capacityValue });
    setIsEditingCapacity(false);
  };

  const handleCapacityCancel = () => {
    setCapacityValue(table.capacity);
    setIsEditingCapacity(false);
  };

  const canDrop = draggedPersonId && !table.is_finalized && tablePeople.length < table.capacity;
  const isFull = tablePeople.length >= table.capacity;

  const renderRectangularTable = () => {
    const topSeats = Math.ceil(table.capacity / 2);
    const bottomSeats = table.capacity - topSeats;

    // Scale table size based on capacity
    const baseWidth = 120;
    const baseHeight = 80;
    const scaleFactor = Math.min(1 + (table.capacity - 4) * 0.15, 2.5); // Scale up to 2.5x max
    const tableWidth = Math.max(baseWidth, baseWidth * scaleFactor);
    const tableHeight = Math.max(baseHeight, baseHeight * scaleFactor);

    const renderSeat = (position, _side) => {
      const person = tablePeople.find(p => p.table_position === position);
      const isOccupied = !!person;

      return (
        <div
          key={position}
          className={`relative w-12 h-12 border-2 border-dashed rounded-lg transition-all flex items-center justify-center ${
            canDrop && !isOccupied ? 'border-white/60 bg-white/10' : 'border-white/30'
          } ${draggedPersonId && canDrop && !isOccupied ? 'bg-white/20' : ''}`}
          onDragOver={table.is_finalized ? undefined : handleDragOver}
          onDrop={table.is_finalized ? undefined : (e) => handleDrop(e, position)}
        >
          {isOccupied ? (
            <div className="relative">
              <PersonChip
                person={person}
                onRemove={table.is_finalized ? undefined : () => onPersonRemove(person.id)}
                isDragging={draggedPersonId === person.id}
                onDragStart={() => onPersonDragStart(person.id)}
                onDragEnd={onPersonDragEnd}
                className="bg-gradient-to-r from-white/20 to-white/30 text-white border border-white/20 text-xs w-10 h-8 text-xs"
                showStars={showStars}
              />
              {draggedPersonId && draggedPersonId !== person.id && (
                <div className="absolute inset-0 rounded-lg bg-blue-500/30 flex items-center justify-center pointer-events-none">
                  <div className="text-blue-200 text-[10px] font-medium">Swap</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/40 text-xs">{position}</div>
          )}
        </div>
      );
    };

    let currentPosition = 1;

    return (
      <div className="flex flex-col items-center gap-4">
        {/* Top seats */}
        <div className="flex gap-2">
          {Array.from({ length: topSeats }, (_, _i) => renderSeat(currentPosition++, 'top'))}
        </div>

        {/* Table */}
        <div
          className="bg-gradient-to-br from-amber-600/40 to-amber-800/40 border border-white/20 rounded-lg p-6 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${table.color}40, ${table.color}60)`,
            width: `${tableWidth}px`,
            height: `${tableHeight}px`
          }}
        >
          <div className="text-white/80 text-sm text-center">
            <div className="font-semibold">{table.name}</div>
          </div>
        </div>

        {/* Bottom seats */}
        <div className="flex gap-2">
          {Array.from({ length: bottomSeats }, (_, _i) => renderSeat(currentPosition++, 'bottom'))}
        </div>
      </div>
    );
  };

  const renderRoundTable = () => {
    // Scale table and seating radius based on capacity
    const baseRadius = 50;
    const baseTableSize = 80;
    const scaleFactor = Math.min(1 + (table.capacity - 4) * 0.1, 2); // Scale up to 2x max
    const seatRadius = baseRadius * scaleFactor;
    const tableSize = baseTableSize * scaleFactor;

    const containerSize = Math.max(160, (seatRadius + 60) * 2);
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;

    const renderSeat = (position, x, y) => {
      const person = tablePeople.find(p => p.table_position === position);
      const isOccupied = !!person;

      return (
        <div
          key={position}
          className={`absolute w-12 h-12 border-2 border-dashed rounded-lg transition-all flex items-center justify-center ${
            canDrop && !isOccupied ? 'border-white/60 bg-white/10' : 'border-white/30'
          } ${draggedPersonId && canDrop && !isOccupied ? 'bg-white/20' : ''}`}
          style={{
            left: x - 24,
            top: y - 24,
            transform: 'translate(0, 0)'
          }}
          onDragOver={table.is_finalized ? undefined : handleDragOver}
          onDrop={table.is_finalized ? undefined : (e) => handleDrop(e, position)}
        >
          {isOccupied ? (
            <div className="relative">
              <PersonChip
                person={person}
                onRemove={table.is_finalized ? undefined : () => onPersonRemove(person.id)}
                isDragging={draggedPersonId === person.id}
                onDragStart={() => onPersonDragStart(person.id)}
                onDragEnd={onPersonDragEnd}
                className="bg-gradient-to-r from-white/20 to-white/30 text-white border border-white/20 text-xs w-10 h-8"
                showStars={showStars}
              />
              {draggedPersonId && draggedPersonId !== person.id && (
                <div className="absolute inset-0 rounded-lg bg-blue-500/30 flex items-center justify-center pointer-events-none">
                  <div className="text-blue-200 text-[10px] font-medium">Swap</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/40 text-xs">{position}</div>
          )}
        </div>
      );
    };

    return (
      <div className="relative" style={{ width: containerSize, height: containerSize }}>
        {/* Round table */}
        <div
          className="absolute rounded-full border border-white/20 flex items-center justify-center"
          style={{
            left: centerX - tableSize / 2,
            top: centerY - tableSize / 2,
            width: tableSize,
            height: tableSize,
            background: `linear-gradient(135deg, ${table.color}40, ${table.color}60)`
          }}
        >
          <div className="text-white/80 text-xs text-center font-semibold">
            {table.name}
          </div>
        </div>

        {/* Seats around the circle */}
        {Array.from({ length: table.capacity }, (_, i) => {
          const angle = (i * 2 * Math.PI) / table.capacity;
          const x = centerX + seatRadius * Math.cos(angle);
          const y = centerY + seatRadius * Math.sin(angle);
          return renderSeat(i + 1, x, y);
        })}
      </div>
    );
  };

  return (
    <div
      className={`relative p-6 rounded-xl shadow-lg backdrop-blur-sm border min-w-[280px] ${
        table.is_finalized ? 'border-green-400 border-2' : 'border-white/10'
      }`}
      style={{
        background: `linear-gradient(135deg, ${table.color}80, ${table.color}40)`
      }}
    >
      {/* Table Header */}
      <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingName(true)}
                className="text-lg font-semibold text-white hover:text-white/80 transition-colors text-left"
              >
                {table.name}
              </button>
              <div className="flex items-center gap-2 text-sm text-white/70">
                {isEditingCapacity ? (
                  <div className="flex items-center gap-1">
                    <span>{tablePeople.length}/</span>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={capacityValue}
                      onChange={(e) => setCapacityValue(parseInt(e.target.value) || table.capacity)}
                      className="w-12 bg-white/20 border border-white/30 rounded px-1 py-0.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                      autoFocus
                      onBlur={handleCapacitySubmit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCapacitySubmit();
                        if (e.key === 'Escape') handleCapacityCancel();
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingCapacity(true)}
                    className="flex items-center gap-1 hover:text-white/90 transition-colors"
                    title="Click to edit capacity"
                  >
                    <span>{tablePeople.length}/{table.capacity}</span>
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                  {table.table_type === 'round' ? '🔵' : '⬜'}
                </span>
                {isFull && (
                  <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">
                    Full
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Finalize Toggle */}
          <button
            onClick={handleFinalizeToggle}
            className={`p-1 rounded transition-colors ${
              table.is_finalized
                ? 'text-green-400 hover:text-green-300'
                : 'text-white/50 hover:text-white/70'
            }`}
            title={table.is_finalized ? 'Table is finalized (click to unlock)' : 'Click to finalize table'}
          >
            {table.is_finalized ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
        </div>

        <button
          onClick={() => onTableDelete(table.id)}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Table Layout */}
      <div className="flex justify-center">
        {table.table_type === 'round' ? renderRoundTable() : renderRectangularTable()}
      </div>

      {canDrop && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-white/60 bg-white/20 flex items-center justify-center pointer-events-none">
          <div className="text-white text-sm font-medium">Drop here to assign to table</div>
        </div>
      )}

      {draggedPersonId && table.is_finalized && (
        <div className="absolute inset-0 rounded-xl bg-red-500/20 flex items-center justify-center pointer-events-none">
          <div className="text-red-300 text-sm font-medium">Table is finalized</div>
        </div>
      )}

      {draggedPersonId && isFull && !table.is_finalized && (
        <div className="absolute inset-0 rounded-xl bg-orange-500/20 flex items-center justify-center pointer-events-none">
          <div className="text-orange-300 text-sm font-medium">Table is full</div>
        </div>
      )}
    </div>
  );
}
