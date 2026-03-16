import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, Map, Car, User, Bell, AlertCircle, LogOut, ChevronDown, BarChart3, Route } from 'lucide-react';
import { useNotificationStore, useEmergencyStore, useAuthStore, useVehicleStore } from '../../../store';
import { useIsMobile } from '../../../hooks/useIsMobile';

const driverNavItems = [
  { to: '/', icon: User, label: 'My Profile' },
  { to: '/map', icon: Map, label: 'Live Map' },
  { to: '/fleet', icon: Car, label: 'Fleet' },
  { to: '/journeys', icon: Route, label: 'Journeys' },
];

const adminNavItems = [
  { to: '/', icon: User, label: 'My Profile' },
  { to: '/map', icon: Map, label: 'Live Map' },
  { to: '/fleet', icon: Car, label: 'Fleet' },
  { to: '/journeys', icon: Route, label: 'Journeys' },
  { to: '/admin', icon: BarChart3, label: 'Admin' },
];

export function ModernSidebar() {
  const { unreadCount } = useNotificationStore();
  const { isEmergencyMode } = useEmergencyStore();
  const { user, logout } = useAuthStore();

  const navItems = user?.role === 'admin' ? adminNavItems : driverNavItems;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const mobile = useIsMobile();
  const location = useLocation();

  const handleSignOut = () => {
    setShowUserMenu(false);
    logout();
  };

  const handleChangeCar = () => {
    setShowUserMenu(false);
    const currentVehicleId = user?.selectedVehicleId;
    if (currentVehicleId && currentVehicleId !== '__skip__') {
      const { clearDriver } = useVehicleStore.getState();
      clearDriver(currentVehicleId);
    }
    useAuthStore.setState(s => ({ user: { ...s.user, selectedVehicleId: null }, carSelectReady: false }));
  };

  return (
    <>
      {/* Top Bar */}
      <header
        style={{
          width: '100%',
          background: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: mobile ? '0 16px' : '0 40px',
            height: mobile ? '56px' : '64px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginRight: mobile ? '0' : '48px',
            }}
          >
            <Menu style={{ width: '20px', height: '20px', color: '#000000' }} />
            {!mobile && (
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#000000',
                }}
              >
                Fleet Hub
              </span>
            )}
          </div>

          {/* Navigation - Desktop only */}
          {!mobile && (
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flex: 1 }}>
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '400',
                    color: isActive ? '#ffffff' : '#323639',
                    background: isActive ? '#000000' : 'transparent',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                  })}
                  onMouseOver={(e) => {
                    const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                    if (!isActive) e.currentTarget.style.background = '#f0f0f0';
                  }}
                  onMouseOut={(e) => {
                    const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon style={{ width: '18px', height: '18px' }} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          )}

          {/* Spacer on mobile */}
          {mobile && <div style={{ flex: 1 }} />}

          {/* Emergency Alert Banner */}
          {isEmergencyMode && !mobile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'rgba(196, 0, 26, 0.08)',
                border: '1px solid rgba(196, 0, 26, 0.2)',
                borderRadius: '4px',
                color: '#c4001a',
                marginRight: '24px',
              }}
            >
              <AlertCircle style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Emergency Active</span>
            </div>
          )}

          {/* User Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? '8px' : '16px' }}>
            <button
              style={{
                position: 'relative',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f0f0f0')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Bell style={{ width: '20px', height: '20px', color: '#626669' }} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    background: '#c4001a',
                    borderRadius: '50%',
                  }}
                />
              )}
            </button>

            {/* User dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: mobile ? '6px' : '10px',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: showUserMenu ? '#f0f0f0' : 'transparent',
                  border: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => { if (!showUserMenu) e.currentTarget.style.background = '#f0f0f0'; }}
                onMouseOut={(e) => { if (!showUserMenu) e.currentTarget.style.background = 'transparent'; }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#f4f4f4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User style={{ width: '16px', height: '16px', color: '#626669' }} />
                </div>
                {!mobile && (
                  <span style={{ fontSize: '14px', color: '#323639', fontWeight: '500' }}>{user?.name || 'Account'}</span>
                )}
                <ChevronDown style={{ width: '14px', height: '14px', color: '#999', transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      background: '#ffffff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      minWidth: '200px',
                      zIndex: 1000,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#000', margin: '0 0 4px' }}>
                        {user?.name}
                      </p>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '500',
                        color: user?.role === 'admin' ? '#fff' : '#666',
                        background: user?.role === 'admin' ? '#000' : '#f0f0f0',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        textTransform: 'capitalize',
                      }}>
                        {user?.role}
                      </span>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <button
                        onClick={handleChangeCar}
                        style={{
                          width: '100%',
                          padding: '10px 20px',
                          fontSize: '13px',
                          color: '#323639',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Car style={{ width: '16px', height: '16px', color: '#626669' }} />
                        Change Car
                      </button>
                      <button
                        onClick={handleSignOut}
                        style={{
                          width: '100%',
                          padding: '10px 20px',
                          fontSize: '13px',
                          color: '#c4001a',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#fff5f5')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <LogOut style={{ width: '16px', height: '16px' }} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Tab Bar — mobile only */}
      {mobile && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#ffffff',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '64px',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || (to === '/' && location.pathname === '');
            return (
              <NavLink
                key={to}
                to={to}
                end
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  textDecoration: 'none',
                  color: isActive ? '#000000' : '#999',
                  transition: 'color 150ms ease',
                }}
              >
                <Icon style={{ width: '22px', height: '22px' }} />
                <span style={{ fontSize: '11px', fontWeight: isActive ? '600' : '400' }}>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </>
  );
}

export default ModernSidebar;
