import { RetroHeader } from '../shared/components/RetroHeader';
import { DispatchCenter } from './components/DispatchCenter';

export function RetroRequestsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#000500' }}>
      <RetroHeader
        title="DISPATCH CENTER"
        subtitle="COMMUNITY RIDE REQUEST MANAGEMENT"
      />

      <div className="p-6">
        <DispatchCenter />
      </div>
    </div>
  );
}

export default RetroRequestsPage;
