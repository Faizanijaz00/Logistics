import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useEmergencyStore } from '../../../store';

export function MainLayout() {
  const { isEmergencyMode } = useEmergencyStore();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main
        className={`flex-1 overflow-auto ${
          isEmergencyMode ? 'ring-4 ring-inset ring-red-500' : ''
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
