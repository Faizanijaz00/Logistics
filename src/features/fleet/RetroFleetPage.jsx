import { RetroHeader } from '../shared/components/RetroHeader';
import { VehicleLedger } from './components/VehicleLedger';

export function RetroFleetPage() {
  return (
    <div className="min-h-screen" style={{ background: '#000500' }}>
      <RetroHeader
        title="FLEET LEDGER"
        subtitle="VEHICLE SPECIFICATIONS & MAINTENANCE LOG"
      />

      <div className="p-6">
        <VehicleLedger />
      </div>
    </div>
  );
}

export default RetroFleetPage;
