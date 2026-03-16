import { PanicButton, ActiveEmergency, DocumentVault } from './components';
import { useEmergencyStore } from '../../store';
import { Phone, Clock } from 'lucide-react';

export function EmergencyPage() {
  const { isEmergencyMode, emergencyHistory } = useEmergencyStore();

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4' }}>
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px 40px',
          borderBottom: '1px solid #e0e0e0',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '18px',
            fontWeight: '500',
            margin: 0,
            color: '#000000',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Emergency
        </h1>
      </div>

      {/* Top Horizontal Bar - Emergency Controls & Contacts */}
      <div
        style={{
          background: '#ffffff',
          padding: '24px 40px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
          {/* Panic Button / Active Emergency - Compact */}
          <div style={{ flex: '0 0 280px' }}>
            {isEmergencyMode ? (
              <ActiveEmergency compact />
            ) : (
              <PanicButton compact />
            )}
          </div>

          {/* Emergency Contacts - Horizontal */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                background: 'rgba(196, 0, 26, 0.08)',
                borderRadius: '4px',
              }}
            >
              <Phone style={{ width: '20px', height: '20px', color: '#c4001a' }} />
              <a
                href="tel:999"
                style={{
                  textDecoration: 'none',
                }}
              >
                <p style={{ fontSize: '24px', fontWeight: '500', color: '#c4001a', margin: 0 }}>
                  999
                </p>
                <p style={{ fontSize: '12px', color: '#c4001a', margin: 0 }}>
                  Emergency Services
                </p>
              </a>
            </div>

            <a
              href="tel:101"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                background: 'rgba(0, 97, 189, 0.08)',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              <Phone style={{ width: '20px', height: '20px', color: '#0061bd' }} />
              <div>
                <p style={{ fontSize: '20px', fontWeight: '500', color: '#0061bd', margin: 0 }}>
                  101
                </p>
                <p style={{ fontSize: '12px', color: '#0061bd', margin: 0 }}>
                  Non-Emergency
                </p>
              </div>
            </a>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                background: '#f4f4f4',
                borderRadius: '4px',
              }}
            >
              <Phone style={{ width: '20px', height: '20px', color: '#626669' }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#000000', margin: 0 }}>
                  Community Coordinator
                </p>
                <p style={{ fontSize: '14px', color: '#626669', margin: 0 }}>
                  +44 7700 900000
                </p>
              </div>
            </div>

            {/* Emergency History - Compact horizontal */}
            {emergencyHistory.length > 0 && (
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  background: '#f4f4f4',
                  borderRadius: '4px',
                }}
              >
                <Clock style={{ width: '20px', height: '20px', color: '#626669' }} />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#000000', margin: 0 }}>
                    Recent: {emergencyHistory[0]?.type.replace('_', ' ')}
                  </p>
                  <p style={{ fontSize: '12px', color: '#626669', margin: 0 }}>
                    {emergencyHistory.length} past {emergencyHistory.length === 1 ? 'emergency' : 'emergencies'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Document Vault (Full Width) */}
      <div style={{ padding: '32px 40px' }}>
        <DocumentVault />
      </div>
    </div>
  );
}
