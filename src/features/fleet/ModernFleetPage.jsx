import { useState, useEffect, useCallback } from 'react';
import { useVehicleStore, useCarImageStore, useAuthStore } from '../../store';
import { Plus, Trash2, X, ChevronRight, Pencil, Image, Link, Search, Loader2, Upload } from 'lucide-react';
import { lookupVehicle } from '../../services/vehicleLookupService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SERVER_URL } from '../../config/api';

// Default fallback car image
const DEFAULT_CAR_IMAGE = '/cars/merc.png';

// Helper: returns expiry status based on a date string (used in VehicleCard + VehicleDetail)
function getExpiryStatus(dateStr) {
  if (!dateStr) return null;
  const expiry = new Date(dateStr);
  if (isNaN(expiry.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { color: '#c4001a', bg: '#fef2f2', border: '#fecaca', label: 'Expired', urgent: true };
  if (daysLeft <= 7) return { color: '#92400e', bg: '#fffbeb', border: '#fde68a', label: `${daysLeft}d left`, urgent: true };
  return { color: '#018a16', bg: '#f0fdf4', border: '#bbf7d0', label: 'Valid', urgent: false };
}

function VehicleCard({ vehicle, onSelect, onRemove, onEdit, carImages }) {
  const mobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);

  // Get the car image URL - null if none assigned
  const carImage = vehicle.imageId
    ? carImages?.find(img => img.id === vehicle.imageId)?.url || null
    : null;

  // Check expiry urgency for MOT, tax, insurance
  const motExp = getExpiryStatus(vehicle.mot?.expiryDate);
  const taxExp = getExpiryStatus(vehicle.tax?.expiryDate);
  const insExp = getExpiryStatus(vehicle.insurance?.expiryDate);
  const urgentItems = [
    motExp?.urgent && 'MOT',
    taxExp?.urgent && 'Tax',
    insExp?.urgent && 'Insurance',
  ].filter(Boolean);
  const hasUrgent = urgentItems.length > 0;
  const isExpired = (motExp?.label === 'Expired') || (taxExp?.label === 'Expired') || (insExp?.label === 'Expired');

  return (
    <div
      style={{
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 0.4s cubic-bezier(.25,.1,.25,1)',
        transform: isHovered ? 'scale3d(1.03, 1.03, 1.03)' : 'scale3d(1, 1, 1)',
        paddingTop: mobile ? '100px' : '140px',
      }}
      onClick={() => onSelect?.(vehicle)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit button - appears on hover (admin only) */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(vehicle);
          }}
          style={{
            position: 'absolute',
            top: '150px',
            left: '10px',
            width: '36px',
            height: '36px',
            background: '#fff',
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 10,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#010205';
            e.currentTarget.querySelector('svg').style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.querySelector('svg').style.color = '#010205';
          }}
        >
          <Pencil style={{ width: '16px', height: '16px', color: '#010205', transition: 'color 0.2s' }} />
        </button>
      )}

      {/* Remove button - appears on hover (admin only) */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(vehicle.id);
          }}
          style={{
            position: 'absolute',
            top: '150px',
            right: '10px',
            width: '36px',
            height: '36px',
            background: '#fff',
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 10,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#c4001a';
            e.currentTarget.querySelector('svg').style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.querySelector('svg').style.color = '#010205';
          }}
        >
          <Trash2 style={{ width: '16px', height: '16px', color: '#010205', transition: 'color 0.2s' }} />
        </button>
      )}

      {/* Car Image - Floating above the card */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '110%',
          height: mobile ? '160px' : '280px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 3,
        }}
      >
        <img
          src={carImage}
          alt={`${vehicle.make} ${vehicle.model}`}
          style={{
            width: '100%',
            maxWidth: mobile ? '280px' : '420px',
            maxHeight: mobile ? '160px' : '240px',
            objectFit: 'contain',
            transition: 'transform 0.4s cubic-bezier(.25,.1,.25,1)',
            filter: isHovered
              ? 'drop-shadow(0 45px 55px rgba(0, 0, 0, 0.5)) drop-shadow(0 20px 25px rgba(0, 0, 0, 0.3))'
              : 'drop-shadow(0 30px 40px rgba(0, 0, 0, 0.35))',
            transform: isHovered ? 'translateY(-50px) scale(1.02)' : 'translateY(-15px) scale(1)',
          }}
        />
      </div>

      {/* Car Info Card + Driver card attached */}
      <div
        style={{
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: vehicle.status === 'maintenance'
            ? '0 0 20px rgba(196, 0, 26, 0.5), 0 0 40px rgba(196, 0, 26, 0.3), 0 4px 20px rgba(0, 0, 0, 0.1)'
            : '0 4px 20px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          zIndex: 1,
          border: vehicle.status === 'maintenance' ? '2px solid #c4001a' : 'none',
        }}
      >
        {/* Main vehicle info */}
        <div style={{ background: '#ffffff', padding: mobile ? '60px 14px 14px' : '100px 30px 30px' }}>
          <div style={{ fontSize: mobile ? '1.1rem' : '1.4rem', fontWeight: '600', color: '#010205', marginBottom: mobile ? '4px' : '8px' }}>
            {vehicle.make} {vehicle.model}
          </div>
          <div style={{ fontSize: mobile ? '0.75rem' : '0.9rem', color: '#6b6b6b', marginBottom: hasUrgent ? (mobile ? '8px' : '12px') : (mobile ? '12px' : '20px') }}>
            {vehicle.year} · {vehicle.color} · {vehicle.licensePlate}
          </div>

          {/* Expiry warning badge */}
          {hasUrgent && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px',
              background: isExpired ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${isExpired ? '#fecaca' : '#fde68a'}`,
              marginBottom: mobile ? '12px' : '20px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isExpired ? '#c4001a' : '#d97706', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: '11px', fontWeight: '600', color: isExpired ? '#c4001a' : '#92400e' }}>
                {urgentItems.join(' · ')} {isExpired ? 'expired' : 'expiring soon'}
              </span>
            </div>
          )}

          {/* Specs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: mobile ? '12px' : '20px',
              borderTop: '1px solid #eeeff2',
            }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: mobile ? '0.9rem' : '1.1rem', fontWeight: '600', color: '#010205' }}>
              {vehicle.fuelType || 'Diesel'}
            </div>
            <div style={{ fontSize: mobile ? '0.65rem' : '0.75rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
              Fuel
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: mobile ? '0.9rem' : '1.1rem', fontWeight: '600', color: '#010205' }}>
              {vehicle.transmission || 'Auto'}
            </div>
            <div style={{ fontSize: mobile ? '0.65rem' : '0.75rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
              Trans
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: mobile ? '0.9rem' : '1.1rem', fontWeight: '600', color: '#010205' }}>
              {vehicle.driveType?.replace('-Wheel Drive', 'WD') || 'RWD'}
            </div>
            <div style={{ fontSize: mobile ? '0.65rem' : '0.75rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
              Drive
            </div>
          </div>
        </div>
        </div>

        {/* Driver card — attached to bottom */}
        <div style={{
          background: vehicle.currentDriver ? '#0a0a0a' : '#f5f5f5',
          padding: mobile ? '10px 14px 12px' : '14px 24px 16px',
        }}>
          {/* Driver row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: vehicle.currentDriver ? '#4ade80' : '#ccc',
                boxShadow: vehicle.currentDriver ? '0 0 8px rgba(74,222,128,0.6)' : 'none',
              }} />
              <span style={{
                fontSize: '0.85rem', fontWeight: '600',
                color: vehicle.currentDriver ? '#fff' : '#999',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {vehicle.currentDriver
                  ? vehicle.currentDriver
                  : vehicle.lastDriver
                    ? `Last driven by ${vehicle.lastDriver}`
                    : 'No driver assigned'}
              </span>
            </div>
            {vehicle.currentDriver && vehicle.destination && (
              <span style={{
                fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                flexShrink: 1, minWidth: 0,
              }}>
                → {vehicle.destination}
              </span>
            )}
          </div>
          {/* Location row */}
          {vehicle.parkedAt && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginTop: '6px', paddingLeft: '18px',
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: vehicle.currentDriver ? 'rgba(255,255,255,0.45)' : '#3b82f6',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Parked — {vehicle.parkedAt}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Arrow CTA */}
      <div
        style={{
          position: 'absolute',
          bottom: '68px',
          right: '30px',
          width: '40px',
          height: '40px',
          background: '#010205',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateX(0)' : 'translateX(-10px)',
          transition: 'all 0.3s ease',
          zIndex: 2,
        }}
      >
        <ChevronRight style={{ width: '20px', height: '20px', color: '#ffffff' }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value, field, isEditing, editData, onEdit, type = 'text', options, statusColor }) {
  const mobile = useIsMobile();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '32px' }}>
      <span style={{ color: '#666666', fontSize: '14px' }}>{label}</span>
      {isEditing ? (
        options ? (
          <select
            value={editData[field] ?? value}
            onChange={(e) => onEdit(field, e.target.value)}
            style={{
              padding: '6px 10px', fontSize: mobile ? '16px' : '14px', fontWeight: '500',
              border: '1px solid #d1d1d1', background: '#fff', color: '#000',
              outline: 'none', textAlign: 'right', minWidth: mobile ? '120px' : '140px',
            }}
          >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={editData[field] ?? value}
            onChange={(e) => onEdit(field, type === 'number' ? Number(e.target.value) : e.target.value)}
            style={{
              padding: '6px 10px', fontSize: mobile ? '16px' : '14px', fontWeight: '500',
              border: '1px solid #d1d1d1', background: '#fff', color: '#000',
              outline: 'none', textAlign: 'right', width: mobile ? '120px' : '140px',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#000')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')}
          />
        )
      ) : (
        <span style={{ color: statusColor || '#000000', fontSize: '14px', fontWeight: '500', textTransform: statusColor ? 'capitalize' : 'none' }}>
          {value}
        </span>
      )}
    </div>
  );
}

function DetailCard({ title, children, isEditing, onEditToggle, onSave, onCancel }) {
  const mobile = useIsMobile();
  return (
    <div style={{ background: '#f8f8f8', padding: mobile ? '20px 16px' : '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
          {title}
        </h3>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onCancel}
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '500', background: 'transparent', border: '1px solid #d1d1d1', color: '#666', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#666'; }}
            >Cancel</button>
            <button onClick={onSave}
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '500', background: '#000', border: '1px solid #000', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#000')}
            >Save</button>
          </div>
        ) : onEditToggle ? (
          <button onClick={onEditToggle}
            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '500', background: 'transparent', border: '1px solid #d1d1d1', color: '#666', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#666'; }}
          >Edit</button>
        ) : null}
      </div>
      <div style={{ display: 'grid', gap: '14px' }}>
        {children}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'financials', label: 'Financials' },
  { id: 'keeper', label: 'Keeper' },
  { id: 'documents', label: 'Documents' },
  { id: 'history', label: 'History' },
];

function VehicleDetail({ vehicle, onClose, carImages, isAdmin, onUpdateVehicle }) {
  const mobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);

  // Daily refresh — only fetches if not already refreshed today
  useEffect(() => {
    if (!vehicle?.licensePlate) return;
    const today = new Date().toISOString().split('T')[0];
    if (vehicle.lastRefreshed === today) return;
    lookupVehicle(vehicle.licensePlate).then((data) => {
      onUpdateVehicle(vehicle.id, {
        lastRefreshed: today,
        mot: {
          status: data.motStatus || vehicle.mot?.status || '',
          expiryDate: data.motExpiry || vehicle.mot?.expiryDate || '',
          history: data.motHistory?.length ? data.motHistory : (vehicle.mot?.history || []),
        },
        tax: {
          ...vehicle.tax,
          status: data.taxStatus || vehicle.tax?.status || '',
          expiryDate: data.taxDueDate || vehicle.tax?.expiryDate || '',
        },
      });
    }).catch(() => {});
  }, [vehicle?.id]);

  if (!vehicle) return null;

  const hasPhoto = !!vehicle.photoUrl;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingPhoto(true);
    try {
      const dataUri = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const authHeader = useAuthStore.getState().getAuthHeader();
      const resp = await fetch(`${SERVER_URL}/api/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ imageData: dataUri }),
      });
      if (resp.ok) {
        const { url } = await resp.json();
        onUpdateVehicle(vehicle.id, { photoUrl: url });
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const handleDocUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(docType);
    try {
      const dataUri = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const authHeader = useAuthStore.getState().getAuthHeader();
      const resp = await fetch(`${SERVER_URL}/api/upload-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ imageData: dataUri, filename: file.name }),
      });
      if (resp.ok) {
        const { url } = await resp.json();
        const documents = { ...(vehicle.documents || {}) };
        documents[docType] = { url, filename: file.name, uploadedAt: new Date().toISOString() };
        onUpdateVehicle(vehicle.id, { documents });
      }
    } catch (err) {
      console.error('Doc upload failed:', err);
    }
    setUploadingDoc(null);
    e.target.value = '';
  };

  const handleEdit = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (section) => {
    const updates = {};
    if (section === 'vehicle') {
      Object.entries(editData).forEach(([key, val]) => { updates[key] = val; });
    } else if (section === 'insurance') {
      updates.insurance = { ...vehicle.insurance };
      Object.entries(editData).forEach(([key, val]) => { updates.insurance[key] = val; });
    } else if (section === 'maintenance') {
      updates.maintenance = { ...vehicle.maintenance };
      Object.entries(editData).forEach(([key, val]) => { updates.maintenance[key] = val; });
    } else if (section === 'tax') {
      updates.tax = { ...vehicle.tax };
      Object.entries(editData).forEach(([key, val]) => { updates.tax[key] = val; });
    } else if (section === 'mot') {
      updates.mot = { ...(vehicle.mot || {}) };
      Object.entries(editData).forEach(([key, val]) => { updates.mot[key] = val; });
    } else if (section === 'purchase') {
      updates.purchase = { ...(vehicle.purchase || {}) };
      Object.entries(editData).forEach(([key, val]) => { updates.purchase[key] = val; });
    } else if (section === 'keeper') {
      updates.keeper = { ...(vehicle.keeper || {}) };
      Object.entries(editData).forEach(([key, val]) => { updates.keeper[key] = val; });
    } else if (section === 'payments') {
      updates.insurance = { ...vehicle.insurance, paidBy: editData.insurancePaidBy ?? vehicle.insurance?.paidBy ?? '' };
      updates.tax = { ...vehicle.tax, paidBy: editData.taxPaidBy ?? vehicle.tax?.paidBy ?? '' };
      updates.maintenance = { ...vehicle.maintenance, paidBy: editData.maintenancePaidBy ?? vehicle.maintenance?.paidBy ?? '' };
      updates.fuel = { ...(vehicle.fuel || { records: [], totalCost: 0 }), paidBy: editData.fuelPaidBy ?? vehicle.fuel?.paidBy ?? '' };
    }
    onUpdateVehicle(vehicle.id, updates);
    setEditingSection(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditData({});
  };

  const isEditing = (section) => editingSection === section;

  const motExp = getExpiryStatus(vehicle.mot?.expiryDate);
  const taxExp = getExpiryStatus(vehicle.tax?.expiryDate);
  const insExp = getExpiryStatus(vehicle.insurance?.expiryDate);
  const hasUrgent = motExp?.urgent || taxExp?.urgent || insExp?.urgent;

  return (
    <div style={{ minHeight: '100vh', background: '#EEEFF2' }}>
      {/* Hero Section */}
      <div
        style={{
          position: 'relative',
          background: hasPhoto ? '#000' : 'linear-gradient(180deg, #EEEFF2 0%, #e5e5e5 100%)',
          height: hasPhoto ? '460px' : '200px',
          overflow: 'hidden',
          transition: 'height 0.3s ease',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '24px', left: mobile ? '16px' : '40px',
            padding: '10px 20px', fontSize: '13px', fontWeight: '500',
            background: hasPhoto ? 'rgba(0,0,0,0.5)' : 'transparent',
            border: hasPhoto ? '1.5px solid rgba(255,255,255,0.6)' : '1.5px solid #000000',
            color: hasPhoto ? '#ffffff' : '#000000', cursor: 'pointer', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.2s ease',
            backdropFilter: hasPhoto ? 'blur(8px)' : 'none',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = hasPhoto ? 'rgba(255,255,255,0.2)' : '#000000';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = hasPhoto ? 'rgba(0,0,0,0.5)' : 'transparent';
            e.currentTarget.style.color = hasPhoto ? '#ffffff' : '#000000';
          }}
        >
          ← Back to Fleet
        </button>

        {hasPhoto ? (
          <>
            <img src={vehicle.photoUrl} alt={`${vehicle.make} ${vehicle.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }} />
            {isAdmin && (
              <label
                style={{
                  position: 'absolute', top: '24px', right: mobile ? '16px' : '40px',
                  padding: '10px 20px', fontSize: '13px', fontWeight: '500',
                  background: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(255,255,255,0.6)',
                  color: '#ffffff', cursor: uploadingPhoto ? 'wait' : 'pointer', zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(8px)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
              >
                <Image style={{ width: '16px', height: '16px' }} />
                {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            )}
          </>
        ) : isAdmin ? (
          <label
            style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              padding: '16px 32px', fontSize: '14px', fontWeight: '500',
              background: '#000000', border: 'none', color: '#ffffff',
              cursor: uploadingPhoto ? 'wait' : 'pointer', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#333333')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#000000')}
          >
            <Image style={{ width: '18px', height: '18px' }} />
            {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </label>
        ) : null}
      </div>

      {/* Title bar + Tabs */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: mobile ? '20px 16px 0' : '32px 40px 0' }}>
          <div style={{ paddingBottom: mobile ? '16px' : '20px' }}>
            <h1 style={{ fontSize: mobile ? '24px' : '32px', fontWeight: '500', color: '#000', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              {vehicle.make} {vehicle.model}
            </h1>
            <div style={{ display: 'flex', gap: mobile ? '8px' : '12px', alignItems: 'center', fontSize: '14px', color: '#666', flexWrap: 'wrap' }}>
              <span>{vehicle.year}</span>
              <span style={{ color: '#d1d1d1' }}>·</span>
              <span>{vehicle.color}</span>
              <span style={{ color: '#d1d1d1' }}>·</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '700', letterSpacing: '1.5px', background: '#ffffcc', padding: '2px 8px', border: '1px solid #ddd700', color: '#000', fontSize: '13px' }}>{vehicle.licensePlate}</span>
              {hasUrgent && (
                <span style={{ background: '#fef2f2', color: '#c4001a', border: '1px solid #fecaca', padding: '2px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '10px' }}>
                  Action Required
                </span>
              )}
            </div>
          </div>
          {/* Tab bar */}
          <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: mobile ? '10px 14px' : '12px 20px',
                  fontSize: mobile ? '13px' : '14px',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  color: activeTab === tab.id ? '#000' : '#777',
                  background: 'transparent', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #000' : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  marginBottom: '-1px', transition: 'color 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                onMouseOver={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#333'; }}
                onMouseOut={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#777'; }}
              >
                {tab.label}
                {tab.id === 'overview' && hasUrgent && (
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#c4001a', borderRadius: '50%' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: mobile ? '20px 16px 48px' : '32px 40px 64px' }}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Expiry status cards */}
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
              {/* MOT */}
              {(() => {
                const s = motExp;
                const ok = vehicle.mot?.status?.toLowerCase() === 'valid';
                const color = s ? s.color : (ok ? '#018a16' : (vehicle.mot?.status ? '#c4001a' : '#888'));
                const bg = s ? s.bg : (ok ? '#f0fdf4' : (vehicle.mot?.status ? '#fef2f2' : '#f8f8f8'));
                const border = s ? s.border : (ok ? '#bbf7d0' : (vehicle.mot?.status ? '#fecaca' : '#e5e5e5'));
                return (
                  <div style={{ padding: '20px 24px', background: bg, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>MOT</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color, marginBottom: '4px' }}>
                      {s ? s.label : (ok ? 'Valid' : (vehicle.mot?.status || 'Unknown'))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{vehicle.mot?.status || '—'}</div>
                    {vehicle.mot?.expiryDate && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                        Expires {new Date(vehicle.mot.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Tax */}
              {(() => {
                const s = taxExp;
                const ok = ['paid', 'taxed'].includes(vehicle.tax?.status?.toLowerCase());
                const color = s ? s.color : (ok ? '#018a16' : '#c4001a');
                const bg = s ? s.bg : (ok ? '#f0fdf4' : '#fef2f2');
                const border = s ? s.border : (ok ? '#bbf7d0' : '#fecaca');
                const statusLabel = vehicle.tax?.status ? (vehicle.tax.status.charAt(0).toUpperCase() + vehicle.tax.status.slice(1)) : 'Unknown';
                return (
                  <div style={{ padding: '20px 24px', background: bg, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Road Tax</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color, marginBottom: '4px' }}>
                      {s ? s.label : statusLabel}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{statusLabel}</div>
                    {vehicle.tax?.expiryDate && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                        Due {new Date(vehicle.tax.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Insurance */}
              {(() => {
                const s = insExp;
                const color = s ? s.color : '#018a16';
                const bg = s ? s.bg : '#f0fdf4';
                const border = s ? s.border : '#bbf7d0';
                return (
                  <div style={{ padding: '20px 24px', background: bg, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Insurance</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color, marginBottom: '4px' }}>
                      {s ? s.label : 'Valid'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{vehicle.insurance?.provider || '—'}</div>
                    {vehicle.insurance?.expiryDate && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                        Expires {new Date(vehicle.insurance.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Current status */}
            <div style={{ background: '#f8f8f8', padding: mobile ? '20px 16px' : '24px 28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Current Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Driver</div>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: vehicle.currentDriver ? '#000' : '#aaa' }}>
                    {vehicle.currentDriver || 'No driver assigned'}
                  </div>
                  {vehicle.lastDriver && !vehicle.currentDriver && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Last: {vehicle.lastDriver}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: (vehicle.destination || vehicle.parkedAt) ? '#000' : '#aaa' }}>
                    {vehicle.destination || vehicle.parkedAt || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick specs */}
            <div style={{ background: '#f8f8f8', padding: mobile ? '20px 16px' : '24px 28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Fuel', value: vehicle.fuelType || '—' },
                  { label: 'Transmission', value: vehicle.transmission || '—' },
                  { label: 'Drive', value: vehicle.driveType?.replace('-Wheel Drive', 'WD') || '—' },
                  { label: 'Engine', value: vehicle.engineCapacity ? `${vehicle.engineCapacity}cc` : '—' },
                  { label: 'CO2', value: vehicle.co2Emissions ? `${vehicle.co2Emissions}g/km` : '—' },
                  { label: 'First Reg', value: vehicle.monthOfFirstRegistration || '—' },
                  { label: 'GPS', value: vehicle.trackerId ? 'Connected' : 'None' },
                  { label: 'Status', value: vehicle.status ? (vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)) : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#000' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DETAILS ── */}
        {activeTab === 'details' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <DetailCard title="Vehicle Information" isEditing={isEditing('vehicle')}
              onEditToggle={isAdmin ? () => { setEditingSection('vehicle'); setEditData({}); } : null}
              onSave={() => handleSave('vehicle')} onCancel={handleCancel}
            >
              <DetailRow label="Make" value={vehicle.make} field="make" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Model" value={vehicle.model} field="model" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Year" value={vehicle.year} field="year" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit} type="number" />
              <DetailRow label="Colour" value={vehicle.color} field="color" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Registration" value={vehicle.licensePlate} field="licensePlate" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Fuel Type" value={vehicle.fuelType || 'Diesel'} field="fuelType" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit}
                options={[{value:'Petrol',label:'Petrol'},{value:'Diesel',label:'Diesel'},{value:'Electric',label:'Electric'},{value:'Hybrid',label:'Hybrid'}]} />
              <DetailRow label="Transmission" value={vehicle.transmission || 'Automatic'} field="transmission" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit}
                options={[{value:'Automatic',label:'Automatic'},{value:'Manual',label:'Manual'}]} />
              <DetailRow label="Drive Type" value={vehicle.driveType || 'RWD'} field="driveType" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit}
                options={[{value:'Rear-Wheel Drive',label:'RWD'},{value:'Front-Wheel Drive',label:'FWD'},{value:'All-Wheel Drive',label:'AWD'}]} />
              <DetailRow label="GPS Tracker (IMEI)" value={vehicle.trackerId || 'Not connected'} field="trackerId" isEditing={isEditing('vehicle')} editData={editData} onEdit={handleEdit} />
            </DetailCard>

            <DetailCard title="Insurance" isEditing={isEditing('insurance')}
              onEditToggle={isAdmin ? () => { setEditingSection('insurance'); setEditData({}); } : null}
              onSave={() => handleSave('insurance')} onCancel={handleCancel}
            >
              <DetailRow label="Provider" value={vehicle.insurance?.provider || '—'} field="provider" isEditing={isEditing('insurance')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Policy Number" value={vehicle.insurance?.policyNumber || '—'} field="policyNumber" isEditing={isEditing('insurance')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Expiry Date" value={vehicle.insurance?.expiryDate || '—'} field="expiryDate" isEditing={isEditing('insurance')} editData={editData} onEdit={handleEdit} type="date"
                statusColor={insExp ? insExp.color : undefined} />
              <DetailRow label="Annual Cost" value={`£${vehicle.insurance?.annualCost?.toLocaleString() || '0'}`} field="annualCost" isEditing={isEditing('insurance')} editData={editData} onEdit={handleEdit} type="number" />
              <DetailRow label="Insurance Address" value={vehicle.insurance?.address || '—'} field="address" isEditing={isEditing('insurance')} editData={editData} onEdit={handleEdit} />
            </DetailCard>

            <DetailCard title="Road Tax" isEditing={isEditing('tax')}
              onEditToggle={isAdmin ? () => { setEditingSection('tax'); setEditData({}); } : null}
              onSave={() => handleSave('tax')} onCancel={handleCancel}
            >
              <DetailRow label="Status" value={vehicle.tax?.status || '—'} field="status" isEditing={isEditing('tax')} editData={editData} onEdit={handleEdit}
                options={[{value:'paid',label:'Paid'},{value:'taxed',label:'Taxed'},{value:'due',label:'Due'}]}
                statusColor={taxExp ? taxExp.color : (['paid','taxed'].includes(vehicle.tax?.status?.toLowerCase()) ? '#018a16' : '#c4001a')} />
              <DetailRow label="Expiry Date" value={vehicle.tax?.expiryDate || '—'} field="expiryDate" isEditing={isEditing('tax')} editData={editData} onEdit={handleEdit} type="date"
                statusColor={taxExp ? taxExp.color : undefined} />
              <DetailRow label="Annual Cost" value={`£${vehicle.tax?.annualCost || '0'}`} field="annualCost" isEditing={isEditing('tax')} editData={editData} onEdit={handleEdit} type="number" />
            </DetailCard>

            <DetailCard title="MOT" isEditing={isEditing('mot')}
              onEditToggle={isAdmin ? () => { setEditingSection('mot'); setEditData({}); } : null}
              onSave={() => handleSave('mot')} onCancel={handleCancel}
            >
              <DetailRow label="Status" value={vehicle.mot?.status || 'N/A'} field="status" isEditing={isEditing('mot')} editData={editData} onEdit={handleEdit}
                options={[{value:'Valid',label:'Valid'},{value:'Not valid',label:'Not Valid'},{value:'No details held by DVLA',label:'No Details'}]}
                statusColor={motExp ? motExp.color : (vehicle.mot?.status?.toLowerCase() === 'valid' ? '#018a16' : vehicle.mot?.status ? '#c4001a' : undefined)} />
              <DetailRow label="Expiry Date" value={vehicle.mot?.expiryDate || 'N/A'} field="expiryDate" isEditing={isEditing('mot')} editData={editData} onEdit={handleEdit} type="date"
                statusColor={motExp ? motExp.color : undefined} />
            </DetailCard>

            <DetailCard title="Service & Maintenance" isEditing={isEditing('maintenance')}
              onEditToggle={isAdmin ? () => { setEditingSection('maintenance'); setEditData({}); } : null}
              onSave={() => handleSave('maintenance')} onCancel={handleCancel}
            >
              <DetailRow label="Last Service" value={vehicle.maintenance?.lastService || '—'} field="lastService" isEditing={isEditing('maintenance')} editData={editData} onEdit={handleEdit} type="date" />
              <DetailRow label="Next Service" value={vehicle.maintenance?.nextService || '—'} field="nextService" isEditing={isEditing('maintenance')} editData={editData} onEdit={handleEdit} type="date" />
              <DetailRow label="Service Cost" value={`£${vehicle.maintenance?.serviceCost?.toLocaleString() || '0'}`} field="serviceCost" isEditing={isEditing('maintenance')} editData={editData} onEdit={handleEdit} type="number" />
            </DetailCard>
          </div>
        )}

        {/* ── FINANCIALS ── */}
        {activeTab === 'financials' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <DetailCard title="Purchase Information" isEditing={isEditing('purchase')}
              onEditToggle={isAdmin ? () => { setEditingSection('purchase'); setEditData({ ...(vehicle.purchase || {}) }); } : null}
              onSave={() => handleSave('purchase')} onCancel={handleCancel}
            >
              {isEditing('purchase') ? (
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '32px' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>Purchase Type</span>
                    <select
                      value={editData.type ?? vehicle.purchase?.type ?? 'outright'}
                      onChange={(e) => handleEdit('type', e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '14px', fontWeight: '500', border: '1px solid #d1d1d1', background: '#fff', color: '#000', outline: 'none', minWidth: '140px' }}
                    >
                      <option value="outright">Outright</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <DetailRow label="Purchase Price (£)" value={vehicle.purchase?.price || ''} field="price" isEditing={true} editData={editData} onEdit={handleEdit} type="number" />
                  <DetailRow label="Purchase Date" value={vehicle.purchase?.date || ''} field="date" isEditing={true} editData={editData} onEdit={handleEdit} type="date" />
                  {(editData.type ?? vehicle.purchase?.type) === 'finance' && (<>
                    <DetailRow label="Financed Under" value={vehicle.purchase?.financedUnder || ''} field="financedUnder" isEditing={true} editData={editData} onEdit={handleEdit} />
                    <DetailRow label="Deposit (£)" value={vehicle.purchase?.deposit || ''} field="deposit" isEditing={true} editData={editData} onEdit={handleEdit} type="number" />
                    <DetailRow label="Interest Rate (%)" value={vehicle.purchase?.interestRate || ''} field="interestRate" isEditing={true} editData={editData} onEdit={handleEdit} type="number" />
                    <DetailRow label="Agreement Length (months)" value={vehicle.purchase?.agreementLength || ''} field="agreementLength" isEditing={true} editData={editData} onEdit={handleEdit} type="number" />
                    <DetailRow label="Monthly Payment (£)" value={vehicle.purchase?.monthlyPayment || ''} field="monthlyPayment" isEditing={true} editData={editData} onEdit={handleEdit} type="number" />
                  </>)}
                </div>
              ) : vehicle.purchase?.type ? (
                <>
                  <DetailRow label="Purchase Type" value={vehicle.purchase.type.charAt(0).toUpperCase() + vehicle.purchase.type.slice(1)} isEditing={false} />
                  {vehicle.purchase.price && <DetailRow label="Purchase Price" value={`£${Number(vehicle.purchase.price).toLocaleString()}`} isEditing={false} />}
                  {vehicle.purchase.date && <DetailRow label="Purchase Date" value={vehicle.purchase.date} isEditing={false} />}
                  {vehicle.purchase.type === 'finance' && (<>
                    {vehicle.purchase.financedUnder && <DetailRow label="Financed Under" value={vehicle.purchase.financedUnder} isEditing={false} />}
                    {vehicle.purchase.deposit && <DetailRow label="Deposit" value={`£${Number(vehicle.purchase.deposit).toLocaleString()}`} isEditing={false} />}
                    {vehicle.purchase.interestRate && <DetailRow label="Interest Rate" value={`${vehicle.purchase.interestRate}%`} isEditing={false} />}
                    {vehicle.purchase.agreementLength && <DetailRow label="Agreement Length" value={`${vehicle.purchase.agreementLength} months`} isEditing={false} />}
                    {vehicle.purchase.monthlyPayment && <DetailRow label="Monthly Payment" value={`£${Number(vehicle.purchase.monthlyPayment).toLocaleString()}`} isEditing={false} />}
                  </>)}
                </>
              ) : (
                <div style={{ color: '#bbb', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                  No purchase information added yet{isAdmin ? ' — click Edit to add' : ''}
                </div>
              )}
            </DetailCard>

            <DetailCard title="Annual Costs" isEditing={isEditing('payments')}
              onEditToggle={isAdmin ? () => { setEditingSection('payments'); setEditData({}); } : null}
              onSave={() => handleSave('payments')} onCancel={handleCancel}
            >
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Insurance', cost: vehicle.insurance?.annualCost, paidByField: 'insurancePaidBy', paidByValue: vehicle.insurance?.paidBy },
                      { label: 'Road Tax', cost: vehicle.tax?.annualCost, paidByField: 'taxPaidBy', paidByValue: vehicle.tax?.paidBy },
                      { label: 'Service', cost: vehicle.maintenance?.serviceCost, paidByField: 'maintenancePaidBy', paidByValue: vehicle.maintenance?.paidBy },
                      { label: 'Fuel', cost: vehicle.fuel?.totalCost || 0, paidByField: 'fuelPaidBy', paidByValue: vehicle.fuel?.paidBy },
                    ].map((row, i) => (
                      <tr key={row.label} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 1 ? '#fafafa' : 'transparent' }}>
                        <td style={{ padding: '12px', fontWeight: '500', color: '#000' }}>{row.label}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#323639' }}>£{row.cost?.toLocaleString() || '0'}</td>
                        <td style={{ padding: '12px' }}>
                          {isEditing('payments') ? (
                            <input type="text" value={editData[row.paidByField] ?? row.paidByValue ?? ''} onChange={(e) => handleEdit(row.paidByField, e.target.value)} placeholder="e.g. Company"
                              style={{ padding: '6px 10px', fontSize: mobile ? '16px' : '14px', border: '1px solid #d1d1d1', width: '100%', maxWidth: '160px', boxSizing: 'border-box', outline: 'none' }} />
                          ) : (
                            <span style={{ color: row.paidByValue ? '#323639' : '#ccc' }}>{row.paidByValue || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailCard>

            {vehicle.fuel?.records?.length > 0 && (
              <DetailCard title="Fuel History">
                <div style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Driver</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.fuel.records.map((rec, i) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 1 ? '#fafafa' : 'transparent' }}>
                          <td style={{ padding: '12px', color: '#323639' }}>{new Date(rec.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td style={{ padding: '12px', fontWeight: '500', color: '#000' }}>{rec.driverName}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500', color: '#323639' }}>£{rec.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #e0e0e0' }}>
                        <td colSpan={2} style={{ padding: '12px', fontWeight: '700' }}>Total</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700' }}>£{(vehicle.fuel.totalCost || 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </DetailCard>
            )}
          </div>
        )}

        {/* ── KEEPER ── */}
        {activeTab === 'keeper' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <DetailCard title="Registered Keeper" isEditing={isEditing('keeper')}
              onEditToggle={isAdmin ? () => { setEditingSection('keeper'); setEditData({ ...(vehicle.keeper || {}) }); } : null}
              onSave={() => handleSave('keeper')} onCancel={handleCancel}
            >
              <DetailRow label="Full Name" value={vehicle.keeper?.name || '—'} field="name" isEditing={isEditing('keeper')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Address Line 1" value={vehicle.keeper?.addressLine1 || '—'} field="addressLine1" isEditing={isEditing('keeper')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Address Line 2" value={vehicle.keeper?.addressLine2 || '—'} field="addressLine2" isEditing={isEditing('keeper')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="City / Town" value={vehicle.keeper?.city || '—'} field="city" isEditing={isEditing('keeper')} editData={editData} onEdit={handleEdit} />
              <DetailRow label="Postcode" value={vehicle.keeper?.postcode || '—'} field="postcode" isEditing={isEditing('keeper')} editData={editData} onEdit={handleEdit} />
              {!vehicle.keeper?.name && !isEditing('keeper') && (
                <div style={{ color: '#bbb', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>
                  No keeper information added yet{isAdmin ? ' — click Edit to add' : ''}
                </div>
              )}
            </DetailCard>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px 20px', fontSize: '13px', color: '#92400e' }}>
              The registered keeper address may differ from the insurance address. Insurance address is stored in the Details tab under Insurance.
            </div>
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {[
              { key: 'v5c', label: 'V5C (Logbook)', description: 'Vehicle Registration Certificate' },
              { key: 'serviceHistory', label: 'Service History', description: 'Full vehicle service records' },
              { key: 'paymentPlan', label: 'Payment Plan', description: 'Finance agreement or payment schedule' },
            ].map(({ key, label, description }) => {
              const doc = vehicle.documents?.[key];
              return (
                <div key={key} style={{ background: '#f8f8f8', padding: mobile ? '20px 16px' : '24px 28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#000', margin: '0 0 4px' }}>{label}</h3>
                      <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>{description}</p>
                    </div>
                    {isAdmin && (
                      <label
                        style={{
                          padding: '8px 16px', fontSize: '12px', fontWeight: '500',
                          background: 'transparent', border: '1px solid #d1d1d1', color: '#333',
                          cursor: uploadingDoc === key ? 'wait' : 'pointer', flexShrink: 0,
                          display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#333'; }}
                      >
                        <Upload style={{ width: '13px', height: '13px' }} />
                        {uploadingDoc === key ? 'Uploading...' : doc ? 'Replace' : 'Upload'}
                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => handleDocUpload(e, key)} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                  {doc ? (
                    <div style={{ marginTop: '14px', padding: '12px 16px', background: '#fff', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                        {doc.uploadedAt && (
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '500', background: '#000', color: '#fff', textDecoration: 'none', flexShrink: 0 }}>
                        View
                      </a>
                    </div>
                  ) : (
                    <div style={{ marginTop: '14px', padding: '24px', border: '2px dashed #e0e0e0', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#bbb' }}>No document uploaded</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            {vehicle.mot?.history?.length > 0 ? (
              <DetailCard title="MOT History">
                <div style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Date</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Result</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mileage</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#626669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.mot.history.map((test, i) => {
                        const passed = test.result?.toLowerCase() === 'passed';
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 1 ? '#fafafa' : 'transparent' }}>
                            <td style={{ padding: '12px', color: '#323639' }}>{test.testDate ? new Date(test.testDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', padding: '3px 10px', background: passed ? '#f0fdf4' : '#fef2f2', color: passed ? '#018a16' : '#c4001a', border: `1px solid ${passed ? '#bbf7d0' : '#fecaca'}` }}>
                                {test.result || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#323639' }}>{test.mileage ? `${Number(test.mileage).toLocaleString()} mi` : '—'}</td>
                            <td style={{ padding: '12px', color: '#323639' }}>{test.expiryDate || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(vehicle.mot.history[0]?.failures?.length > 0 || vehicle.mot.history[0]?.advisories?.length > 0) && (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Latest Test Details</div>
                    {vehicle.mot.history[0].failures?.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#c4001a', marginBottom: '8px' }}>Failures</div>
                        {vehicle.mot.history[0].failures.map((f, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#333', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>• {f}</div>
                        ))}
                      </div>
                    )}
                    {vehicle.mot.history[0].advisories?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>Advisories</div>
                        {vehicle.mot.history[0].advisories.map((a, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#333', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>• {a}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </DetailCard>
            ) : (
              <div style={{ background: '#f8f8f8', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#bbb' }}>No MOT history available</div>
                <div style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>MOT data is fetched automatically from DVLA once per day</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Styled input component
const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  fontSize: '16px',
  border: '1px solid #d1d1d1',
  borderRadius: '0',
  background: '#ffffff',
  color: '#000000',
  outline: 'none',
  transition: 'border-color 0.2s ease',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '500',
  color: '#000000',
  marginBottom: '8px',
  letterSpacing: '0.02em',
};

const colorOptions = [
  { value: 'White', hex: '#e8e8e8' },
  { value: 'Black', hex: '#1a1a1a' },
  { value: 'Blue', hex: '#2563eb' },
  { value: 'Red', hex: '#dc2626' },
  { value: 'Silver', hex: '#9ca3af' },
  { value: 'Grey', hex: '#6b7280' },
  { value: 'Green', hex: '#16a34a' },
];

// Image Picker Modal — opens as a separate window to select a car image
function ImagePickerModal({ images, selectedImageId, onSelect, onClose }) {
  const mobile = useIsMobile();
  const [hoveredImage, setHoveredImage] = useState(null);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Image style={{ width: '16px', height: '16px', color: '#333' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#000', margin: 0 }}>
                Select Image
              </h3>
              <p style={{ fontSize: '12px', color: '#999', margin: '2px 0 0' }}>
                {images.length} image{images.length !== 1 ? 's' : ''} in library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#f5f5f5', border: 'none', cursor: 'pointer', color: '#999', borderRadius: '50%',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; e.currentTarget.style.color = '#333'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#999'; }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* Image Grid */}
        <div style={{ overflow: 'auto', flex: 1, padding: '24px 28px 28px' }}>
          {images.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => { onSelect(img.id); onClose(); }}
                  onMouseEnter={() => setHoveredImage(img.id)}
                  onMouseLeave={() => setHoveredImage(null)}
                  style={{
                    padding: '16px 12px 12px',
                    background: selectedImageId === img.id ? '#f0f0f0' : '#fafafa',
                    border: selectedImageId === img.id ? '2px solid #000000' : '1px solid #f0f0f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: hoveredImage === img.id ? 'translateY(-2px)' : 'none',
                    boxShadow: hoveredImage === img.id ? '0 8px 20px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    style={{ width: '100%', height: '80px', objectFit: 'contain' }}
                  />
                  <p style={{
                    fontSize: '11px', fontWeight: '500',
                    color: selectedImageId === img.id ? '#000' : '#666',
                    margin: '10px 0 0', textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {img.name}
                  </p>
                  {selectedImageId === img.id && (
                    <div style={{
                      fontSize: '10px', fontWeight: '600', color: '#fff', background: '#000',
                      padding: '2px 8px', borderRadius: '10px', margin: '6px auto 0', width: 'fit-content',
                    }}>
                      SELECTED
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              background: '#fafafa', borderRadius: '8px', border: '1px dashed #e0e0e0',
            }}>
              <Image style={{ width: '32px', height: '32px', color: '#d4d4d4', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#999', margin: '0 0 4px' }}>No images yet</p>
              <p style={{ fontSize: '12px', color: '#ccc', margin: 0 }}>Add images using the Manage Images button on the Fleet page</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Manage Images Modal
function ManageImagesModal({ onClose, images, onAddImage, onRemoveImage, onRenameImage }) {
  const mobile = useIsMobile();
  const [newImageName, setNewImageName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('file');
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredImage, setHoveredImage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [renamingImage, setRenamingImage] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  // Queue: array of { id, name, previewUrl, status: 'pending'|'processing'|'done'|'error' }
  const [uploadQueue, setUploadQueue] = useState([]);

  const isProcessing = uploadQueue.some(item => item.status === 'processing' || item.status === 'pending');

  // Upload single image to server — removes bg and saves as file
  const uploadToServer = async (dataUri) => {
    const authHeader = useAuthStore.getState().getAuthHeader();
    const resp = await fetch(`${SERVER_URL}/api/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ imageData: dataUri }),
    });
    if (!resp.ok) throw new Error('Failed');
    const result = await resp.json();
    return result.url;
  };

  // Process the entire queue
  const processQueue = async (queue) => {
    for (const item of queue) {
      setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));
      try {
        const savedUrl = await uploadToServer(item.dataUri);
        if (savedUrl) {
          onAddImage(item.name, savedUrl);
          setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done' } : q));
        } else {
          setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q));
        }
      } catch {
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q));
      }
    }
    // Clear completed items after a short delay
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(q => q.status !== 'done'));
    }, 1500);
  };

  const readFileAsDataUri = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const newItems = await Promise.all(files.map(async (file) => {
      const dataUri = await readFileAsDataUri(file);
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      return { id: `q-${Date.now()}-${Math.random()}`, name, previewUrl: dataUri, dataUri, status: 'pending' };
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
    processQueue(newItems);
    // Reset file input so same files can be re-selected
    e.target.value = '';
  };

  const handleUrlAdd = (e) => {
    e.preventDefault();
    if (newImageName.trim() && newImageUrl.trim()) {
      onAddImage(newImageName.trim(), newImageUrl.trim());
      setNewImageName('');
      setNewImageUrl('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setUploadMode('file');
    const newItems = await Promise.all(files.map(async (file) => {
      const dataUri = await readFileAsDataUri(file);
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      return { id: `q-${Date.now()}-${Math.random()}`, name, previewUrl: dataUri, dataUri, status: 'pending' };
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
    processQueue(newItems);
  };

  const handleDelete = (imgId) => {
    if (confirmDelete === imgId) {
      onRemoveImage(imgId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(imgId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '28px 36px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Image style={{ width: '18px', height: '18px', color: '#333' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#000', margin: 0, letterSpacing: '-0.02em' }}>
                Image Library
              </h2>
              <p style={{ fontSize: '13px', color: '#999', margin: '2px 0 0' }}>
                {images.length} image{images.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#f5f5f5', border: 'none', cursor: 'pointer', color: '#999', borderRadius: '50%',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; e.currentTarget.style.color = '#333'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#999'; }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {/* Upload Section */}
          <div style={{ padding: '28px 36px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Add New Image
              </span>
              <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '6px', padding: '3px' }}>
                <button type="button" onClick={() => setUploadMode('file')}
                  style={{
                    padding: '5px 14px', fontSize: '12px', fontWeight: '500', borderRadius: '4px',
                    color: uploadMode === 'file' ? '#fff' : '#666',
                    background: uploadMode === 'file' ? '#000' : 'transparent',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Upload style={{ width: '11px', height: '11px' }} /> File
                </button>
                <button type="button" onClick={() => setUploadMode('url')}
                  style={{
                    padding: '5px 14px', fontSize: '12px', fontWeight: '500', borderRadius: '4px',
                    color: uploadMode === 'url' ? '#fff' : '#666',
                    background: uploadMode === 'url' ? '#000' : 'transparent',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Link style={{ width: '11px', height: '11px' }} /> URL
                </button>
              </div>
            </div>

            {uploadMode === 'file' ? (
              <>
                {/* Drop zone — multi-file, auto-processes immediately */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    position: 'relative',
                    border: isDragging ? '2px dashed #000' : '2px dashed #d4d4d4',
                    borderRadius: '8px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isDragging ? '#fafafa' : '#fff',
                  }}
                >
                  <input
                    type="file" accept="image/*" multiple onChange={handleFileUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                  />
                  <Upload style={{ width: '24px', height: '24px', color: isDragging ? '#000' : '#ccc', margin: '0 auto 12px', transition: 'color 0.2s' }} />
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#333', margin: '0 0 4px' }}>
                    Drop images here or click to browse
                  </p>
                  <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Select multiple files — backgrounds removed automatically</p>
                </div>

                {/* Upload queue */}
                {uploadQueue.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {uploadQueue.map((item) => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', background: '#fafafa', borderRadius: '6px',
                        border: item.status === 'done' ? '1px solid #bbf7d0' : item.status === 'error' ? '1px solid #fecaca' : '1px solid #f0f0f0',
                      }}>
                        <img src={item.previewUrl} alt="" style={{ width: '48px', height: '32px', objectFit: 'contain', borderRadius: '3px', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        {item.status === 'pending' && (
                          <span style={{ fontSize: '11px', color: '#999', flexShrink: 0 }}>Queued</span>
                        )}
                        {item.status === 'processing' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <Loader2 style={{ width: '14px', height: '14px', color: '#000', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '11px', color: '#000', fontWeight: '500' }}>Processing</span>
                          </div>
                        )}
                        {item.status === 'done' && (
                          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '500', flexShrink: 0 }}>Done</span>
                        )}
                        {item.status === 'error' && (
                          <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '500', flexShrink: 0 }}>Failed</span>
                        )}
                      </div>
                    ))}
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleUrlAdd}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text" value={newImageName} onChange={(e) => setNewImageName(e.target.value)}
                      style={{ ...inputStyle, borderRadius: '6px', fontSize: '13px', padding: '12px 14px', background: '#fafafa', borderColor: '#e5e5e5' }}
                      placeholder="Vehicle name"
                      onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <input
                      type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                      style={{ ...inputStyle, borderRadius: '6px', fontSize: '13px', padding: '12px 14px', background: '#fafafa', borderColor: '#e5e5e5' }}
                      placeholder="https://example.com/car.png"
                      onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e5e5e5'; e.target.style.background = '#fafafa'; }}
                    />
                  </div>
                  <button type="submit" disabled={!newImageName.trim() || !newImageUrl.trim()}
                    style={{
                      padding: '12px 24px', fontSize: '13px', fontWeight: '500', color: '#fff',
                      background: !newImageName.trim() || !newImageUrl.trim() ? '#ccc' : '#000',
                      border: 'none', cursor: !newImageName.trim() || !newImageUrl.trim() ? 'not-allowed' : 'pointer',
                      borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.2s ease', flexShrink: 0,
                    }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} />
                    Add
                  </button>
                </div>
                {newImageUrl && (
                  <div style={{ marginTop: '12px' }}>
                    <img src={newImageUrl} alt="Preview"
                      style={{ width: '80px', height: '48px', objectFit: 'contain', background: '#f5f5f5', borderRadius: '4px' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Image Library Grid */}
          <div style={{ padding: '28px 36px 36px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '20px' }}>
              Library
            </span>

            {images.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
                {images.map((img) => (
                  <div
                    key={img.id}
                    onMouseEnter={() => setHoveredImage(img.id)}
                    onMouseLeave={() => { setHoveredImage(null); if (confirmDelete === img.id) setConfirmDelete(null); }}
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      transform: hoveredImage === img.id ? 'translateY(-2px)' : 'none',
                      boxShadow: hoveredImage === img.id ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {/* Image area */}
                    <div style={{
                      padding: '20px 16px 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minHeight: '100px',
                    }}>
                      <img src={img.url} alt={img.name}
                        style={{ width: '100%', height: '80px', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Name + actions */}
                    <div style={{
                      padding: '10px 14px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                    }}>
                      {renamingImage === img.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && renameValue.trim()) {
                              onRenameImage(img.id, renameValue.trim());
                              setRenamingImage(null);
                            } else if (e.key === 'Escape') {
                              setRenamingImage(null);
                            }
                          }}
                          onBlur={() => {
                            if (renameValue.trim() && renameValue.trim() !== img.name) {
                              onRenameImage(img.id, renameValue.trim());
                            }
                            setRenamingImage(null);
                          }}
                          style={{
                            flex: 1, fontSize: '12px', fontWeight: '500', color: '#000',
                            padding: '4px 8px', border: '1px solid #000', borderRadius: '3px',
                            outline: 'none', background: '#fff', minWidth: 0,
                          }}
                        />
                      ) : (
                        <p
                          onDoubleClick={() => { setRenamingImage(img.id); setRenameValue(img.name); }}
                          title="Double-click to rename"
                          style={{
                            fontSize: '12px', fontWeight: '500', color: '#333', margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                            cursor: 'text', borderRadius: '3px', padding: '4px 0',
                          }}
                        >
                          {img.name}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '2px', flexShrink: 0, opacity: hoveredImage === img.id || confirmDelete === img.id || renamingImage === img.id ? 1 : 0, transition: 'opacity 0.2s' }}>
                        {renamingImage !== img.id && (
                          <button
                            onClick={() => { setRenamingImage(img.id); setRenameValue(img.name); }}
                            style={{
                              width: '26px', height: '26px', padding: 0,
                              background: 'transparent', border: 'none', borderRadius: '4px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Pencil style={{ width: '12px', height: '12px', color: '#666' }} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(img.id)}
                          style={{
                            width: confirmDelete === img.id ? 'auto' : '26px',
                            height: '26px',
                            padding: confirmDelete === img.id ? '0 10px' : '0',
                            background: confirmDelete === img.id ? '#c4001a' : 'transparent',
                            border: 'none', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            cursor: 'pointer',
                          }}
                          onMouseOver={(e) => { if (confirmDelete !== img.id) e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseOut={(e) => { if (confirmDelete !== img.id) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {confirmDelete === img.id ? (
                            <span style={{ fontSize: '11px', fontWeight: '500', color: '#fff', whiteSpace: 'nowrap' }}>Delete?</span>
                          ) : (
                            <Trash2 style={{ width: '13px', height: '13px', color: '#c4001a' }} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '48px 20px',
                background: '#fafafa', borderRadius: '8px', border: '1px dashed #e0e0e0',
              }}>
                <Image style={{ width: '32px', height: '32px', color: '#d4d4d4', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#999', margin: '0 0 4px' }}>No images yet</p>
                <p style={{ fontSize: '12px', color: '#ccc', margin: 0 }}>Upload your first vehicle image above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddVehicleModal({ onClose, onAdd, carImages }) {
  const [step, setStep] = useState('plate'); // 'plate' | 'details' | 'purchase'
  const [licensePlate, setLicensePlate] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: 'White',
    licensePlate: '',
    status: 'parked',
    fuelType: 'Diesel',
    driveType: 'Rear-Wheel Drive',
    transmission: 'Automatic',
    insuranceCost: 1200,
    imageId: carImages?.[0]?.id || null,
    purchaseType: 'outright',
    purchasePrice: '',
    purchaseDate: '',
    financedUnder: '',
    deposit: '',
    interestRate: '',
    agreementLength: '',
    monthlyPayment: '',
  });

  const handleRegLookup = async () => {
    if (!licensePlate || licensePlate.length < 2) return;
    setIsLookingUp(true);
    setLookupError('');
    try {
      const vehicleData = await lookupVehicle(licensePlate);
      setLookupResult(vehicleData);
      setFormData(prev => ({
        ...prev,
        licensePlate: licensePlate,
        make: vehicleData.make || prev.make,
        model: vehicleData.model || prev.model,
        year: vehicleData.year || prev.year,
        color: vehicleData.color || prev.color,
        fuelType: vehicleData.fuelType || prev.fuelType,
      }));
      setStep('details');
    } catch (error) {
      setLookupError(error.message || 'Could not find vehicle details. You can enter them manually.');
    }
    setIsLookingUp(false);
  };

  const handleSkipToManual = () => {
    setFormData(prev => ({ ...prev, licensePlate }));
    setStep('details');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const defaultDate = '2025-12-31';
    const purchase = {
      type: formData.purchaseType,
      price: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
      date: formData.purchaseDate || undefined,
      ...(formData.purchaseType === 'finance' ? {
        financedUnder: formData.financedUnder || undefined,
        deposit: formData.deposit ? Number(formData.deposit) : undefined,
        interestRate: formData.interestRate ? Number(formData.interestRate) : undefined,
        agreementLength: formData.agreementLength ? Number(formData.agreementLength) : undefined,
        monthlyPayment: formData.monthlyPayment ? Number(formData.monthlyPayment) : undefined,
      } : {}),
    };
    const newVehicle = {
      make: formData.make,
      model: formData.model,
      year: parseInt(formData.year),
      color: formData.color,
      licensePlate: formData.licensePlate,
      status: formData.status,
      fuelType: formData.fuelType,
      driveType: formData.driveType,
      transmission: formData.transmission,
      imageId: formData.imageId,
      trackerId: formData.trackerId || null,
      currentDriver: null,
      destination: null,
      dailyMileage: 0,
      heading: 0,
      position: { lat: 51.505, lng: -0.09 },
      route: null,
      purchase,
      insurance: {
        provider: 'TBD',
        policyNumber: 'TBD',
        expiryDate: defaultDate,
        annualCost: parseInt(formData.insuranceCost) || 0,
      },
      maintenance: {
        lastService: new Date().toISOString().split('T')[0],
        nextService: defaultDate,
        serviceCost: 0,
        tireWear: 100,
        oilLife: 100,
      },
      tax: {
        status: lookupResult?.taxStatus?.toLowerCase() === 'untaxed' ? 'due'
          : lookupResult?.taxStatus?.toLowerCase() === 'sorn' ? 'due'
          : 'paid',
        expiryDate: lookupResult?.taxDueDate || defaultDate,
        annualCost: 165,
      },
      mot: {
        status: lookupResult?.motStatus || '',
        expiryDate: lookupResult?.motExpiry || '',
        history: lookupResult?.motHistory || [],
      },
      engineCapacity: lookupResult?.engineSize || '',
      co2Emissions: lookupResult?.co2Emissions || null,
      parkingPermit: null,
    };
    onAdd(newVehicle);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: step === 'plate' ? '480px' : '560px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          transition: 'max-width 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {step !== 'plate' && (
              <button
                onClick={() => setStep(step === 'purchase' ? 'details' : 'plate')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '18px',
                  padding: '4px 8px',
                  transition: 'color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#000')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#666')}
              >
                ←
              </button>
            )}
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#000000',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {step === 'plate' ? 'Add New Vehicle' : step === 'details' ? 'Confirm Details' : 'Purchase Information'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#666666',
              borderRadius: '50%',
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Step 1: Number Plate Entry */}
        {step === 'plate' && (
          <div style={{ padding: '48px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                Enter the vehicle registration number and we'll automatically fill in the details
              </p>
            </div>

            <div style={{ maxWidth: '360px', margin: '0 auto' }}>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => { setLicensePlate(e.target.value.toUpperCase()); setLookupError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRegLookup())}
                autoFocus
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  fontSize: '28px',
                  fontWeight: '700',
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  border: '2px solid #000000',
                  background: '#ffffcc',
                  color: '#000000',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
                placeholder="AB12 CDE"
              />

              {lookupError && (
                <p style={{ color: '#c4001a', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{lookupError}</p>
              )}

              <button
                type="button"
                onClick={handleRegLookup}
                disabled={isLookingUp || !licensePlate}
                style={{
                  width: '100%',
                  padding: '16px',
                  marginTop: '20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#ffffff',
                  background: '#000000',
                  border: '1.5px solid #000000',
                  cursor: isLookingUp || !licensePlate ? 'not-allowed' : 'pointer',
                  opacity: isLookingUp || !licensePlate ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => { if (!isLookingUp && licensePlate) e.currentTarget.style.background = '#1a1a1a'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#000000'; }}
              >
                {isLookingUp ? (
                  <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> Looking up registration...</>
                ) : (
                  <><Search style={{ width: '18px', height: '18px' }} /> Look Up Vehicle</>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipToManual}
                style={{
                  width: '100%',
                  padding: '14px',
                  marginTop: '12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#666',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#000')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#666')}
              >
                Enter details manually instead
              </button>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Step 2: Vehicle Details (auto-filled from lookup) */}
        {step === 'details' && (
          <form onSubmit={(e) => { e.preventDefault(); setStep('purchase'); }}>
            <div style={{ padding: '32px' }}>
              {/* Recognised plate banner */}
              {lookupResult && formData.make && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '14px 20px',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#166534',
                }}>
                  <span style={{ fontSize: '16px' }}>✓</span>
                  Vehicle recognised — <strong>{formData.make} {formData.model}</strong> ({formData.year}). Review and confirm the details below.
                </div>
              )}

              {/* Tax & MOT summary from lookup */}
              {lookupResult && (lookupResult.taxStatus || lookupResult.motStatus) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '28px',
                }}>
                  {lookupResult.taxStatus && (
                    <div style={{
                      padding: '16px 20px',
                      background: lookupResult.taxStatus.toLowerCase() === 'taxed' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${lookupResult.taxStatus.toLowerCase() === 'taxed' ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                        Road Tax
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: lookupResult.taxStatus.toLowerCase() === 'taxed' ? '#166534' : '#991b1b',
                      }}>
                        {lookupResult.taxStatus}
                      </div>
                      {lookupResult.taxDueDate && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Due: {lookupResult.taxDueDate}
                        </div>
                      )}
                    </div>
                  )}
                  {lookupResult.motStatus && (
                    <div style={{
                      padding: '16px 20px',
                      background: lookupResult.motStatus.toLowerCase() === 'valid' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${lookupResult.motStatus.toLowerCase() === 'valid' ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                        MOT
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: lookupResult.motStatus.toLowerCase() === 'valid' ? '#166534' : '#991b1b',
                      }}>
                        {lookupResult.motStatus}
                      </div>
                      {lookupResult.motExpiry && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Expires: {lookupResult.motExpiry}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Registration display */}
              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>Registration</label>
                <div style={{
                  padding: '12px 16px',
                  fontSize: '18px',
                  fontWeight: '700',
                  letterSpacing: '3px',
                  textAlign: 'center',
                  background: '#ffffcc',
                  border: '2px solid #000',
                  fontFamily: 'monospace',
                  color: '#000',
                }}>
                  {formData.licensePlate}
                </div>
              </div>

              {/* Vehicle Information Section */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  Vehicle Information
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Make</label>
                    <input type="text" required value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} style={inputStyle} placeholder="e.g. Porsche"
                      onFocus={(e) => (e.target.style.borderColor = '#000000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Model</label>
                    <input type="text" required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} style={inputStyle} placeholder="e.g. Cayenne"
                      onFocus={(e) => (e.target.style.borderColor = '#000000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={labelStyle}>Year</label>
                    <input type="number" required min="2000" max="2030" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#000000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type</label>
                    <select value={formData.fuelType} onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Color Selection */}
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Color</label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {colorOptions.map((color) => (
                      <button key={color.value} type="button" onClick={() => setFormData({ ...formData, color: color.value })}
                        style={{
                          width: '40px', height: '40px', borderRadius: '50%', background: color.hex,
                          border: formData.color === color.value ? '3px solid #000000' : '2px solid #e5e5e5',
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          boxShadow: formData.color === color.value ? '0 0 0 2px #ffffff, 0 0 0 4px #000000' : 'none',
                        }}
                        title={color.value}
                      />
                    ))}
                  </div>
                </div>

                {/* Image Selection */}
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Car Image</label>
                  {formData.imageId && carImages?.find(img => img.id === formData.imageId) ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '12px 16px', background: '#fafafa', borderRadius: '6px',
                      border: '1px solid #f0f0f0', marginTop: '8px',
                    }}>
                      <img
                        src={carImages.find(img => img.id === formData.imageId).url}
                        alt=""
                        style={{ width: '80px', height: '50px', objectFit: 'contain', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: '#000', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {carImages.find(img => img.id === formData.imageId).name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImagePicker(true)}
                        style={{
                          padding: '8px 16px', fontSize: '12px', fontWeight: '500',
                          background: 'transparent', border: '1px solid #d1d1d1', color: '#333',
                          cursor: 'pointer', borderRadius: '4px', flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#333'; }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(true)}
                      style={{
                        width: '100%', marginTop: '8px',
                        padding: '20px', fontSize: '14px', fontWeight: '500',
                        background: '#fafafa', border: '2px dashed #d1d1d1', color: '#666',
                        cursor: 'pointer', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; e.currentTarget.style.background = '#f0f0f0'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#666'; e.currentTarget.style.background = '#fafafa'; }}
                    >
                      <Image style={{ width: '18px', height: '18px' }} />
                      Add Image
                    </button>
                  )}
                </div>
              </div>

              {/* GPS Tracker Section */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  GPS Tracker
                </h3>
                <div>
                  <label style={labelStyle}>Tracker ID (IMEI)</label>
                  <input type="text" value={formData.trackerId || ''} onChange={(e) => setFormData({ ...formData, trackerId: e.target.value || null })} style={inputStyle} placeholder="e.g. 352093081452315 — leave blank if no tracker installed"
                    onFocus={(e) => (e.target.style.borderColor = '#000000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                  <p style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                    Enter the IMEI number from your Teltonika tracker to enable live GPS tracking on the map.
                  </p>
                </div>
              </div>

              {/* Specifications Section */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  Specifications
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Fuel Type</label>
                    <select value={formData.fuelType} onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="Diesel">Diesel</option><option value="Petrol">Petrol</option><option value="Electric">Electric</option><option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Drive Type</label>
                    <select value={formData.driveType} onChange={(e) => setFormData({ ...formData, driveType: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="Rear-Wheel Drive">RWD</option><option value="Front-Wheel Drive">FWD</option><option value="All-Wheel Drive">AWD</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Transmission</label>
                    <select value={formData.transmission} onChange={(e) => setFormData({ ...formData, transmission: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="Automatic">Automatic</option><option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Insurance Section */}
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  Insurance
                </h3>

                <div>
                  <label style={labelStyle}>Annual Insurance (£)</label>
                  <input type="number" min="0" value={formData.insuranceCost} onChange={(e) => setFormData({ ...formData, insuranceCost: e.target.value })} style={inputStyle} placeholder="1200"
                    onFocus={(e) => (e.target.style.borderColor = '#000000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '24px 32px', borderTop: '1px solid #e5e5e5', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose}
                style={{ padding: '14px 32px', fontSize: '14px', fontWeight: '500', color: '#000000', background: 'transparent', border: '2px solid #000000', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#000000'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000000'; }}
              >Cancel</button>
              <button type="submit"
                style={{ padding: '14px 32px', fontSize: '14px', fontWeight: '500', color: '#ffffff', background: '#000000', border: '2px solid #000000', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#333333')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#000000')}
              >Continue →</button>
            </div>
          </form>
        )}

        {/* Step 3: Purchase Information */}
        {step === 'purchase' && (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '32px' }}>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 28px' }}>
                How was this vehicle acquired? This information is stored privately for your records.
              </p>

              {/* Purchase type selector */}
              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>Acquisition Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['outright', 'finance'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, purchaseType: type })}
                      style={{
                        flex: 1, padding: '14px', fontSize: '14px', fontWeight: '500',
                        background: formData.purchaseType === type ? '#000' : '#fff',
                        color: formData.purchaseType === type ? '#fff' : '#333',
                        border: `2px solid ${formData.purchaseType === type ? '#000' : '#d1d1d1'}`,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {type === 'outright' ? 'Bought Outright' : 'Finance'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Common fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Purchase Price (£)</label>
                  <input type="number" min="0" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} style={inputStyle} placeholder="e.g. 35000"
                    onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                </div>
                <div>
                  <label style={labelStyle}>Purchase Date</label>
                  <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                </div>
              </div>

              {/* Finance-specific fields */}
              {formData.purchaseType === 'finance' && (
                <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '24px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Finance Details</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Finance Under (Name)</label>
                    <input type="text" value={formData.financedUnder} onChange={(e) => setFormData({ ...formData, financedUnder: e.target.value })} style={inputStyle} placeholder="e.g. John Smith / Company Ltd"
                      onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={labelStyle}>Deposit (£)</label>
                      <input type="number" min="0" value={formData.deposit} onChange={(e) => setFormData({ ...formData, deposit: e.target.value })} style={inputStyle} placeholder="e.g. 5000"
                        onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                    </div>
                    <div>
                      <label style={labelStyle}>Interest Rate (%)</label>
                      <input type="number" min="0" step="0.1" value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} style={inputStyle} placeholder="e.g. 6.9"
                        onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Agreement Length (months)</label>
                      <input type="number" min="1" value={formData.agreementLength} onChange={(e) => setFormData({ ...formData, agreementLength: e.target.value })} style={inputStyle} placeholder="e.g. 48"
                        onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                    </div>
                    <div>
                      <label style={labelStyle}>Monthly Payment (£)</label>
                      <input type="number" min="0" value={formData.monthlyPayment} onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })} style={inputStyle} placeholder="e.g. 650"
                        onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '24px 32px', borderTop: '1px solid #e5e5e5', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose}
                style={{ padding: '14px 32px', fontSize: '14px', fontWeight: '500', color: '#000000', background: 'transparent', border: '2px solid #000000', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#000000'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000000'; }}
              >Cancel</button>
              <button type="submit"
                style={{ padding: '14px 32px', fontSize: '14px', fontWeight: '500', color: '#ffffff', background: '#000000', border: '2px solid #000000', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#333333')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#000000')}
              >Add Vehicle</button>
            </div>
          </form>
        )}
      </div>

      {showImagePicker && (
        <ImagePickerModal
          images={carImages || []}
          selectedImageId={formData.imageId}
          onSelect={(imageId) => setFormData({ ...formData, imageId })}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
}

function EditVehicleModal({ vehicle, onClose, onSave, carImages }) {
  const [formData, setFormData] = useState({
    make: vehicle.make || '',
    model: vehicle.model || '',
    year: vehicle.year || new Date().getFullYear(),
    color: vehicle.color || 'White',
    licensePlate: vehicle.licensePlate || '',
    status: vehicle.status || 'parked',
    fuelType: vehicle.fuelType || 'Diesel',
    driveType: vehicle.driveType || 'Rear-Wheel Drive',
    transmission: vehicle.transmission || 'Automatic',
    imageId: vehicle.imageId || null,
  });
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleRegLookup = async () => {
    if (!formData.licensePlate || formData.licensePlate.length < 2) return;
    setIsLookingUp(true);
    setLookupError('');
    try {
      const vehicleData = await lookupVehicle(formData.licensePlate);
      setFormData(prev => ({
        ...prev,
        make: vehicleData.make || prev.make,
        model: vehicleData.model || prev.model,
        year: vehicleData.year || prev.year,
        color: vehicleData.color || prev.color,
        fuelType: vehicleData.fuelType || prev.fuelType,
      }));
    } catch (error) {
      setLookupError('Could not find vehicle details');
    }
    setIsLookingUp(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(vehicle.id, {
      ...formData,
      year: parseInt(formData.year),
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#000000',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Edit Vehicle
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#666666',
              borderRadius: '50%',
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '32px' }}>
            {/* Registration Lookup Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#666666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '20px',
                }}
              >
                Registration
              </h3>

              <div>
                <label style={labelStyle}>Update Registration to Lookup Details</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRegLookup())}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      fontSize: '18px',
                      fontWeight: '600',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                    }}
                    placeholder="AB12 CDE"
                    onFocus={(e) => (e.target.style.borderColor = '#000000')}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')}
                  />
                  <button
                    type="button"
                    onClick={handleRegLookup}
                    disabled={isLookingUp || !formData.licensePlate}
                    style={{
                      padding: '12px 20px',
                      background: '#000',
                      color: '#fff',
                      border: 'none',
                      cursor: isLookingUp || !formData.licensePlate ? 'not-allowed' : 'pointer',
                      opacity: isLookingUp || !formData.licensePlate ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    {isLookingUp ? (
                      <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Looking up...</>
                    ) : (
                      <><Search style={{ width: '16px', height: '16px' }} /> Lookup</>
                    )}
                  </button>
                </div>
                {lookupError && (
                  <p style={{ color: '#c4001a', fontSize: '12px', marginTop: '8px' }}>{lookupError}</p>
                )}
              </div>
            </div>

            {/* Vehicle Information Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#666666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '20px',
                }}
              >
                Vehicle Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Make</label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. Porsche"
                    onFocus={(e) => (e.target.style.borderColor = '#000000')}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Model</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. Cayenne"
                    onFocus={(e) => (e.target.style.borderColor = '#000000')}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label style={labelStyle}>Year</label>
                  <input
                    type="number"
                    required
                    min="2000"
                    max="2030"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#000000')}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Image Selection */}
              <div style={{ marginTop: '16px' }}>
                <label style={labelStyle}>Car Image</label>
                {formData.imageId && carImages?.find(img => img.id === formData.imageId) ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '12px 16px', background: '#fafafa', borderRadius: '6px',
                    border: '1px solid #f0f0f0', marginTop: '8px',
                  }}>
                    <img
                      src={carImages.find(img => img.id === formData.imageId).url}
                      alt=""
                      style={{ width: '80px', height: '50px', objectFit: 'contain', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#000', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {carImages.find(img => img.id === formData.imageId).name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(true)}
                      style={{
                        padding: '8px 16px', fontSize: '12px', fontWeight: '500',
                        background: 'transparent', border: '1px solid #d1d1d1', color: '#333',
                        cursor: 'pointer', borderRadius: '4px', flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#333'; }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(true)}
                    style={{
                      width: '100%', marginTop: '8px',
                      padding: '20px', fontSize: '14px', fontWeight: '500',
                      background: '#fafafa', border: '2px dashed #d1d1d1', color: '#666',
                      cursor: 'pointer', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; e.currentTarget.style.background = '#f0f0f0'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d1d1'; e.currentTarget.style.color = '#666'; e.currentTarget.style.background = '#fafafa'; }}
                  >
                    <Image style={{ width: '18px', height: '18px' }} />
                    Add Image
                  </button>
                )}
              </div>
            </div>

            {/* Specifications Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#666666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '20px',
                }}
              >
                Specifications
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Drive Type</label>
                  <select
                    value={formData.driveType}
                    onChange={(e) => setFormData({ ...formData, driveType: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="Rear-Wheel Drive">RWD</option>
                    <option value="Front-Wheel Drive">FWD</option>
                    <option value="All-Wheel Drive">AWD</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Transmission</label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div
            style={{
              padding: '24px 32px',
              borderTop: '1px solid #e5e5e5',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '14px 32px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#000000',
                background: 'transparent',
                border: '2px solid #000000',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#000000';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '14px 32px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ffffff',
                background: '#000000',
                border: '2px solid #000000',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#333333')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#000000')}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {showImagePicker && (
        <ImagePickerModal
          images={carImages || []}
          selectedImageId={formData.imageId}
          onSelect={(imageId) => setFormData({ ...formData, imageId })}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
}

export function ModernFleetPage() {
  const mobile = useIsMobile();
  const { vehicles, addVehicle, removeVehicle, updateVehicle } = useVehicleStore();
  const { images: carImages, addImage, removeImage, updateImage } = useCarImageStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showManageImagesModal, setShowManageImagesModal] = useState(false);

  // Handle browser back button to return to fleet list instead of leaving page
  const handleCloseDetail = useCallback(() => {
    setSelectedVehicle(null);
  }, []);

  const handleSelectVehicle = useCallback((vehicle) => {
    // Push state to history so browser back button returns to fleet list
    window.history.pushState({ vehicleDetail: true }, '');
    setSelectedVehicle(vehicle);
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      // If we're viewing a vehicle detail and user presses back, close the detail
      if (selectedVehicle) {
        setSelectedVehicle(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVehicle]);

  const handleRemoveVehicle = (vehicleId) => {
    if (window.confirm('Are you sure you want to remove this vehicle?')) {
      removeVehicle(vehicleId);
    }
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
  };

  // Show detail view if a vehicle is selected
  if (selectedVehicle) {
    return (
      <VehicleDetail
        vehicle={selectedVehicle}
        onClose={handleCloseDetail}
        carImages={carImages}
        isAdmin={isAdmin}
        onUpdateVehicle={(id, updates) => {
          updateVehicle(id, updates);
          setSelectedVehicle(prev => ({ ...prev, ...updates }));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#EEEFF2' }}>
      {/* Sticky Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: mobile ? '12px 16px' : '16px 40px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1
            style={{
              fontSize: '15px',
              fontWeight: '600',
              margin: 0,
              color: '#000',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Fleet
          </h1>
          <span style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#999',
            background: '#f0f0f0',
            padding: '3px 10px',
            borderRadius: '10px',
          }}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isAdmin && <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowManageImagesModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '6px',
              color: '#555',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#aaa';
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.color = '#555';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Image size={14} />
            Images
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: '500',
              background: '#000',
              border: '1px solid #000',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#222';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#000';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Plus size={14} />
            Add Vehicle
          </button>
        </div>}
      </div>

      {/* Main Content */}
      <div style={{ padding: mobile ? '16px 16px 40px' : '60px 40px 60px' }}>
        {/* Vehicle Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: mobile ? '16px' : '40px',
            maxWidth: mobile ? '360px' : 'none',
            margin: mobile ? '0 auto' : undefined,
          }}
        >
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onSelect={handleSelectVehicle}
              onRemove={isAdmin ? handleRemoveVehicle : null}
              onEdit={isAdmin ? handleEditVehicle : null}
              carImages={carImages}
            />
          ))}
        </div>

        {vehicles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#626669' }}>
            <p style={{ fontSize: '18px', margin: 0 }}>No vehicles found</p>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <AddVehicleModal
          onClose={() => setShowAddModal(false)}
          onAdd={addVehicle}
          carImages={carImages}
        />
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSave={updateVehicle}
          carImages={carImages}
        />
      )}

      {/* Manage Images Modal */}
      {showManageImagesModal && (
        <ManageImagesModal
          onClose={() => setShowManageImagesModal(false)}
          images={carImages}
          onAddImage={addImage}
          onRemoveImage={removeImage}
          onRenameImage={(id, name) => updateImage(id, { name })}
        />
      )}
    </div>
  );
}

export default ModernFleetPage;
