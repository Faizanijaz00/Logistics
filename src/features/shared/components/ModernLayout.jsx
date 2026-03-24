import { Outlet, useLocation } from 'react-router-dom';
import { ModernSidebar } from './ModernSidebar';
import { useIsMobile } from '../../../hooks/useIsMobile';

export function ModernLayout() {
  const mobile = useIsMobile();
  const location = useLocation();

  return (
    <div
      className="modern-app"
      style={{
        height: '100vh',
        background: '#f4f4f4',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ModernSidebar />
      <main
        key={location.pathname}
        style={{
          flex: 1,
          overflow: 'auto',
          marginTop: mobile ? '56px' : '64px',
          paddingBottom: mobile ? '64px' : 0,
          position: 'relative',
          zIndex: 0,
          isolation: 'isolate',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default ModernLayout;
