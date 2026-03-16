import { FileText, Download, ExternalLink, Calendar, Shield } from 'lucide-react';

export function DocumentCard({ vehicle }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 bg-slate-800 text-white">
        <h3 className="font-bold">
          {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-slate-300 text-sm">{vehicle.licensePlate}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Insurance</p>
            <p className="text-sm text-slate-600">{vehicle.insurance.provider}</p>
            <p className="text-xs text-slate-500 mt-1">
              Policy: {vehicle.insurance.policyNumber}
            </p>
          </div>
          <a
            href={vehicle.insurance.documentUrl}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title="View Document"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>Expires: {vehicle.insurance.expiryDate}</span>
        </div>

        <div className="pt-2 border-t">
          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
            <Download className="w-4 h-4" />
            Download Insurance PDF
          </button>
        </div>
      </div>
    </div>
  );
}
