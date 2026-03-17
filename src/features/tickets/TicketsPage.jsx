import { useState } from 'react';
import { Plus, Trash2, X, Upload, ChevronDown, Image } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import { useVehicleStore, useAuthStore } from '../../store';

const ISSUERS = ['TFL', 'Islington', 'Westminster', 'Camden', 'PCM', 'APCOA', 'Wandsworth', 'Lambeth', 'Hackney', 'Other'];
const TYPES = ['Parking', 'Speeding', 'Bus Lane', 'No-entry', 'Tunnel', 'Congestion', 'ULEZ', 'Other'];
const STATUSES = ['Issued', 'Paid', 'Appealing', 'Charge Certificate Sent', 'Bailiff', 'Cancelled', 'Won Appeal'];

const ISSUER_COLORS = {
  TFL: { bg: '#dbeafe', color: '#1e40af' },
  Islington: { bg: '#dcfce7', color: '#166534' },
  Westminster: { bg: '#fef9c3', color: '#854d0e' },
  Camden: { bg: '#fee2e2', color: '#991b1b' },
  PCM: { bg: '#fce7f3', color: '#9d174d' },
  APCOA: { bg: '#e0e7ff', color: '#3730a3' },
  Wandsworth: { bg: '#f3e8ff', color: '#6b21a8' },
  Lambeth: { bg: '#ffedd5', color: '#9a3412' },
  Hackney: { bg: '#ccfbf1', color: '#115e59' },
  Other: { bg: '#f1f5f9', color: '#475569' },
};

const TYPE_COLORS = {
  Parking: { bg: '#dcfce7', color: '#166534' },
  Speeding: { bg: '#fee2e2', color: '#991b1b' },
  'Bus Lane': { bg: '#dbeafe', color: '#1e40af' },
  'No-entry': { bg: '#fef9c3', color: '#854d0e' },
  Tunnel: { bg: '#e0e7ff', color: '#3730a3' },
  Congestion: { bg: '#ffedd5', color: '#9a3412' },
  ULEZ: { bg: '#f3e8ff', color: '#6b21a8' },
  Other: { bg: '#f1f5f9', color: '#475569' },
};

const STATUS_COLORS = {
  Issued: { bg: '#dbeafe', color: '#1e40af' },
  Paid: { bg: '#dcfce7', color: '#166534' },
  Appealing: { bg: '#fef9c3', color: '#854d0e' },
  'Charge Certificate Sent': { bg: '#ffedd5', color: '#9a3412' },
  Bailiff: { bg: '#fee2e2', color: '#991b1b' },
  Cancelled: { bg: '#f1f5f9', color: '#475569' },
  'Won Appeal': { bg: '#dcfce7', color: '#166534' },
};

function Badge({ value, colorMap }) {
  const colors = colorMap[value] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: '500',
      background: colors.bg,
      color: colors.color,
      whiteSpace: 'nowrap',
    }}>
      {value || '—'}
    </span>
  );
}

