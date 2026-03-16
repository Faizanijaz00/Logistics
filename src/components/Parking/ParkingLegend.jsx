export function ParkingLegend() {
  const legendItems = [
    { color: 'bg-green-500', label: 'Free - Confirmed safe', description: 'No restrictions' },
    { color: 'bg-yellow-500', label: 'Risky - Time restricted', description: 'Check hours' },
    { color: 'bg-orange-500', label: 'High Risk - Frequent tickets', description: 'Use caution' },
    { color: 'bg-red-500', label: 'Private - Owner only', description: 'Permission required' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold text-lg mb-3">Parking Zone Legend</h3>
      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded ${item.color}`} />
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
