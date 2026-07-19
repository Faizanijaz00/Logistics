import { useMemo, useState } from 'react';
import { Plus, Clock, Car, Search } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import { useVehicleStore } from '../../store';
import FineWizard from './FineWizard';

// Fines section home = a scannable list of every fine (not a grid, not a menu),
// with a filter/sort bar and an "Add new fine" button that opens the wizard.
// Default order: soonest deadline first (most urgent at the top).

function daysUntil(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return Infinity;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function deriveFine(t) {
  const stage = t.current_stage || t.status || 'PCN issued';
  const deadline = t.key_deadline_date || t.payment_deadline || t.appeal_deadline || null;
  const actionStatus = t.action_status || (t.action_taken ? 'actioned' : 'needs_action');
  return { stage, deadline, actionStatus, issuerType: t.issuer_type || null, ticketType: t.ticket_type || null };
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FinesPage() {
  const { tickets, updateTicket } = useTicketStore();
  const { vehicles } = useVehicleStore();
  const [showWizard, setShowWizard] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ vehicle: '', stage: '', issuerType: '', ticketType: '', action: '' });
  const [sort, setSort] = useState('deadline'); // deadline | date | amount

  const vehicleName = (id) => {
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.make} ${v.model}` : null;
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = tickets.filter(t => {
      const d = deriveFine(t);
      if (filters.vehicle && (t.vehicle_id || t.vehicleId) !== filters.vehicle) return false;
      if (filters.stage && d.stage !== filters.stage) return false;
      if (filters.issuerType && d.issuerType !== filters.issuerType) return false;
      if (filters.ticketType && d.ticketType !== filters.ticketType) return false;
      if (filters.action && d.actionStatus !== filters.action) return false;
      if (q) {
        const hay = [t.reference_number, t.pcn, t.issuer_name, t.issuer, t.notes, vehicleName(t.vehicle_id)]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === 'deadline') return daysUntil(deriveFine(a).deadline) - daysUntil(deriveFine(b).deadline);
      if (sort === 'amount') return (Number(b.current_amount_due ?? b.outstanding) || 0) - (Number(a.current_amount_due ?? a.outstanding) || 0);
      return new Date(b.date_issued || b.date || 0) - new Date(a.date_issued || a.date || 0);
    });
    return out;
  }, [tickets, query, filters, sort, vehicles]);

  const uniqueStages = [...new Set(tickets.map(t => deriveFine(t).stage).filter(Boolean))];

  const toggleAction = (t) => {
    const next = deriveFine(t).actionStatus === 'actioned' ? 'needs_action' : 'actioned';
    updateTicket(t.id, { action_status: next });
  };

  if (showWizard) return <FineWizard onDone={() => setShowWizard(false)} />;

  return (
    <div style={{ padding: '32px 40px', minHeight: '100%', background: '#f4f4f4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 400, color: '#000', margin: 0 }}>Fines</h1>
          <p style={{ fontSize: 15, color: '#626669', marginTop: 6 }}>
            {rows.length} fine{rows.length === 1 ? '' : 's'} · sorted by most urgent deadline
          </p>
        </div>
        <button onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#000', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>
          <Plus style={{ width: 16, height: 16 }} /> Add new fine
        </button>
      </div>

      {/* Filter / sort bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 12, top: 11, width: 16, height: 16, color: '#999' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search ref, issuer, vehicle…"
            style={{ ...selectStyle, paddingLeft: 34, width: '100%' }} />
        </div>
        <FilterSelect value={filters.vehicle} onChange={v => setFilters(f => ({ ...f, vehicle: v }))} placeholder="All vehicles"
          options={vehicles.map(v => ({ value: v.id, label: `${v.make} ${v.model}` }))} />
        <FilterSelect value={filters.stage} onChange={v => setFilters(f => ({ ...f, stage: v }))} placeholder="All stages"
          options={uniqueStages.map(s => ({ value: s, label: s }))} />
        <FilterSelect value={filters.issuerType} onChange={v => setFilters(f => ({ ...f, issuerType: v }))} placeholder="All issuers"
          options={[{ value: 'government', label: 'Government' }, { value: 'private', label: 'Private' }]} />
        <FilterSelect value={filters.ticketType} onChange={v => setFilters(f => ({ ...f, ticketType: v }))} placeholder="All types"
          options={[{ value: 'movement', label: 'Movement' }, { value: 'non_movement', label: 'Non-movement' }]} />
        <FilterSelect value={filters.action} onChange={v => setFilters(f => ({ ...f, action: v }))} placeholder="Any action state"
          options={[{ value: 'needs_action', label: 'Needs action' }, { value: 'actioned', label: 'Actioned' }]} />
        <FilterSelect value={sort} onChange={setSort} placeholder="Sort"
          options={[{ value: 'deadline', label: 'Sort: deadline' }, { value: 'date', label: 'Sort: date issued' }, { value: 'amount', label: 'Sort: amount' }]} />
      </div>

      {/* Scannable list */}
      {rows.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 48, textAlign: 'center', color: '#8c8f93' }}>
          No fines match. Click “Add new fine” to log one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(t => {
            const { stage, deadline, actionStatus, issuerType } = deriveFine(t);
            const dLeft = daysUntil(deadline);
            const dColor = dLeft < 0 ? '#c4001a' : dLeft <= 7 ? '#cc7700' : '#0061bd';
            const amount = t.current_amount_due ?? t.outstanding;
            return (
              <div key={t.id} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 15 }}>{t.reference_number || t.pcn || '—'}</span>
                  <span style={badge('#eef2ff', '#3730a3')}>{stage}</span>
                  {issuerType && <span style={badge('#f1f5f9', '#475569')}>{issuerType === 'government' ? 'Gov' : 'Private'}</span>}
                  <button onClick={() => toggleAction(t)} style={{ ...badge(actionStatus === 'actioned' ? '#f0fdf4' : '#fef2f2', actionStatus === 'actioned' ? '#018a16' : '#c4001a'), border: `1px solid ${actionStatus === 'actioned' ? '#bbf7d0' : '#fecaca'}`, cursor: 'pointer', fontWeight: 700 }}>
                    {actionStatus === 'actioned' ? '✓ Actioned' : '● Needs action'}
                  </button>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 16, color: amount > 0 ? '#c4001a' : '#018a16' }}>
                    {amount != null ? `£${Number(amount).toFixed(2)}` : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 10, fontSize: 13, color: '#555', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Car style={{ width: 14, height: 14 }} /> {vehicleName(t.vehicle_id) || 'Unassigned'}</span>
                  <span>{t.issuer_name || t.issuer || '—'}</span>
                  {deadline && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: dColor, fontWeight: 600 }}>
                      <Clock style={{ width: 14, height: 14 }} />
                      {dLeft < 0 ? `Overdue ${Math.abs(dLeft)}d` : dLeft === 0 ? 'Due today' : `Due in ${dLeft}d`} · {fmtDate(deadline)}
                    </span>
                  )}
                </div>
                {t.recommended_action && (
                  <p style={{ margin: '10px 0 0', fontSize: 13, color: '#666', lineHeight: 1.4 }}>→ {t.recommended_action}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const selectStyle = { padding: '9px 12px', fontSize: 14, color: '#000', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 6, outline: 'none', fontFamily: 'inherit' };
function badge(bg, color) { return { display: 'inline-block', padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 500, background: bg, color }; }
function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