function SelectDropdown({ value, options, colorMap, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '3px 8px', borderRadius: '4px', border: 'none',
          background: (colorMap && colorMap[value]?.bg) || '#f1f5f9',
          color: (colorMap && colorMap[value]?.color) || '#475569',
          fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {value || placeholder || 'Select'}
        <ChevronDown style={{ width: '12px', height: '12px' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 100,
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '160px', overflow: 'hidden',
          }}>
            {options.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
                display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left',
                border: 'none', background: value === opt ? '#f4f4f4' : 'transparent',
                fontSize: '13px', color: '#323639', cursor: 'pointer',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#f4f4f4'}
              onMouseOut={e => e.currentTarget.style.background = value === opt ? '#f4f4f4' : 'transparent'}
              >
                {colorMap && <Badge value={opt} colorMap={colorMap} />}
                {!colorMap && opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const { tickets, createTicket, updateTicket, deleteTicket } = useTicketStore();
  const { vehicles } = useVehicleStore();
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    pcn: '', issuer: '', date: '', type: '', status: 'Issued',
    outstanding: '', action_taken: false, plan_for_contesting: '',
    picture_url: '', driver_id: '', vehicle_id: '', notes: '',
  });

  const drivers = ['Admin', 'Faizan', 'Kiki', 'Reiner', 'Mikyas', 'Naz', 'Adam O', 'Z', 'Maitham', 'Ty', 'Micah', 'Axel', 'Silmi', 'Hamza'];

  const resetForm = () => {
    setForm({ pcn: '', issuer: '', date: '', type: '', status: 'Issued', outstanding: '', action_taken: false, plan_for_contesting: '', picture_url: '', driver_id: '', vehicle_id: '', notes: '' });
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSave = () => {
    const data = { ...form, outstanding: parseFloat(form.outstanding) || 0 };
    if (editingId) {
      updateTicket(editingId, data);
    } else {
      createTicket(data);
    }
    resetForm();
  };

  const handleEdit = (ticket) => {
    setForm({
      pcn: ticket.pcn, issuer: ticket.issuer, date: ticket.date, type: ticket.type,
      status: ticket.status, outstanding: ticket.outstanding?.toString() || '',
      action_taken: ticket.action_taken, plan_for_contesting: ticket.plan_for_contesting,
      picture_url: ticket.picture_url, driver_id: ticket.driver_id || '',
      vehicle_id: ticket.vehicle_id || '', notes: ticket.notes || '',
    });
    setEditingId(ticket.id);
    setShowAdd(true);
  };

  const totalOutstanding = tickets.reduce((sum, t) => sum + (t.outstanding || 0), 0);
  const activeTickets = tickets.filter(t => t.status !== 'Paid' && t.status !== 'Cancelled' && t.status !== 'Won Appeal');

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: '14px', color: '#000',
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px',
    fontFamily: 'inherit', outline: 'none',
  };

  const labelStyle = { fontSize: '13px', fontWeight: '500', color: '#626669', marginBottom: '6px', display: 'block' };

  return (
    <div className="modern-app" style={{ padding: '32px 40px', minHeight: '100%', background: '#f4f4f4' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.01em', color: '#000', margin: 0 }}>
            Tickets & Fines
          </h1>
          <p style={{ fontSize: '15px', color: '#626669', marginTop: '6px' }}>
            Manage parking tickets, speeding fines, and PCNs across the fleet
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', background: '#000', color: '#fff',
            border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '400',
            cursor: 'pointer', transition: 'background 150ms ease',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#2a2a2a'}
          onMouseOut={e => e.currentTarget.style.background = '#000'}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Ticket
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px 24px' }}>
          <div style={{ fontSize: '28px', fontWeight: '400', color: '#000' }}>{tickets.length}</div>
          <div style={{ fontSize: '14px', color: '#626669', marginTop: '4px' }}>Total Tickets</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px 24px' }}>
          <div style={{ fontSize: '28px', fontWeight: '400', color: '#c4001a' }}>
            £{totalOutstanding.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '14px', color: '#626669', marginTop: '4px' }}>Total Outstanding</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px 24px' }}>
          <div style={{ fontSize: '28px', fontWeight: '400', color: '#cc7700' }}>{activeTickets.length}</div>
          <div style={{ fontSize: '14px', color: '#626669', marginTop: '4px' }}>Active / Unpaid</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#fafafa' }}>
                {['PCN', 'Issuer', 'Date', 'Type', 'Status', 'Outstanding', 'Driver', 'Vehicle', 'Action Taken', 'Plan for Contesting', 'Evidence', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 16px', textAlign: 'left', fontWeight: '500',
                    color: '#626669', fontSize: '12px', textTransform: 'uppercase',
                    letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '48px', textAlign: 'center', color: '#8c8f93' }}>
                    No tickets yet. Click "Add Ticket" to log your first one.
                  </td>
                </tr>
              ) : tickets.map(ticket => (
                <tr
                  key={ticket.id}
                  style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background 150ms' }}
                  onMouseOver={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => handleEdit(ticket)}
                >
                  <td style={{ padding: '12px 16px', fontWeight: '500', color: '#000', whiteSpace: 'nowrap' }}>
                    {ticket.pcn || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge value={ticket.issuer} colorMap={ISSUER_COLORS} />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#323639', whiteSpace: 'nowrap' }}>
                    {ticket.date || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge value={ticket.type} colorMap={TYPE_COLORS} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge value={ticket.status} colorMap={STATUS_COLORS} />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '500', color: ticket.outstanding > 0 ? '#c4001a' : '#018a16', whiteSpace: 'nowrap' }}>
                    {ticket.outstanding ? `£${ticket.outstanding.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#323639' }}>
                    {ticket.driver_id || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#323639', whiteSpace: 'nowrap' }}>
                    {ticket.vehicle_id ? vehicles.find(v => v.id === ticket.vehicle_id)?.make + ' ' + vehicles.find(v => v.id === ticket.vehicle_id)?.model : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={ticket.action_taken}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateTicket(ticket.id, { action_taken: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#000', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#626669', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ticket.plan_for_contesting || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {ticket.picture_url ? (
                      <a href={ticket.picture_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <Image style={{ width: '18px', height: '18px', color: '#0061bd' }} />
                      </a>
                    ) : (
                      <span style={{ color: '#c9cacb' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTicket(ticket.id); }}
                      style={{
                        padding: '6px', background: 'transparent', border: 'none',
                        borderRadius: '4px', cursor: 'pointer', color: '#c9cacb',
                        transition: 'color 150ms',
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#c4001a'}
                      onMouseOut={e => e.currentTarget.style.color = '#c9cacb'}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998 }} onClick={resetForm} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: '12px', boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
            width: '640px', maxHeight: '90vh', overflow: 'auto', zIndex: 9999,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#000', margin: 0 }}>
                {editingId ? 'Edit Ticket' : 'Add Ticket'}
              </h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '20px', height: '20px', color: '#626669' }} />
              </button>
            </div>

            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* PCN */}
              <div>
                <label style={labelStyle}>PCN Number</label>
                <input style={inputStyle} value={form.pcn} onChange={e => setForm({ ...form, pcn: e.target.value })} placeholder="e.g. IZ37457441" />
              </div>
              {/* Date */}
              <div>
                <label style={labelStyle}>Date & Time</label>
                <input style={inputStyle} type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              {/* Issuer */}
              <div>
                <label style={labelStyle}>Issuer</label>
                <select style={inputStyle} value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })}>
                  <option value="">Select issuer</option>
                  {ISSUERS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              {/* Type */}
              <div>
                <label style={labelStyle}>Type</label>
                <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="">Select type</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Outstanding */}
              <div>
                <label style={labelStyle}>Outstanding (£)</label>
                <input style={inputStyle} type="number" step="0.01" min="0" value={form.outstanding} onChange={e => setForm({ ...form, outstanding: e.target.value })} placeholder="0.00" />
              </div>
              {/* Driver */}
              <div>
                <label style={labelStyle}>Driver</label>
                <select style={inputStyle} value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {drivers.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Vehicle */}
              <div>
                <label style={labelStyle}>Vehicle</label>
                <select style={inputStyle} value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.registration})</option>)}
                </select>
              </div>
              {/* Plan for Contesting - full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Plan for Contesting</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  value={form.plan_for_contesting}
                  onChange={e => setForm({ ...form, plan_for_contesting: e.target.value })}
                  placeholder="Describe your plan for appealing or contesting this ticket..."
                />
              </div>
              {/* Evidence URL */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Picture / Evidence URL</label>
                <input style={inputStyle} value={form.picture_url} onChange={e => setForm({ ...form, picture_url: e.target.value })} placeholder="Paste image URL or link to evidence" />
              </div>
              {/* Action Taken */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={form.action_taken}
                  onChange={e => setForm({ ...form, action_taken: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#000', cursor: 'pointer' }}
                />
                <label style={{ fontSize: '14px', color: '#323639', cursor: 'pointer' }}
                  onClick={() => setForm({ ...form, action_taken: !form.action_taken })}
                >
                  Action has been taken on this ticket
                </label>
              </div>
            </div>

            <div style={{ padding: '20px 28px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={resetForm}
                style={{
                  padding: '10px 24px', background: 'transparent', color: '#323639',
                  border: '1px solid #000', borderRadius: '4px', fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 24px', background: '#000', color: '#fff',
                  border: 'none', borderRadius: '4px', fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: '400',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseOut={e => e.currentTarget.style.background = '#000'}
              >
                {editingId ? 'Save Changes' : 'Add Ticket'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
