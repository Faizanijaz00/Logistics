import { Outlet } from 'react-router-dom';
import { ModernSidebar } from './ModernSidebar';
import { useIsMobile } from '../../../hooks/useIsMobile';

export function ModernLayout() {
  const mobile = useIsMobile();

  return (
    <div
      style={{
        height: '100vh',
        background: '#f4f4f4',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ModernSidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        marginTop: mobile ? '56px' : '64px',
        paddingBottom: mobile ? '64px' : 0,
      }}>
        <Outlet />
      </main>
    </div>
  );
}

export default ModernLayout;
