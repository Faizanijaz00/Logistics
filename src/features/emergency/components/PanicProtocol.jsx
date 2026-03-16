import { useState, useEffect } from 'react';
import { useVehicleStore, useEmergencyStore } from '../../../store';

// Digital Insurance Wallet Component
function InsuranceWallet({ vehicle, onClose }) {
  const [copied, setCopied] = useState(false);
  const { getEmergencyShareLink } = useEmergencyStore();

  const shareLink = getEmergencyShareLink();

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="retro-panel border-glow">
      <div className="retro-panel-header flex justify-between items-center">
        <span>DIGITAL INSURANCE WALLET</span>
        <button onClick={onClose} className="retro-btn text-xs py-1 px-2">
          [X] CLOSE
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Vehicle ID */}
        <div className="text-center border-b border-green-900 pb-4">
          <div className="text-xs opacity-70 mb-1">VEHICLE IDENTIFICATION</div>
          <div className="text-3xl font-bold text-glow tracking-wider">
            {vehicle.licensePlate}
          </div>
          <div className="text-sm mt-1 opacity-80">
            {vehicle.make} {vehicle.model} | {vehicle.year} | {vehicle.color}
          </div>
        </div>

        {/* Insurance Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="retro-panel-beveled p-4">
            <div className="text-xs opacity-70 mb-2">PROVIDER</div>
            <div className="text-lg font-bold">{vehicle.insurance.provider}</div>
          </div>
          <div className="retro-panel-beveled p-4">
            <div className="text-xs opacity-70 mb-2">POLICY NUMBER</div>
            <div className="text-lg font-bold font-mono">{vehicle.insurance.policyNumber}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="retro-panel-beveled p-4">
            <div className="text-xs opacity-70 mb-2">VALID UNTIL</div>
            <div className="text-lg font-bold status-active">{vehicle.insurance.expiryDate}</div>
          </div>
          <div className="retro-panel-beveled p-4">
            <div className="text-xs opacity-70 mb-2">COVERAGE STATUS</div>
            <div className="text-lg font-bold status-active">[ACTIVE]</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <a
            href={vehicle.insurance.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="retro-btn retro-btn-beveled block text-center w-full py-4"
          >
            [VIEW FULL INSURANCE DOCUMENT]
          </a>

          <button
            onClick={() => copyToClipboard(shareLink)}
            className="retro-btn retro-btn-beveled block text-center w-full py-4"
          >
            {copied ? '[COPIED TO CLIPBOARD]' : '[COPY SHARE LINK]'}
          </button>
        </div>

        {/* Share Link Display */}
        <div className="p-3 bg-green-950/50 border border-green-900 text-xs break-all">
          <div className="opacity-70 mb-1">VERIFICATION LINK:</div>
          <div className="font-mono">{shareLink}</div>
        </div>
      </div>
    </div>
  );
}

