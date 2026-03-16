import { RetroHeader } from '../shared/components/RetroHeader';
import { PanicProtocol } from './components/PanicProtocol';
import { useEmergencyStore } from '../../store';

export function RetroEmergencyPage() {
  const { isEmergencyMode, emergencyHistory } = useEmergencyStore();

  return (
    <div className="min-h-screen" style={{ background: '#000500' }}>
      <RetroHeader
        title={isEmergencyMode ? '! ALERT ACTIVE !' : 'PANIC PROTOCOL'}
        subtitle="EMERGENCY RESPONSE & DOCUMENT ACCESS"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <PanicProtocol />
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Reference */}
            <div className="retro-panel">
              <div className="retro-panel-header">
                <span>QUICK REFERENCE</span>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs opacity-70 mb-1">WHEN STOPPED BY POLICE:</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs opacity-80">
                    <li>REMAIN CALM</li>
                    <li>ACTIVATE PANIC PROTOCOL</li>
                    <li>SHOW DIGITAL WALLET</li>
                    <li>PROVIDE SHARE LINK IF NEEDED</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="retro-panel">
              <div className="retro-panel-header">
                <span>EMERGENCY CONTACTS</span>
              </div>
              <div className="p-4 space-y-3">
                <a
                  href="tel:999"
                  className="retro-btn-beveled block p-4 text-center hover:bg-red-950/30"
                >
                  <div className="text-2xl font-bold text-glow-red">999</div>
                  <div className="text-xs opacity-70">EMERGENCY SERVICES</div>
                </a>
                <a
                  href="tel:101"
                  className="retro-btn-beveled block p-4 text-center hover:bg-green-950/30"
                >
                  <div className="text-xl font-bold text-glow">101</div>
                  <div className="text-xs opacity-70">NON-EMERGENCY</div>
                </a>
              </div>
            </div>

            {/* History */}
            {emergencyHistory.length > 0 && (
              <div className="retro-panel">
                <div className="retro-panel-header">
                  <span>INCIDENT LOG</span>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto">
                  {emergencyHistory.slice(0, 5).map((incident) => (
                    <div
                      key={incident.id}
                      className="py-2 border-b border-green-900 last:border-0 text-xs"
                    >
                      <div className="flex justify-between">
                        <span className="uppercase">
                          [{incident.type.replace('_', ' ')}]
                        </span>
                        <span className="opacity-50">
                          {new Date(incident.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="opacity-70 mt-1">
                        {incident.vehicle.licensePlate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="retro-panel-beveled p-4 text-center text-xs">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="status-dot status-dot-active" />
                <span>SYSTEM READY</span>
              </div>
              <div className="opacity-50">
                PANIC PROTOCOL v3.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RetroEmergencyPage;
