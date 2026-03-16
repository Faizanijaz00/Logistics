import { MapPin, Calendar, Clock, User, ShoppingCart, Car, Package } from 'lucide-react';

const reasonIcons = {
  shopping: ShoppingCart,
  lift: Car,
  collection: Package,
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  accepted: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  completed: 'bg-slate-100 text-slate-800 border-slate-300',
};

export function RequestCard({ request, onAccept, onReject, showActions = false }) {
  const ReasonIcon = reasonIcons[request.reason] || Car;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ReasonIcon className="w-5 h-5 text-slate-600" />
          <span className="font-medium capitalize">{request.reason}</span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            statusColors[request.status]
          }`}
        >
          {request.status}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{request.requester}</span>
        </div>

        <p className="text-sm text-slate-600">{request.description}</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
            <div>
              <span className="text-slate-500">From:</span> {request.pickupLocation}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
            <div>
              <span className="text-slate-500">To:</span> {request.destination}
            </div>
          </div>
        </div>

        <div className="flex gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {request.requestedDate}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {request.requestedTime}
          </div>
        </div>

        {request.assignedDriver && (
          <div className="pt-2 border-t text-sm">
            <span className="text-slate-500">Assigned to:</span>{' '}
            <span className="font-medium">{request.assignedDriver}</span>
          </div>
        )}

        {showActions && request.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onAccept(request.id)}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Accept
            </button>
            <button
              onClick={() => onReject(request.id)}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