// Main PanicProtocol Component
export function PanicProtocol() {
  const { vehicles } = useVehicleStore();
  const {
    isEmergencyMode,
    activeEmergency,
    triggerEmergency,
    resolveEmergency,
    cancelEmergency,
  } = useEmergencyStore();

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [emergencyType, setEmergencyType] = useState('police_stop');
  const [showConfirm, setShowConfirm] = useState(false);

  // Handle ESC key to cancel
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showConfirm) {
        setShowConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showConfirm]);

  const handleTrigger = () => {
    if (!selectedVehicle) return;
    setShowConfirm(true);
  };

  const confirmTrigger = () => {
    triggerEmergency(selectedVehicle, emergencyType);
    setShowConfirm(false);
    setSelectedVehicle('');
  };

  // Active Emergency View
  if (isEmergencyMode && activeEmergency) {
    const vehicle = vehicles.find((v) => v.id === activeEmergency.vehicleId);

    return (
      <div className="space-y-6">
        {/* ALARM Banner */}
        <div className="alarm-active retro-panel border-glow-red p-6 text-center">
          <div className="alarm-text text-4xl font-bold mb-2">
            ! ! ! ALARM ! ! !
          </div>
          <div className="text-red-400 text-lg">
            EMERGENCY PROTOCOL ACTIVE
          </div>
          <div className="mt-4 text-sm opacity-80">
            INITIATED: {new Date(activeEmergency.timestamp).toLocaleString()}
          </div>
          <div className="text-sm">
            TYPE: [{activeEmergency.type.toUpperCase().replace('_', ' ')}]
          </div>
        </div>

        {/* Insurance Wallet */}
        {vehicle && (
          <InsuranceWallet
            vehicle={vehicle}
            onClose={() => {}}
          />
        )}

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={cancelEmergency}
            className="retro-btn retro-btn-beveled py-4"
          >
            [FALSE ALARM - CANCEL]
          </button>
          <button
            onClick={() => resolveEmergency(activeEmergency.id)}
            className="retro-btn retro-btn-beveled retro-btn-danger py-4"
          >
            [SITUATION RESOLVED]
          </button>
        </div>

        {/* Emergency Contacts */}
        <div className="retro-panel p-4">
          <div className="retro-panel-header mb-3">
            <span className="text-xs">EMERGENCY CONTACTS</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <a href="tel:999" className="retro-btn-beveled p-4 block">
              <div className="text-2xl font-bold text-glow-red">999</div>
              <div className="text-xs opacity-70">EMERGENCY</div>
            </a>
            <a href="tel:101" className="retro-btn-beveled p-4 block">
              <div className="text-2xl font-bold text-glow">101</div>
              <div className="text-xs opacity-70">POLICE</div>
            </a>
            <a href="tel:07700900000" className="retro-btn-beveled p-4 block">
              <div className="text-lg font-bold text-glow-amber">COORD</div>
              <div className="text-xs opacity-70">COMMUNITY</div>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Normal State - Trigger Panel
  return (
    <div className="space-y-6">
      {/* Main Panic Button */}
      <div className="retro-panel">
        <div className="retro-panel-header">
          <span>PANIC PROTOCOL INTERFACE</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="text-sm opacity-80 border-b border-green-900 pb-4">
            <div className="terminal-prompt mb-2">EMERGENCY ACTIVATION SEQUENCE</div>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>SELECT VEHICLE FROM REGISTRY</li>
              <li>CHOOSE EMERGENCY TYPE</li>
              <li>ACTIVATE PANIC PROTOCOL</li>
              <li>SHOW DIGITAL WALLET TO AUTHORITIES</li>
            </ol>
          </div>

          {/* Vehicle Selection */}
          <div>
            <label className="block text-xs opacity-70 mb-2 uppercase tracking-wider">
              SELECT VEHICLE
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="retro-select w-full"
            >
              <option value="">-- SELECT UNIT --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} | {v.make} {v.model}
                  {v.currentDriver ? ` | ${v.currentDriver}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Emergency Type */}
          <div>
            <label className="block text-xs opacity-70 mb-2 uppercase tracking-wider">
              EMERGENCY TYPE
            </label>
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
              className="retro-select w-full"
            >
              <option value="police_stop">POLICE STOP</option>
              <option value="accident">ACCIDENT</option>
              <option value="breakdown">BREAKDOWN</option>
              <option value="medical">MEDICAL</option>
              <option value="other">OTHER</option>
            </select>
          </div>

          {/* Panic Button */}
          <button
            onClick={handleTrigger}
            disabled={!selectedVehicle}
            className={`w-full py-6 text-2xl font-bold uppercase tracking-widest transition-all ${
              selectedVehicle
                ? 'retro-btn retro-btn-danger retro-btn-beveled hover:shadow-red-500/50 hover:shadow-lg'
                : 'bg-gray-900 text-gray-700 border-2 border-gray-800 cursor-not-allowed'
            }`}
          >
            [ACTIVATE PANIC PROTOCOL]
          </button>

          <div className="text-center text-xs opacity-50">
            THIS WILL BROADCAST AN ALERT TO ALL COMMUNITY MEMBERS
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="retro-panel border-glow-red max-w-md w-full alarm-active">
            <div className="retro-panel-header text-red-500">
              <span>! CONFIRM ACTIVATION !</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="text-xl font-bold text-red-400 mb-2">
                  INITIATE EMERGENCY PROTOCOL?
                </div>
                <div className="text-sm opacity-80">
                  All community members will be notified immediately.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="retro-btn retro-btn-beveled py-3"
                >
                  [CANCEL]
                </button>
                <button
                  onClick={confirmTrigger}
                  className="retro-btn retro-btn-danger retro-btn-beveled py-3 font-bold"
                >
                  [CONFIRM]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PanicProtocol;
