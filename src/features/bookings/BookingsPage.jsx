// Bookings — who needs which car, when, for how long, and where it's going.
// Mirrors the mobile Bookings tab; reads/writes /api/bookings.
import { useState, useEffect, useCallback } from 'react';
import { useVehicleStore, useAuthStore } from '../../store';
import { SERVER_URL } from '../../config/api';
import { Plus, Car, User, MapPin, Clock, X, Trash2, CalendarClock } from 'lucide-react';

const DURATIONS = [
  { label: '1h', min: 60 }, { label: '2h', min: 120 }, { label: '4h', min: 240 },
  { label: '8h', min: 480 }, { label: 'All day', min: 600 },
];

function fmtWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

export function BookingsPage() {
  const { vehicles } = useVehicleStore();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', start: '', duration: 120, destination: '' });

  const load = useCallback(async () => {
    try {
      const resp = await fetch(`${SERVER_URL}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = resp.ok ? await resp.json() : [];
      setBookings(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.vehicleId || !form.start || !form.destination.trim()) return;
    const v = vehicles.find((x) => x.id === form.vehicleId);
    const body = {
      id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vehicle_id: form.vehicleId,
      vehicle_name: v ? `${v.make} ${v.model}` : '',
      driver_id: user?.id || null,
      driver_name: user?.name || user?.username || 'Unknown',
      start_time: new Date(form.start).toISOString(),
      duration_minutes: Number(form.duration),
      destination: form.destination.trim(),
      created_at: new Date().toISOString(),
    };
    await fetch(`${SERVER_URL}/api/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    });
    setForm({ vehicleId: '', start: '', duration: 120, destination: '' });
    setShowAdd(false);
    load();
  };

  const remove = async (id) => {
    await fetch(`${SERVER_URL}/api/bookings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const sorted = [...bookings].sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
  const now = Date.now();
  const field = { width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #d1d1d1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Bookings</h1>
          <p style={{ color: '#888', fontSize: 14, margin: '4px 0 0' }}>Who needs which car, when, and where</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Book a Car
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Loading…</p>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
          <CalendarClock size={40} color="#ccc" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: '#444', margin: 0 }}>No bookings yet</p>
          <p style={{ fontSize: 14, margin: '4px 0 0' }}>Book a car to reserve it.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((b) => {
            const past = b.start_time && new Date(b.start_time).getTime() < now;
            const mine = b.driver_id === user?.id;
            return (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 12, padding: 16, opacity: past ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Car size={16} /><strong>{b.vehicle_name || 'Vehicle'}</strong></div>
                  {mine && <button onClick={() => remove(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} color="#c4001a" /></button>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#444', marginTop: 4 }}><User size={14} color="#666" /> {b.driver_name || 'Unknown'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#444', marginTop: 4 }}><Clock size={14} color="#0061bd" /> {fmtWhen(b.start_time)} · {fmtDuration(b.duration_minutes)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#444', marginTop: 4 }}><MapPin size={14} color="#c4001a" /> {b.destination || '—'}</div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Book a Car</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>Vehicle</label>
            <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} style={{ ...field, margin: '6px 0 14px' }}>
              <option value="">Select vehicle</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.licensePlate}</option>)}
            </select>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>When</label>
            <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} style={{ ...field, margin: '6px 0 14px' }} />
            <label style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>For how long</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0 14px' }}>
              {DURATIONS.map((d) => (
                <button key={d.min} onClick={() => setForm({ ...form, duration: d.min })} style={{ padding: '8px 14px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: form.duration === d.min ? '#000' : '#f2f2f2', color: form.duration === d.min ? '#fff' : '#555' }}>{d.label}</button>
              ))}
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>Destination</label>
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Where is the car going?" style={{ ...field, margin: '6px 0 20px' }} />
            <button onClick={save} disabled={!form.vehicleId || !form.start || !form.destination.trim()} style={{ width: '100%', padding: 14, background: (!form.vehicleId || !form.start || !form.destination.trim()) ? '#ccc' : '#000', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Save Booking</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingsPage;
