import { Outlet } from 'react-router-dom';
import { RetroSidebar } from './RetroSidebar';
import { useEmergencyStore } from '../../../store';

export function RetroLayout() {
  const { isEmergencyMode } = useEmergencyStore();

  return (
    <div className={`flex min-h-screen crt-scanlines crt-flicker crt-vignette ${
      isEmergencyMode ? 'crt-emergency' : ''
    }`}
    style={{ background: '#000500' }}
    >
      <RetroSidebar />
      <main
        className={`flex-1 overflow-auto ${
          isEmergencyMode ? 'ring-2 ring-inset ring-red-500' : ''
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default RetroLayout;
