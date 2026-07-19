import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertTriangle, CalendarClock, FileText } from 'lucide-react';
import { useVehicleStore, useAuthStore } from '../../store';
import { useTicketStore } from '../../store/ticketStore';
import { getNode, isLeaf, nextNodeId, buildLeafPatch, START_NODE } from './wizardEngine';
import { TICKET_TYPES } from './decisionTree';

// Guided fine wizard (web). Details step → adaptive decision-tree questions →
// recommended action, which is saved onto a new fine record (needs_action).
// Mirrors the mobile wizard; on completion calls onDone() to return to the list.

const TYPE_LABELS = { movement: 'Moving traffic (movement)', non_movement: 'Parking / static (non-movement)' };

export default function FineWizard({ onDone }) {
  const { vehicles } = useVehicleStore();
  const { user } = useAuthStore();
  const createFine = useTicketStore(s => s.createFine);

  const [details, setDetails] = useState({
    vehicle_id: '', issuer_name: '', reference_number: '', date_issued: '',
    ticket_type: '', original_amount: '', current_amount_due: '',
  });
  const [phase, setPhase] = useState('details');
  const [nodeId, setNodeId] = useState(START_NODE);
  const [history, setHistory] = useState([]);
  const [answers, setAnswers] = useState({});
  const [grounds, setGrounds] = useState([]);
  const [groundsFreeText, setGroundsFreeText] = useState('');
  const [leaf, setLeaf] = useState(null);
  const [saving, setSaving] = useState(false);

  const node = useMemo(() => getNode(nodeId), [nodeId]);
  const detailsValid = details.vehicle_id && details.issuer_name.trim() && details.ticket_type;

  const goToNode = (id) => {
    const n = getNode(id);
    if (!n) return;
    if (isLeaf(n)) { setLeaf(n); setPhase('result'); }
    else { setNodeId(id); setPhase('tree'); }
  };

  const answerQuestion = (opt) => {
    if (node.field) setAnswers(a => ({ ...a, [node.field]: opt.value }));
    setHistory(h => [...h, { nodeId, choice: opt.value }]);
    goToNode(opt.next);
  };

  const answerGrounds = (choice) => {
    const selected = grounds.map(g => ({ key: g }));
    if (groundsFreeText.trim()) selected.push({ key: 'other', text: groundsFreeText.trim() });
    setAnswers(a => ({ ...a, contest_grounds: selected }));
    setHistory(h => [...h, { nodeId, choice }]);
    goToNode(nextNodeId(node, choice));
  };

  const back = () => {
    if (phase === 'result') {
      const last = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setLeaf(null); setNodeId(last ? last.nodeId : START_NODE); setPhase('tree');
      return;
    }
    if (phase === 'tree') {
      if (history.length === 0) { setPhase('details'); return; }
      const last = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setNodeId(last.nodeId);
      return;
    }
    onDone();
  };

  const save = async () => {
    if (!leaf) return;
    setSaving(true);
    try {
      const patch = buildLeafPatch(leaf, { ...answers, ...details });
      await createFine({
        vehicle_id: details.vehicle_id || null,
        driver_id: user?.id || null,
        issuer_type: answers.issuer_type || null,
        issuer_name: details.issuer_name.trim() || null,
        gov_authority: answers.gov_authority || null,
        date_issued: details.date_issued || null,
        date_entered_system: new Date().toISOString(),
        reference_number: details.reference_number.trim() || null,
        ticket_type: details.ticket_type || null,
        original_amount: details.original_amount ? Number(details.original_amount) : null,
        current_amount_due: details.current_amount_due ? Number(details.current_amount_due) : null,
        contested: false,
        contest_outcome: 'n/a',
        status: 'open',
        stage_history: [{ stage: patch.current_stage || 'PCN issued', date: new Date().toISOString(), note: 'Logged via wizard' }],
        wizard_answers: { ...answers },
        ...patch,
      });
      onDone();
    } catch (e) {
      alert('Could not save fine: ' + (e.message || e));
      setSaving(false);
    }
  };

  const stepLabel = phase === 'details' ? 'Details' : phase === 'result' ? 'Recommended action' : `Question ${history.length + 1}`;
  const preview = leaf ? buildLeafPatch(leaf, { ...answers, ...details }) : null;

  return (
    <div style={{ padding: '32px 40px', minHeight: '100%', background: '#f4f4f4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={back} style={iconBtn}><ChevronLeft style={{ width: 20, height: 20 }} /></button>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 400, color: '#000', margin: 0 }}>Add new fine</h1>
          <p style={{ fontSize: 14, color: '#626669', marginTop: 4 }}>{stepLabel}</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 28 }}>
        {phase === 'details' && (
          <>
            <Label>Which vehicle is the fine against?</Label>
            <ChipRow>
              {vehicles.map(v => (
                <Chip key={v.id} active={details.vehicle_id === v.id} onClick={() => setDetails(d => ({ ...d, vehicle_id: v.id }))}>
                  {v.make} {v.model}{v.licensePlate ? ` · ${v.licensePlate}` : ''}
                </Chip>
              ))}
              {vehicles.length === 0 && <span style={{ color: '#8c8f93', fontSize: 14 }}>No vehicles loaded.</span>}
            </ChipRow>

            <Label>Ticket type</Label>
            <ChipRow>
              {TICKET_TYPES.map(t => (
                <Chip key={t} active={details.ticket_type === t} onClick={() => setDetails(d => ({ ...d, ticket_type: t }))}>
                  {TYPE_LABELS[t]}
                </Chip>
              ))}
            </ChipRow>

            <Field label="Issuer name (e.g. TfL, Westminster Council, Euro Car Parks)">
              <input style={input} value={details.issuer_name} onChange={e => setDetails(d => ({ ...d, issuer_name: e.target.value }))} placeholder="Who issued it?" />
            </Field>
            <Field label="Reference / PCN number">
              <input style={input} value={details.reference_number} onChange={e => setDetails(d => ({ ...d, reference_number: e.target.value }))} placeholder="e.g. IZ37457441" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Date issued">
                <input style={input} type="date" value={details.date_issued} onChange={e => setDetails(d => ({ ...d, date_issued: e.target.value }))} />
              </Field>
              <Field label="Original amount (£)">
                <input style={input} type="number" step="0.01" value={details.original_amount} onChange={e => setDetails(d => ({ ...d, original_amount: e.target.value }))} placeholder="0.00" />
              </Field>
              <Field label="Amount due now (£)">
                <input style={input} type="number" step="0.01" value={details.current_amount_due} onChange={e => setDetails(d => ({ ...d, current_amount_due: e.target.value }))} placeholder="0.00" />
              </Field>
            </div>
            <PrimaryBtn disabled={!detailsValid} onClick={() => goToNode(START_NODE)}>
              Start the wizard <ChevronRight style={{ width: 18, height: 18 }} />
            </PrimaryBtn>
          </>
        )}

        {phase === 'tree' && node && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#000', marginTop: 0, marginBottom: 20, lineHeight: 1.35 }}>{node.prompt}</h2>
            {node.type === 'question' && node.options.map(opt => (
              <button key={opt.value} onClick={() => answerQuestion(opt)} style={optionBtn}
                onMouseOver={e => e.currentTarget.style.borderColor = '#000'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e0e0e0'}>
                <span>{opt.label}</span>
                <ChevronRight style={{ width: 18, height: 18, color: '#666', flexShrink: 0 }} />
              </button>
            ))}
            {node.type === 'grounds' && (
              <>
                {node.grounds.map(g => {
                  const on = grounds.includes(g.value);
                  return (
                    <button key={g.value} onClick={() => setGrounds(gs => on ? gs.filter(x => x !== g.value) : [...gs, g.value])} style={{ ...optionBtn, borderColor: on ? '#000' : '#e0e0e0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${on ? '#000' : '#bbb'}`, background: on ? '#000' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {on && <Check style={{ width: 13, height: 13, color: '#fff' }} />}
                        </span>
                        {g.label}
                      </span>
                    </button>
                  );
                })}
                <Field label="Other grounds (optional)">
                  <textarea style={{ ...input, minHeight: 72, resize: 'vertical' }} value={groundsFreeText} onChange={e => setGroundsFreeText(e.target.value)} placeholder="Describe any other reason…" />
                </Field>
                <PrimaryBtn disabled={!(grounds.length || groundsFreeText.trim())} onClick={() => answerGrounds('contest')}>Yes — contest on these grounds</PrimaryBtn>
                <button onClick={() => answerGrounds('pay')} style={{ background: 'none', border: 'none', color: '#333', textDecoration: 'underline', cursor: 'pointer', fontSize: 15, marginTop: 12, width: '100%' }}>No grounds — I’ll pay</button>
              </>
            )}
          </>
        )}

        {phase === 'result' && leaf && preview && (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffedd5', padding: '5px 10px', borderRadius: 6, marginBottom: 12 }}>
              <AlertTriangle style={{ width: 15, height: 15, color: '#9a3412' }} />
              <span style={{ color: '#9a3412', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommended action</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#000', margin: '0 0 14px', lineHeight: 1.3 }}>{leaf.title}</h2>
            <div style={{ display: 'flex', gap: 12, background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <FileText style={{ width: 18, height: 18, color: '#333', flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 15, color: '#222', lineHeight: 1.5 }}>{preview.recommended_action}</p>
            </div>
            {leaf.deadlineDays != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#c4001a', fontWeight: 600 }}>
                <CalendarClock style={{ width: 16, height: 16 }} />
                Deadline: {preview.key_deadline_date} (about {leaf.deadlineDays} days)
              </div>
            )}
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5, marginBottom: 16 }}>
              This will be saved on the fine and flagged “needs action”. Flip it to “actioned” yourself once you’ve done it.
            </p>
            <PrimaryBtn disabled={saving} onClick={save}>
              <Check style={{ width: 18, height: 18 }} /> {saving ? 'Saving…' : 'Save fine'}
            </PrimaryBtn>
          </>
        )}
      </div>
    </div>
  );
}

// ── Small presentational helpers ─────────────────────────────────────────
const iconBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#333' };
const input = { width: '100%', padding: '10px 14px', fontSize: 14, color: '#000', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const optionBtn = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', gap: 8, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 16, marginBottom: 12, fontSize: 15, color: '#000', cursor: 'pointer', lineHeight: 1.4 };

function Label({ children }) { return <label style={{ fontSize: 15, fontWeight: 600, color: '#000', marginBottom: 10, display: 'block' }}>{children}</label>; }
function ChipRow({ children }) { return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>{children}</div>; }
function Chip({ active, onClick, children }) {
  return <button onClick={onClick} style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${active ? '#000' : '#ddd'}`, background: active ? '#000' : '#fff', color: active ? '#fff' : '#333', fontWeight: active ? 600 : 400, fontSize: 14, cursor: 'pointer' }}>{children}</button>;
}
function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 500, color: '#626669', marginBottom: 6, display: 'block' }}>{label}</label>{children}</div>;
}
function PrimaryBtn({ disabled, onClick, children }) {
  return <button disabled={disabled} onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 24px', marginTop: 12, background: '#000', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>{children}</button>;
}
