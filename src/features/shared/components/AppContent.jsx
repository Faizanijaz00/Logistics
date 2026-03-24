import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ModernSidebar } from './ModernSidebar';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useAuthStore } from '../../../store';
import { ModernMapPage } from '../../map';
import { ModernFleetPage } from '../../fleet';
import JourneyPlannerPage from '../../journeys/JourneyPlannerPage';
import TicketsPage from '../../tickets/TicketsPage';
import { MyProfilePage } from '../../profile';
import { AdminOverviewPage } from '../../admin/AdminOverviewPage';

function getPage(pathname) {
  switch (pathname) {
    case '/':        return <MyProfilePage />;
    case '/map':     return <ModernMapPage />;
    case '/fleet':   return <ModernFleetPage />;
    case '/journeys': return <JourneyPlannerPage />;
    case '/tickets': return <TicketsPage />;
    case '/admin':   return <AdminOverviewPage />;
    default:         return <MyProfilePage />;
  }
}

export default function AppContent() {
  const mobile = useIsMobile();
  const location = useLocation();
  const mainRef = useRef(null);
  const adminUser = useAuthStore((s) => s.adminUser);
  const user = useAuthStore((s) => s.user);

  // Scroll main to top on every route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const impersonating = adminUser && user?.username !== adminUser?.username;

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
      {impersonating && (
        <div
          style={{
            position: 'fixed',
            top: mobile ? '56px' : '64px',
            left: 0,
            right: 0,
            zIndex: 999,
            background: '#0061bd',
            color: '#fff',
            padding: '6px 20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Viewing as <strong>{user?.name}</strong></span>
          <button
            onClick={() => useAuthStore.getState().switchBackToAdmin()}
            style={{
              padding: '3px 12px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#0061bd',
              background: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Back to {adminUser.name}
          </button>
        </div>
      )}
      <main
        ref={mainRef}
        style={{
          flex: 1,
          overflow: 'auto',
          marginTop: mobile ? (impersonating ? '88px' : '56px') : (impersonating ? '96px' : '64px'),
          paddingBottom: mobile ? '64px' : 0,
        }}
      >
        <div key={location.pathname} style={{ height: '100%' }}>
          {getPage(location.pathname)}
        </div>
      </main>
    </div>
  );
}
