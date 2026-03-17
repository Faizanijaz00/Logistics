export default function PersonChip({
  person,
  onRemove,
  isDragging = false,
  onDragStart,
  onDragEnd,
  className = '',
  carLegOrder,
  showStars = true,
}) {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', person.id.toString());
    e.stopPropagation();
    onDragStart?.();
  };

  const handleDragEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragEnd?.();
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <div
      draggable={onDragStart !== undefined}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={onRemove ? handleDoubleClick : undefined}
      className={`
        relative inline-flex items-center px-2.5 py-1 rounded-full
        ${person.can_drive ? 'bg-red-500/20' : 'bg-gradient-to-br from-slate-700 to-slate-600'} text-white text-sm font-medium
        ${onDragStart ? 'cursor-move' : 'cursor-default'} transition-all duration-200 hover:shadow-lg hover:scale-105
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${className}
      `}
      title={onRemove ? 'Double-click to remove' : ''}
    >
      <span className="select-none">
        {!!person.is_vip && showStars && <span className="mr-1">⭐</span>}
        {person.name}
        {carLegOrder !== undefined && (
          <span className="ml-1 opacity-70 text-xs">L{carLegOrder}</span>
        )}
      </span>
    </div>
  );
}
