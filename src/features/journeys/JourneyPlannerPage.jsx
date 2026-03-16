import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useVehicleStore, useCarImageStore } from '../../store';
import { Plus, Trash2, X, MapPin, Calendar, Clock, Car, Navigation, ArrowRight } from 'lucide-react';

// Module-level drag state — avoids ALL React closure/synthetic-event issues with HTML5 DnD
let _dragPerson = null;

const SERVER = 'http://localhost:3001';

const STATUS_CFG = {
  planned:     { color: '#2563eb', bg: '#eff6ff', label: 'Planned' },
  in_progress: { color: '#d97706', bg: '#fffbeb', label: 'In Progress' },
  completed:   { color: '#16a34a', bg: '#f0fdf4', label: 'Completed' },
  cancelled:   { color: '#dc2626', bg: '#fef2f2', label: 'Cancelled' },
};

const TYPE_CFG = {
  regular: { color: '#0369a1', bg: '#e0f2fe', label: 'Regular' },
  major:   { color: '#7c3aed', bg: '#f5f3ff', label: 'Planned' },
};

function authHeaders() {
  const { token } = useAuthStore.getState();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function api(path, opts = {}) {
  const res = await fetch(`${SERVER}${path}`, { ...opts, headers: { ...authHeaders(), ...opts.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json();
}

// Seat layout — UK RHD: seat 1 = driver (right), seat 2 = front passenger (left)
function buildSeatRows(n) {
  if (!n || n <= 2) return [[2, 1].slice(0, n || 2)];
  const extra = Array.from({ length: Math.max(0, n - 5) }, (_, i) => i + 6);
  if (n <= 5) return [[2, 1], Array.from({ length: n - 2 }, (_, i) => i + 3)];
  return [[2, 1], [3, 4, 5], extra];
}

const SEAT_LABEL = { 1: 'Driver', 2: 'Front', 3: 'Rear L', 4: 'Rear M', 5: 'Rear R', 6: '3rd L', 7: '3rd R' };

function formatDate(d) {
  if (!d) return null;
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Seat slot
// ─────────────────────────────────────────────────────────────────────────────

function SeatSlot({ carId, seatIndex, seatMap, dragOver, onDragOver, onDragLeave, onDrop, onClear, isAdmin }) {
  const assigned = seatMap[seatIndex];
  const isDriver = seatIndex === 1;
  const key = `${carId}-${seatIndex}`;
  const isOver = dragOver === key;

  const bgColor = assigned ? (isDriver ? '#0f172a' : '#1e293b') : isOver ? '#e0f2fe' : isDriver ? '#f0f9ff' : '#f8fafc';
  const border  = `2px ${assigned || isOver ? 'solid' : 'dashed'} ${isOver ? '#0ea5e9' : assigned ? 'transparent' : isDriver ? '#bae6fd' : '#e2e8f0'}`;

  return (
    <div
      onDragOver={isAdmin ? e => { e.preventDefault(); onDragOver(key); } : undefined}
      onDragLeave={isAdmin ? onDragLeave : undefined}
      onDrop={isAdmin ? e => { e.preventDefault(); onDrop(carId, seatIndex, e); } : undefined}
      onClick={assigned && isAdmin ? () => onClear(carId, seatIndex) : undefined}
      title={assigned && isAdmin ? `Remove ${assigned.person_name}` : SEAT_LABEL[seatIndex] || `Seat ${seatIndex}`}
      style={{
        width: '88px', height: '76px', borderRadius: '10px', border, background: bgColor,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '2px', transition: 'all 0.15s', cursor: assigned && isAdmin ? 'pointer' : 'default',
        position: 'relative', padding: '6px 4px',
        boxShadow: assigned ? '0 2px 8px rgba(0,0,0,0.15)' : isOver ? '0 0 0 3px rgba(14,165,233,0.3)' : 'none',
      }}
    >
      {assigned ? (
        <>
          <span style={{ fontSize: '11px', lineHeight: 1, pointerEvents: 'none' }}>{isDriver ? '⭐' : '👤'}</span>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 1.3, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px', pointerEvents: 'none' }}>
            {assigned.person_name}
          </span>
          <span style={{ fontSize: '8px', color: isDriver ? '#7dd3fc' : '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', pointerEvents: 'none' }}>
            {SEAT_LABEL[seatIndex] || `Seat ${seatIndex}`}
          </span>
          {isAdmin && (
            <div style={{ position: 'absolute', top: '4px', right: '4px', width: '15px', height: '15px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <X style={{ width: '8px', height: '8px', color: 'rgba(255,255,255,0.7)' }} />
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isOver ? '#bae6fd' : isDriver ? '#e0f2fe' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {isDriver ? <span style={{ fontSize: '12px' }}>⭐</span> : <Plus style={{ width: '12px', height: '12px', color: '#94a3b8' }} />}
          </div>
          <span style={{ fontSize: '8px', color: isDriver ? '#38bdf8' : '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '2px', pointerEvents: 'none' }}>
            {SEAT_LABEL[seatIndex] || `Seat ${seatIndex}`}
          </span>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Car box — shows vehicle photo if available
// ─────────────────────────────────────────────────────────────────────────────

function CarBox({ car, dragOver, onDragOver, onDragLeave, onDrop, onClear, onRemove, isAdmin }) {
  const { vehicles } = useVehicleStore();
  const { images: carImages } = useCarImageStore();

  const seatMap = {};
  (car.journey_seats || []).forEach(s => { seatMap[s.seat_index] = s; });
  const rows = buildSeatRows(car.seat_count);
  const filled = Object.values(seatMap).filter(s => s.person_name).length;
  const pct = Math.round((filled / (car.seat_count || 1)) * 100);

  // Find vehicle image
  const vehicle = vehicles.find(v => v.id === car.vehicle_id);
  const carImageUrl = vehicle?.imageId
    ? carImages?.find(img => img.id === vehicle.imageId)?.url || null
    : null;

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
      overflow: 'hidden', flexShrink: 0, width: '330px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0' }}>
        {/* Car image strip */}
        {carImageUrl && (
          <div style={{ width: '100%', height: '100px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img
              src={carImageUrl}
              alt={car.vehicle_name}
              style={{ maxWidth: '90%', maxHeight: '90px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}
            />
          </div>
        )}
        <div style={{ padding: '10px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              {!carImageUrl && (
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car style={{ width: '14px', height: '14px', color: '#fff' }} />
                </div>
              )}
              <div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{car.vehicle_name}</span>
                {car.vehicle_plate && <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '1px' }}>{car.vehicle_plate}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: filled === car.seat_count ? '#16a34a' : '#64748b', fontWeight: '600' }}>{filled}/{car.seat_count}</span>
              {isAdmin && <button onClick={() => onRemove(car.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '2px', display: 'flex', borderRadius: '4px' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}><Trash2 style={{ width: '13px', height: '13px' }} /></button>}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#3b82f6', borderRadius: '2px', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Seat grid */}
      <div style={{ padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <div style={{ width: '100%', height: '10px', background: 'linear-gradient(180deg, #bfdbfe 0%, #dbeafe 100%)', borderRadius: '8px 8px 0 0', border: '1px solid #bfdbfe' }} />
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: '7px', justifyContent: 'center' }}>
            {row.map(idx => (
              <SeatSlot key={idx} carId={car.id} seatIndex={idx} seatMap={seatMap}
                dragOver={dragOver} onDragOver={onDragOver} onDragLeave={onDragLeave}
                onDrop={onDrop} onClear={onClear} isAdmin={isAdmin} />
            ))}
          </div>
        ))}
        <div style={{ width: '100%', height: '8px', background: 'linear-gradient(0deg, #bfdbfe 0%, #dbeafe 100%)', borderRadius: '0 0 8px 8px', border: '1px solid #bfdbfe' }} />
        <span style={{ fontSize: '8px', color: '#cbd5e1', letterSpacing: '0.5px', alignSelf: 'flex-end' }}>UK RIGHT-HAND DRIVE · ⭐ = DRIVER SEAT</span>
      </div>

      {/* Fleet info — compact version of fleet page features */}
      {vehicle && (
        <FleetInfoStrip vehicle={vehicle} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fleet info strip — compact insurance / maintenance / tax / problems
// ─────────────────────────────────────────────────────────────────────────────

function statusDot(status) {
  const c = status === 'critical' ? '#ef4444' : status === 'warning' ? '#eab308' : '#22c55e';
  return { width: '7px', height: '7px', borderRadius: '50%', background: c, flexShrink: 0 };
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function FleetInfoStrip({ vehicle }) {
  const ins = vehicle.insurance;
  const mnt = vehicle.maintenance;
  const tax = vehicle.tax;
  const problems = vehicle.problems || [];

  const insDays = daysUntil(ins?.expiryDate);
  const insStatus = insDays == null ? 'good' : insDays < 7 ? 'critical' : insDays < 30 ? 'warning' : 'good';

  const mntDays = daysUntil(mnt?.nextService);
  const mntStatus = mntDays == null ? 'good'
    : (mntDays < 7 || (mnt?.tireWear ?? 100) < 20 || (mnt?.oilLife ?? 100) < 20) ? 'critical'
    : (mntDays < 30 || (mnt?.tireWear ?? 100) < 40 || (mnt?.oilLife ?? 100) < 40) ? 'warning' : 'good';

  const taxOk = tax?.status === 'paid';

  if (!ins && !mnt && !tax && problems.length === 0) return null;

  return (
    <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Problems warning */}
      {problems.length > 0 && (
        <div style={{ padding: '6px 10px', background: '#fef2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: '12px' }}>⚠️</span>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', flex: 1 }}>{problems.length} issue{problems.length > 1 ? 's' : ''} reported</span>
          <span style={{ fontSize: '9px', color: '#f87171' }}>{problems[problems.length - 1]?.text?.slice(0, 30)}{(problems[problems.length - 1]?.text?.length || 0) > 30 ? '…' : ''}</span>
        </div>
      )}

      {/* Compact row: insurance · maintenance · tax */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {ins && (
          <div style={{ flex: 1, minWidth: '90px', padding: '6px 8px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={statusDot(insStatus)} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '8px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Insurance</div>
              <div style={{ fontSize: '9px', color: '#3b82f6' }}>{ins.provider || 'N/A'}</div>
              {ins.expiryDate && <div style={{ fontSize: '8px', color: '#64748b' }}>Exp {ins.expiryDate}</div>}
            </div>
          </div>
        )}
        {mnt && (
          <div style={{ flex: 1, minWidth: '90px', padding: '6px 8px', background: '#fff7ed', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={statusDot(mntStatus)} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '8px', fontWeight: '700', color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Service</div>
              {mnt.nextService && <div style={{ fontSize: '9px', color: '#ea580c' }}>{mnt.nextService}</div>}
              <div style={{ fontSize: '8px', color: '#64748b' }}>Tyres {mnt.tireWear ?? '—'}% · Oil {mnt.oilLife ?? '—'}%</div>
            </div>
          </div>
        )}
        {tax && (
          <div style={{ flex: 1, minWidth: '70px', padding: '6px 8px', background: taxOk ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={statusDot(taxOk ? 'good' : 'critical')} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '8px', fontWeight: '700', color: taxOk ? '#166534' : '#991b1b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Tax</div>
              <div style={{ fontSize: '9px', color: taxOk ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{tax.status}</div>
              {tax.expiryDate && <div style={{ fontSize: '8px', color: '#64748b' }}>Exp {tax.expiryDate}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Person chip
// ─────────────────────────────────────────────────────────────────────────────

function PersonChip({ person, isAssigned, isDriver }) {
  const handleDragStart = (e) => {
    _dragPerson = { name: person.name, id: person.id, role: person.role };
    e.dataTransfer.setData('text/plain', person.name);
    e.dataTransfer.effectAllowed = 'copy';
  };
  // Don't clear _dragPerson in dragEnd — in some browsers dragEnd fires BEFORE drop,
  // which would null the person before handleDrop reads it. handleDrop clears it instead.
  // Stale _dragPerson is harmless; it gets overwritten on the next dragStart.

  return (
    <div
      draggable={!isAssigned}
      onDragStart={isAssigned ? undefined : handleDragStart}
      style={{
        padding: '8px 10px', marginBottom: '4px', borderRadius: '8px',
        border: `1px solid ${isAssigned ? '#f1f5f9' : '#e2e8f0'}`,
        background: isAssigned ? '#f8fafc' : '#fff',
        cursor: isAssigned ? 'default' : 'grab',
        opacity: isAssigned ? 0.45 : 1,
        display: 'flex', alignItems: 'center', gap: '8px',
        userSelect: 'none', transition: 'all 0.12s',
        boxShadow: isAssigned ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseOver={e => { if (!isAssigned) { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; } }}
      onMouseOut={e => { if (!isAssigned) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; } }}
    >
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isDriver ? '#fef9c3' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px' }}>
        {isDriver ? '⭐' : '👤'}
      </div>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{person.name}</span>
      {isAssigned && <span style={{ fontSize: '10px', color: '#22c55e', flexShrink: 0 }}>✓</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Car Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddCarModal({ vehicles, onClose, onAdd }) {
  const [vehicleId, setVehicleId] = useState('');
  const [seatCount, setSeatCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const v = vehicles.find(x => x.id === vehicleId);

  const handleAdd = async () => {
    if (!vehicleId) return;
    setSaving(true);
    try {
      await onAdd({ vehicleId, vehicleName: v ? `${v.make} ${v.model}` : vehicleId, vehiclePlate: v?.licensePlate || '', seatCount });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Car to Journey" onClose={onClose}>
      <FormField label="Vehicle">
        <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={inputSt}>
          <option value="">Select vehicle...</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.licensePlate}</option>)}
        </select>
      </FormField>
      <FormField label="Number of Seats">
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[2, 4, 5, 6, 7, 8].map(n => (
            <button key={n} onClick={() => setSeatCount(n)} style={{ padding: '7px 14px', fontSize: '13px', borderRadius: '7px', border: `2px solid ${seatCount === n ? '#000' : '#e2e8f0'}`, background: seatCount === n ? '#000' : '#fff', color: seatCount === n ? '#fff' : '#374151', cursor: 'pointer', fontWeight: seatCount === n ? '700' : '400' }}>{n}</button>
          ))}
        </div>
      </FormField>
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button onClick={onClose} style={secBtn}>Cancel</button>
        <button onClick={handleAdd} disabled={!vehicleId || saving} style={{ flex: 2, ...priBtn(!!vehicleId) }}>{saving ? 'Adding...' : 'Add Car'}</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Journey Modal — with type selector
// ─────────────────────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('major');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const ok = name.trim() && destination.trim();

  const handleCreate = async () => {
    if (!ok) return;
    setSaving(true); setError('');
    try {
      await onCreate({ name: name.trim(), destination: destination.trim(), scheduledDate: date || null, scheduledTime: time || null, notes, type });
      onClose();
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <Modal title="Plan a New Journey" subtitle="Give your trip a name and destination to get started." onClose={onClose}>
      {/* Type selector */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {['regular', 'major'].map(t => {
          const cfg = TYPE_CFG[t];
          const active = type === t;
          return (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: '10px 8px', borderRadius: '10px', border: `2px solid ${active ? cfg.color : '#e2e8f0'}`,
              background: active ? cfg.bg : '#f8fafc', color: active ? cfg.color : '#94a3b8',
              fontWeight: active ? '700' : '500', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {t === 'regular' ? '🔄 Regular Trip' : '📋 Planned Journey'}
            </button>
          );
        })}
      </div>
      <p style={{ margin: '-4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
        {type === 'regular' ? 'Everyday commutes, quick runs, and routine drives.' : 'Airport runs, group travel, and special events.'}
      </p>

      <FormField label="Trip Name *">
        <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && ok && handleCreate()} placeholder={type === 'regular' ? 'e.g. Morning Commute, Office Run…' : 'e.g. Airport Run, School Trip…'} style={inputSt} />
      </FormField>
      <FormField label="Destination *">
        <div style={{ position: 'relative' }}>
          <MapPin style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8' }} />
          <input value={destination} onChange={e => setDestination(e.target.value)} onKeyDown={e => e.key === 'Enter' && ok && handleCreate()} placeholder="e.g. Heathrow Airport" style={{ ...inputSt, paddingLeft: '32px' }} />
        </div>
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputSt} /></FormField>
        <FormField label="Time"><input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputSt} /></FormField>
      </div>
      <FormField label="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional info…" style={{ ...inputSt, resize: 'vertical' }} /></FormField>
      {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onClose} style={secBtn}>Cancel</button>
        <button onClick={handleCreate} disabled={saving || !ok} style={{ flex: 2, ...priBtn(ok) }}>{saving ? 'Creating…' : 'Create Journey →'}</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared components & styles
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{title}</h3>
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '6px', display: 'flex', marginLeft: '12px' }}><X style={{ width: '16px', height: '16px', color: '#64748b' }} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputSt = { width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#0f172a' };
const priBtn = (active) => ({ flex: 1, padding: '11px', fontSize: '14px', fontWeight: '600', border: 'none', borderRadius: '8px', background: active ? '#0f172a' : '#e2e8f0', color: active ? '#fff' : '#94a3b8', cursor: active ? 'pointer' : 'not-allowed', transition: 'background 0.15s' });
const secBtn = { flex: 1, padding: '11px', fontSize: '14px', fontWeight: '500', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#374151', cursor: 'pointer' };

// ─────────────────────────────────────────────────────────────────────────────
// Live Trip Card — vehicles with active destinations from My Profile
// ─────────────────────────────────────────────────────────────────────────────

function LiveTripCard({ vehicle, isSelected, onClick }) {
  const { images: carImages } = useCarImageStore();
  const carImageUrl = vehicle.imageId ? carImages?.find(img => img.id === vehicle.imageId)?.url || null : null;

  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px 14px', textAlign: 'left',
      background: isSelected ? '#f0fdf4' : '#fff', border: 'none',
      borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
      borderLeft: `3px solid ${isSelected ? '#16a34a' : 'transparent'}`, transition: 'all 0.1s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Mini car image or icon */}
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {carImageUrl
            ? <img src={carImageUrl} alt={vehicle.make} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Car style={{ width: '16px', height: '16px', color: '#94a3b8' }} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vehicle.make} {vehicle.model}
          </div>
          <div style={{ fontSize: '10px', color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Navigation style={{ width: '8px', height: '8px', flexShrink: 0 }} />
            {vehicle.destination}
          </div>
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0, textAlign: 'right' }}>
          {vehicle.estimatedArrival && <div style={{ color: '#16a34a', fontWeight: '600' }}>{vehicle.estimatedArrival}</div>}
          {vehicle.routeDistance && <div>{vehicle.routeDistance}</div>}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Trip Center Panel
// ─────────────────────────────────────────────────────────────────────────────

function LiveTripPanel({ vehicle }) {
  const { images: carImages } = useCarImageStore();
  const carImageUrl = vehicle.imageId ? carImages?.find(img => img.id === vehicle.imageId)?.url || null : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>🟢 Live</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{vehicle.make} {vehicle.model}</h2>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{vehicle.licensePlate}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignContent: 'flex-start' }}>
        {/* Car card */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', width: '260px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ height: '130px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {carImageUrl
              ? <img src={carImageUrl} alt={`${vehicle.make} ${vehicle.model}`} style={{ maxWidth: '85%', maxHeight: '110px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }} />
              : <Car style={{ width: '48px', height: '48px', color: '#d4d4d4' }} />}
          </div>
          <div style={{ padding: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>{vehicle.make} {vehicle.model}</div>
            {vehicle.currentDriver && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Driver</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>⭐ {vehicle.currentDriver}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Status</span>
              <span style={{ fontWeight: '600', color: '#16a34a' }}>En Route</span>
            </div>
          </div>
        </div>

        {/* Route card */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', flex: 1, minWidth: '220px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>Active Route</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', marginTop: '4px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>CURRENT LOCATION</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{vehicle.parkedAt || 'In transit'}</div>
              </div>
            </div>
            <div style={{ marginLeft: '3px', borderLeft: '2px dashed #e2e8f0', height: '20px' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '4px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>DESTINATION</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{vehicle.destination}</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '20px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', display: 'flex', gap: '20px' }}>
            {vehicle.estimatedArrival && (
              <div>
                <div style={{ fontSize: '10px', color: '#86efac', marginBottom: '2px' }}>ETA</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{vehicle.estimatedArrival}</div>
              </div>
            )}
            {vehicle.routeDistance && (
              <div>
                <div style={{ fontSize: '10px', color: '#86efac', marginBottom: '2px' }}>DISTANCE</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{vehicle.routeDistance}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export function JourneyPlannerPage() {
  const { user, fetchUsers } = useAuthStore();
  const { vehicles } = useVehicleStore();
  const isAdmin = user?.role === 'admin';

  const [journeys, setJourneys]     = useState([]);
  const [people, setPeople]         = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLive, setSelectedLive] = useState(null); // vehicle id for live trips
  const [showCreate, setShowCreate] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);
  const [dragOver, setDragOver]     = useState(null);
  const [loading, setLoading]       = useState(true);

  // Live trips: vehicles with an active destination set from My Profile
  const liveTrips = vehicles.filter(v => v.destination && v.status === 'active');

  const selected = journeys.find(j => j.id === selectedId);
  const selectedLiveVehicle = liveTrips.find(v => v.id === selectedLive);

  const sortJourneys = (arr) => [...arr].sort((a, b) => {
    if (!a.scheduled_date && !b.scheduled_date) return 0;
    if (!a.scheduled_date) return 1;
    if (!b.scheduled_date) return -1;
    return a.scheduled_date.localeCompare(b.scheduled_date);
  });

  const loadJourneys = useCallback(async () => {
    try {
      const data = await api('/api/journeys');
      setJourneys(sortJourneys(data));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadJourneys();
    fetchUsers().then(users => setPeople(users || []));
  }, [loadJourneys, fetchUsers]);

  const assignedNames = new Set(
    (selected?.journey_cars || []).flatMap(c => (c.journey_seats || []).map(s => s.person_name))
  );

  const drivers    = people.filter(p => p.role === 'driver');
  const passengers = people.filter(p => p.role === 'passenger');

  // ── Journey CRUD ──

  const handleCreate = async (data) => {
    const j = await api('/api/journeys', { method: 'POST', body: JSON.stringify(data) });
    setJourneys(prev => sortJourneys([j, ...prev]));
    setSelectedId(j.id);
    setSelectedLive(null);
  };

  const handleDelete = async (id) => {
    await api(`/api/journeys/${id}`, { method: 'DELETE' });
    setJourneys(prev => prev.filter(j => j.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleStatusChange = async (id, status) => {
    const updated = await api(`/api/journeys/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setJourneys(prev => prev.map(j => j.id === id ? { ...j, ...updated } : j));
  };

  // ── Car CRUD ──

  const handleAddCar = async (data) => {
    const car = await api(`/api/journeys/${selectedId}/cars`, { method: 'POST', body: JSON.stringify(data) });
    setJourneys(prev => prev.map(j => j.id === selectedId ? { ...j, journey_cars: [...(j.journey_cars || []), car] } : j));
  };

  const handleRemoveCar = async (carId) => {
    await api(`/api/journeys/${selectedId}/cars/${carId}`, { method: 'DELETE' });
    setJourneys(prev => prev.map(j => j.id === selectedId ? { ...j, journey_cars: j.journey_cars.filter(c => c.id !== carId) } : j));
  };

  // ── Seat CRUD (optimistic) ──

  const assignSeat = useCallback(async (carId, seatIndex, person) => {
    setJourneys(prev => prev.map(j => {
      if (j.id !== selectedId) return j;
      return {
        ...j,
        journey_cars: j.journey_cars.map(c => {
          if (c.id !== carId) return c;
          const seats = (c.journey_seats || []).filter(s => s.seat_index !== seatIndex);
          return {
            ...c,
            journey_seats: person.name
              ? [...seats, { journey_car_id: carId, seat_index: seatIndex, person_name: person.name, person_id: person.id || null, is_driver: person.role === 'driver' }]
              : seats,
          };
        }),
      };
    }));
    try {
      await api(`/api/journeys/${selectedId}/cars/${carId}/seats/${seatIndex}`, {
        method: 'PUT',
        body: JSON.stringify({ personName: person.name, personId: person.id || null, isDriver: person.role === 'driver' }),
      });
    } catch (err) { console.error('[Journey] Seat assign failed:', err); loadJourneys(); }
  }, [selectedId, loadJourneys]);

  const clearSeat = useCallback(async (carId, seatIndex) => {
    setJourneys(prev => prev.map(j => {
      if (j.id !== selectedId) return j;
      return { ...j, journey_cars: j.journey_cars.map(c => c.id !== carId ? c : { ...c, journey_seats: (c.journey_seats || []).filter(s => s.seat_index !== seatIndex) }) };
    }));
    try { await api(`/api/journeys/${selectedId}/cars/${carId}/seats/${seatIndex}`, { method: 'DELETE' }); }
    catch (err) { console.error('[Journey] Seat clear failed:', err); loadJourneys(); }
  }, [selectedId, loadJourneys]);

  // ── Drag handlers ──

  const handleDrop = useCallback((carId, seatIndex, e) => {
    const person = _dragPerson;
    _dragPerson = null;
    setDragOver(null);
    if (person?.name) assignSeat(carId, seatIndex, person);
  }, [assignSeat]);

  const cfg = STATUS_CFG[selected?.status] || STATUS_CFG.planned;
  const totalFilled = (selected?.journey_cars || []).reduce((s, c) => s + (c.journey_seats || []).filter(x => x.person_name).length, 0);
  const totalSeats  = (selected?.journey_cars || []).reduce((s, c) => s + (c.seat_count || 0), 0);

  const regularJourneys = journeys.filter(j => j.type === 'regular');
  const plannedJourneys = journeys.filter(j => j.type !== 'regular');

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ──────── LEFT: Journey list ──────── */}
      <div style={{ width: '268px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#0f172a' }}>Journeys</h2>
            <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#94a3b8' }}>{journeys.length} planned · {liveTrips.length} live</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', fontSize: '12px', fontWeight: '700', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <Plus style={{ width: '11px', height: '11px' }} /> New
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* ── Live trips section ── */}
          {liveTrips.length > 0 && (
            <div>
              <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🟢 Live Now</span>
              </div>
              {liveTrips.map(v => (
                <LiveTripCard key={v.id} vehicle={v}
                  isSelected={selectedLive === v.id}
                  onClick={() => { setSelectedLive(v.id); setSelectedId(null); }} />
              ))}
              {journeys.length > 0 && <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />}
            </div>
          )}

          {/* ── Loading ── */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#cbd5e1', fontSize: '13px' }}>Loading…</div>
          ) : journeys.length === 0 && liveTrips.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🗺️</div>
              <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500', margin: 0 }}>No journeys yet</p>
              {isAdmin && <p style={{ color: '#cbd5e1', fontSize: '12px', margin: '4px 0 0' }}>Click New to plan one</p>}
            </div>
          ) : (
            <>
              {/* Regular trips */}
              {regularJourneys.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px 4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🔄 Regular Trips</span>
                  </div>
                  {regularJourneys.map(j => <JourneyListItem key={j.id} journey={j} isSelected={j.id === selectedId} onClick={() => { setSelectedId(j.id); setSelectedLive(null); }} />)}
                </div>
              )}

              {/* Planned journeys */}
              {plannedJourneys.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px 4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.8px' }}>📋 Planned Journeys</span>
                  </div>
                  {plannedJourneys.map(j => <JourneyListItem key={j.id} journey={j} isSelected={j.id === selectedId} onClick={() => { setSelectedId(j.id); setSelectedLive(null); }} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ──────── CENTER: Journey board ──────── */}
      {selectedLiveVehicle ? (
        <LiveTripPanel vehicle={selectedLiveVehicle} />
      ) : !selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🚐</div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>Select a journey to plan seating</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>Or create a new one to get started</p>
          </div>
          {isAdmin && <button onClick={() => setShowCreate(true)} style={{ marginTop: '4px', padding: '10px 24px', fontSize: '13px', fontWeight: '700', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Plan New Journey</button>}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Journey header bar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>{selected.name}</h2>
                {/* Type badge */}
                {(() => {
                  const tc = TYPE_CFG[selected.type] || TYPE_CFG.major;
                  return <span style={{ fontSize: '10px', fontWeight: '700', color: tc.color, background: tc.bg, padding: '2px 8px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{selected.type === 'regular' ? '🔄 Regular' : '📋 Planned'}</span>;
                })()}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin style={{ width: '11px', height: '11px' }} />{selected.destination}</span>
                {selected.scheduled_date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Calendar style={{ width: '11px', height: '11px' }} />
                    {formatDate(selected.scheduled_date)}
                    {selected.scheduled_time && <><Clock style={{ width: '10px', height: '10px' }} />{selected.scheduled_time.slice(0, 5)}</>}
                  </span>
                )}
                {totalSeats > 0 && (
                  <span style={{ fontWeight: '600', color: totalFilled === totalSeats ? '#16a34a' : '#64748b' }}>
                    {totalFilled}/{totalSeats} seats filled
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isAdmin && (
                <select value={selected.status} onChange={e => handleStatusChange(selected.id, e.target.value)} style={{ padding: '7px 10px', fontSize: '12px', border: `1px solid ${cfg.color}30`, borderRadius: '8px', background: cfg.bg, color: cfg.color, fontWeight: '700', cursor: 'pointer', outline: 'none' }}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              )}
              {isAdmin && (
                <button onClick={() => handleDelete(selected.id)} style={{ padding: '7px 10px', background: '#fff', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
                  <Trash2 style={{ width: '13px', height: '13px' }} /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Car board */}
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {(selected.journey_cars || []).map(car => (
              <CarBox key={car.id} car={car} dragOver={dragOver}
                onDragOver={setDragOver} onDragLeave={() => setDragOver(null)}
                onDrop={handleDrop} onClear={clearSeat}
                onRemove={handleRemoveCar} isAdmin={isAdmin} />
            ))}

            {isAdmin && (
              <button onClick={() => setShowAddCar(true)} style={{ flexShrink: 0, width: '160px', minHeight: '200px', border: '2px dashed #e2e8f0', borderRadius: '14px', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f8fafc'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus style={{ width: '20px', height: '20px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>Add Car</span>
              </button>
            )}

            {(selected.journey_cars || []).length === 0 && !isAdmin && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>No cars added yet</div>
            )}
          </div>
        </div>
      )}

      {/* ──────── RIGHT: People panel — only for planned journeys ──────── */}
      {!selectedLiveVehicle && (
        <div style={{ width: '195px', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
          <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>People</h3>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#cbd5e1' }}>Drag into a seat ↓</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {drivers.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <p style={{ margin: '4px 2px 6px', fontSize: '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>⭐ Drivers</p>
                {drivers.map(p => <PersonChip key={p.id} person={p} isAssigned={assignedNames.has(p.name)} isDriver />)}
              </div>
            )}
            {passengers.length > 0 && (
              <div>
                <p style={{ margin: '4px 2px 6px', fontSize: '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>👤 Passengers</p>
                {passengers.map(p => <PersonChip key={p.id} person={p} isAssigned={assignedNames.has(p.name)} isDriver={false} />)}
              </div>
            )}
            {drivers.length === 0 && passengers.length === 0 && (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#cbd5e1', fontSize: '11px', lineHeight: 1.6 }}>
                Add drivers &amp; passengers in<br />Admin → User Management
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showAddCar && selected && <AddCarModal vehicles={vehicles} onClose={() => setShowAddCar(false)} onAdd={handleAddCar} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey list item — extracted to avoid repetition
// ─────────────────────────────────────────────────────────────────────────────

function JourneyListItem({ journey: j, isSelected, onClick }) {
  const sc = STATUS_CFG[j.status] || STATUS_CFG.planned;
  const tc = TYPE_CFG[j.type] || TYPE_CFG.major;
  const cars   = j.journey_cars || [];
  const filled = cars.reduce((s, c) => s + (c.journey_seats || []).filter(x => x.person_name).length, 0);
  const seats  = cars.reduce((s, c) => s + (c.seat_count || 0), 0);

  return (
    <button onClick={onClick} style={{ width: '100%', padding: '11px 14px', textAlign: 'left', background: isSelected ? '#f8fafc' : '#fff', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', borderLeft: `3px solid ${isSelected ? '#0f172a' : 'transparent'}`, transition: 'all 0.1s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '145px' }}>{j.name}</span>
        <span style={{ fontSize: '9px', fontWeight: '700', color: sc.color, background: sc.bg, padding: '2px 6px', borderRadius: '8px', flexShrink: 0, marginLeft: '4px' }}>{sc.label}</span>
      </div>
      <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
        <MapPin style={{ width: '9px', height: '9px', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.destination}</span>
      </p>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        {j.scheduled_date && (
          <span style={{ fontSize: '9px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '2px', background: '#f8fafc', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <Calendar style={{ width: '7px', height: '7px' }} />
            {new Date(j.scheduled_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {j.scheduled_time && <span style={{ display: 'flex', alignItems: 'center', gap: '1px' }}><Clock style={{ width: '7px', height: '7px' }} />{j.scheduled_time.slice(0, 5)}</span>}
          </span>
        )}
        {cars.length > 0 && <span style={{ fontSize: '9px', color: '#94a3b8' }}>🚗 {cars.length}</span>}
        {seats > 0 && (
          <span style={{ fontSize: '9px', color: filled === seats ? '#16a34a' : '#94a3b8', fontWeight: filled === seats ? '700' : '400' }}>
            {filled}/{seats}
          </span>
        )}
      </div>
    </button>
  );
}

export default JourneyPlannerPage;
