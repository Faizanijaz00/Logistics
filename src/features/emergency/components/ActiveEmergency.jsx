import { useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Share2,
  Copy,
  Check,
  X,
  Phone,
  MapPin,
} from 'lucide-react';
import { useEmergencyStore } from '../../../store';

export function ActiveEmergency({ compact = false }) {
  const [copied, setCopied] = useState(false);
  const { activeEmergency, isEmergencyMode, resolveEmergency, cancelEmergency, getEmergencyShareLink } =
    useEmergencyStore();

  if (!isEmergencyMode || !activeEmergency) {
    return null;
  }

  const shareLink = getEmergencyShareLink();

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { vehicle } = activeEmergency;

  // Compact version for horizontal bar
  if (compact) {
    return (
      <div
        style={{
          background: '#c4001a',
          borderRadius: '4px',
          padding: '16px 20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ffffff',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
            EMERGENCY ACTIVE
          </span>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'capitalize',
            }}
          >
            {activeEmergency.type.replace('_', ' ')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
            {vehicle.make} {vehicle.model} • {vehicle.licensePlate}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={cancelEmergency}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <X style={{ width: '12px', height: '12px' }} />
              Cancel
            </button>
            <button
              onClick={() => resolveEmergency(activeEmergency.id)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: '#ffffff',
                color: '#018a16',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Check style={{ width: '12px', height: '12px' }} />
              Resolved
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div
      style={{
        background: '#ffffff',
        border: '2px solid #c4001a',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: '#c4001a',
          padding: '24px',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>EMERGENCY ACTIVE</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                {new Date(activeEmergency.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <span
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              fontSize: '12px',
              fontWeight: '500',
              textTransform: 'capitalize',
            }}
          >
            {activeEmergency.type.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Vehicle Info */}
        <div
          style={{
            background: '#f4f4f4',
            borderRadius: '4px',
            padding: '20px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#323639',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                background: '#c4001a',
                borderRadius: '50%',
              }}
            />
            Vehicle Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#626669', margin: '0 0 4px' }}>Vehicle</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#000000', margin: 0 }}>
                {vehicle.make} {vehicle.model}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#626669', margin: '0 0 4px' }}>License Plate</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#000000', margin: 0, fontFamily: 'monospace' }}>
                {vehicle.licensePlate}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#626669', margin: '0 0 4px' }}>Color</p>
              <p style={{ fontSize: '14px', color: '#323639', margin: 0 }}>{vehicle.color}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#626669', margin: '0 0 4px' }}>Driver</p>
              <p style={{ fontSize: '14px', color: '#323639', margin: 0 }}>{activeEmergency.driverId}</p>
            </div>
          </div>
        </div>

        {/* Insurance Details */}
        <div
          style={{
            background: '#f4f4f4',
            borderRadius: '4px',
            padding: '20px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#323639',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileText style={{ width: '16px', height: '16px', color: '#0061bd' }} />
            Insurance Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(0, 97, 189, 0.08)',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#626669' }}>Provider</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#000000' }}>
                {vehicle.insurance.provider}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(0, 97, 189, 0.08)',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#626669' }}>Policy Number</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#000000', fontFamily: 'monospace' }}>
                {vehicle.insurance.policyNumber}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(0, 97, 189, 0.08)',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#626669' }}>Expiry Date</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#000000' }}>
                {vehicle.insurance.expiryDate}
              </span>
            </div>
          </div>

          <a
            href={vehicle.insurance.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '16px',
              padding: '12px 24px',
              background: '#0061bd',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '400',
              borderRadius: '2px',
              textDecoration: 'none',
            }}
          >
            <FileText style={{ width: '16px', height: '16px' }} />
            View Insurance Document
          </a>
        </div>

        {/* Quick Share */}
        <div
          style={{
            background: '#f4f4f4',
            borderRadius: '4px',
            padding: '20px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#323639',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Share2 style={{ width: '16px', height: '16px', color: '#018a16' }} />
            Instant Share Link
          </h3>
          <p style={{ fontSize: '12px', color: '#626669', marginBottom: '12px' }}>
            Share this link with authorities to verify insurance
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={shareLink || ''}
              readOnly
              style={{
                flex: 1,
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid #c9cacb',
                borderRadius: '2px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#323639',
              }}
            />
            <button
              onClick={handleCopyLink}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: '500',
                background: copied ? '#018a16' : '#ffffff',
                color: copied ? '#ffffff' : '#323639',
                border: copied ? 'none' : '1px solid #c9cacb',
                borderRadius: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={cancelEmergency}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontSize: '14px',
              fontWeight: '400',
              background: 'transparent',
              color: '#323639',
              border: '1px solid #c9cacb',
              borderRadius: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
            False Alarm
          </button>
          <button
            onClick={() => resolveEmergency(activeEmergency.id)}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontSize: '14px',
              fontWeight: '500',
              background: '#018a16',
              color: '#ffffff',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Check style={{ width: '16px', height: '16px' }} />
            Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
