import { Marker, OverlayView } from '@react-google-maps/api';
import { useState } from 'react';
import { useEmergencyStore, useCarImageStore } from '../../../store';

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return '#22c55e';
    case 'parked':
      return '#3b82f6';
    case 'maintenance':
      return '#f59e0b';
    case 'emergency':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'active': return 'En Route';
    case 'parked': return 'Parked';
    case 'maintenance': return 'Maintenance';
    case 'emergency': return 'Emergency';
    default: return 'Offline';
  }
};

const colorNameToHex = (name) => {
  const map = {
    white: '#e8e8e8',
    blue: '#3b82f6',
    silver: '#b0b0b0',
    red: '#ef4444',
    black: '#2a2a2a',
    green: '#22c55e',
    grey: '#9ca3af',
    gray: '#9ca3af',
    yellow: '#eab308',
    orange: '#f97316',
  };
  return map[(name || '').toLowerCase()] || '#94a3b8';
};

// Custom PNG icons mapped by make+model (lowercase)
const customIcons = {
  'mercedes gle': '/icons/gle.png',
};

// Car SVG with license plate and vehicle color
const createMarkerIcon = (status, vehicleColor, plate, vehicle) => {
  const key = `${vehicle?.make || ''} ${vehicle?.model || ''}`.toLowerCase().trim();
  if (customIcons[key]) {
    return {
      url: customIcons[key],
      scaledSize: { width: 40, height: 80 },
      anchor: { x: 20, y: 40 },
    };
  }

  const body = colorNameToHex(vehicleColor);
  const statusCol = getStatusColor(status);
  const nameText = (`${vehicle?.make || ''} ${vehicle?.model || ''}`.trim() || plate || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="46" viewBox="0 0 72 46">
    <ellipse cx="36" cy="30" rx="24" ry="2" fill="rgba(0,0,0,0.12)"/>
    <rect x="8" y="14" width="56" height="14" rx="4" fill="${body}"/>
    <path d="M18 14 L24 4 Q25 2 27 2 L45 2 Q47 2 48 4 L54 14" fill="${body}"/>
    <path d="M24.5 13 L28 4.5 Q28.5 3.5 30 3.5 L42 3.5 Q43.5 3.5 44 4.5 L47.5 13" fill="#d1e4f6" opacity="0.85"/>
    <line x1="36" y1="3.5" x2="36" y2="13" stroke="${body}" stroke-width="1.2"/>
    <rect x="60" y="16" width="5" height="5" rx="1.5" fill="#fef08a"/>
    <rect x="7" y="16" width="4" height="5" rx="1.5" fill="#fca5a5"/>
    <rect x="12" y="15.5" width="48" height="1.5" rx="0.75" fill="rgba(255,255,255,0.25)"/>
    <circle cx="50" cy="28" r="5" fill="#1e293b"/>
    <circle cx="50" cy="28" r="2.5" fill="#94a3b8"/>
    <circle cx="22" cy="28" r="5" fill="#1e293b"/>
    <circle cx="22" cy="28" r="2.5" fill="#94a3b8"/>
    <path d="M27 2.5 L45 2.5" stroke="rgba(255,255,255,0.4)" stroke-width="0.8" stroke-linecap="round"/>
    <circle cx="62" cy="6" r="5" fill="${statusCol}" stroke="#fff" stroke-width="1.5"/>
    <rect x="14" y="34" width="44" height="11" rx="2.5" fill="#fff" stroke="#bbb" stroke-width="0.7"/>
    <text x="36" y="42.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.5" font-weight="700" fill="#222">${nameText}</text>
  </svg>`;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 72, height: 46 },
    anchor: { x: 36, y: 28 },
  };
};

export function VehicleMarker({ vehicle }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isEmergencyMode, activeEmergency } = useEmergencyStore();
  const { images: carImages } = useCarImageStore();

  const isThisVehicleEmergency =
    isEmergencyMode && activeEmergency?.vehicleId === vehicle.id;

  const effectiveStatus = isThisVehicleEmergency ? 'emergency' : vehicle.status;
  const statusColor = getStatusColor(effectiveStatus);
  const position = { lat: vehicle.position.lat, lng: vehicle.position.lng };

  // Use uploaded car image if available, otherwise SVG marker.
  // A full URL imageId is an uploaded vehicle photo — use it directly.
  const carImageUrl = vehicle.imageId
    ? (/^https?:\/\//i.test(vehicle.imageId)
        ? vehicle.imageId
        : carImages?.find(img => img.id === vehicle.imageId)?.url || null)
    : null;

  const carLabel = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || vehicle.licensePlate || '';

  return (
    <>
      {carImageUrl ? (
        <OverlayView
          position={position}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
        >
          <div
            onClick={() => setIsOpen(!isOpen)}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none', position: 'relative' }}
          >
            {/* Car image — no circle, just the photo with shadow */}
            <img
              src={carImageUrl}
              alt={carLabel}
              style={{
                width: '64px', height: '40px', objectFit: 'contain',
                filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))',
              }}
            />
            {/* Status dot */}
            <div style={{
              position: 'absolute', top: '-2px', right: '-2px',
              width: '10px', height: '10px', borderRadius: '50%',
              background: statusColor, border: '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
            {/* Label */}
            <div style={{
              marginTop: '2px',
              background: 'rgba(0,0,0,0.72)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 7px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              letterSpacing: '0.3px',
            }}>{carLabel}</div>
            {/* Stem */}
            <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(0,0,0,0.72)' }} />
          </div>
        </OverlayView>
      ) : (
        <Marker
          position={position}
          icon={createMarkerIcon(effectiveStatus, vehicle.color, vehicle.licensePlate, vehicle)}
          onClick={() => setIsOpen(!isOpen)}
        />
      )}
      {isOpen && (
        <OverlayView
          position={position}
          mapPaneName={OverlayView.FLOAT_PANE}
          getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 50) })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              width: '220px',
              overflow: 'hidden',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 14px 10px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#111', lineHeight: 1.2 }}>
                  {vehicle.make} {vehicle.model}
                </div>
                <div style={{
                  display: 'inline-block',
                  marginTop: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: statusColor,
                  background: statusColor + '14',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}>
                  {getStatusLabel(effectiveStatus)}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  fontSize: '18px',
                  lineHeight: 1,
                  padding: '0 0 0 8px',
                }}
              >
                &times;
              </button>
            </div>

            {/* Details */}
            <div style={{ padding: '10px 14px 12px' }}>
              {vehicle.currentDriver && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Driver</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#222' }}>{vehicle.currentDriver}</span>
                </div>
              )}

              {vehicle.destination && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Destination</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#222', textAlign: 'right', maxWidth: '130px' }}>{vehicle.destination}</span>
                </div>
              )}

              {vehicle.parkedAt && !vehicle.currentDriver && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Parked at</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', textAlign: 'right', maxWidth: '130px' }}>{vehicle.parkedAt}</span>
                </div>
              )}

              {!vehicle.currentDriver && vehicle.lastDriver && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Last driver</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#222' }}>{vehicle.lastDriver}</span>
                </div>
              )}

              {vehicle.route?.durationText && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>ETA</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#222' }}>{vehicle.route.durationText}</span>
                </div>
              )}

              {!vehicle.currentDriver && !vehicle.destination && !vehicle.parkedAt && !vehicle.lastDriver && !vehicle.route?.durationText && (
                <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'center' }}>
                  No active journey
                </div>
              )}
            </div>

            {/* Arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #fff',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
            }} />
          </div>
        </OverlayView>
      )}
    </>
  );
}
