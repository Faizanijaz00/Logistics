import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, ChevronRight, Check, AlertTriangle, CalendarClock, FileText,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { SERVER_URL } from '../../src/config/api';
import {
  getNode, isLeaf, nextNodeId, buildLeafPatch, START_NODE,
} from '../../src/features/fines/wizardEngine';
import { TICKET_TYPES } from '../../src/features/fines/decisionTree';

// Guided ticket/PCN wizard. Step 0 collects the fine's core details, then it
// walks the config-driven decision tree one question at a time (adapting to the
// last answer), and finishes on the recommended action — which it saves onto a
// new fine record (action_status = needs_action) before returning to the list.

const TYPE_LABELS = { movement: 'Moving traffic (movement)', non_movement: 'Parking / static (non-movement)' };

function newId() {
  return `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function FineWizardScreen() {
  const router = useRouter();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const { vehicles } = useVehicleStore();

  // Core details gathered up front (Step 0).
  const [details, setDetails] = useState({
    vehicle_id: '',
    issuer_name: '',
    reference_number: '',
    date_issued: '',
    ticket_type: '',
    original_amount: '',
    current_amount_due: '',
  });

  // Decision-tree walk state.
  const [phase, setPhase] = useState('details'); // details | tree | result
  const [nodeId, setNodeId] = useState(START_NODE);
  const [history, setHistory] = useState([]); // [{ nodeId, choice }]
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
    if (isLeaf(n)) {
      setLeaf(n);
      setPhase('result');
    } else {
      setNodeId(id);
      setPhase('tree');
    }
  };

  const answerQuestion = (opt) => {
    const patch = node.field ? { [node.field]: opt.value } : {};
    setAnswers(a => ({ ...a, ...patch }));
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
    // Each history entry is { nodeId: the question shown, choice }. Popping it
    // returns us to that question. Empty history ⇒ back to the details step.
    if (phase === 'result') {
      const last = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setLeaf(null);
      setNodeId(last ? last.nodeId : START_NODE);
      setPhase('tree');
      return;
    }
    if (phase === 'tree') {
      if (history.length === 0) { setPhase('details'); return; }
      const last = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setNodeId(last.nodeId);
      return;
    }
    router.back();
  };

  const save = async () => {
    if (!leaf) return;
    setSaving(true);
    try {
      const patch = buildLeafPatch(leaf, { ...answers, ...details });
      const record = {
        id: newId(),
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...patch,
      };
      const res = await fetch(`${SERVER_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      router.replace('/admin/fines');
    } catch (e) {
      Alert.alert('Could not save fine', e.message);
      setSaving(false);
    }
  };

  const stepLabel = phase === 'details' ? 'Details' : phase === 'result' ? 'Recommended action' : `Question ${history.length + 1}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Add new fine</Text>
          <Text style={styles.headerSub}>{stepLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {phase === 'details' && (
          <View>
            <Text style={styles.sectionLabel}>Which vehicle is the fine against?</Text>
            <View style={styles.chipWrap}>
              {vehicles.map(v => {
                const active = details.vehicle_id === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDetails(d => ({ ...d, vehicle_id: v.id }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {v.make} {v.model}{v.licensePlate ? ` · ${v.licensePlate}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {vehicles.length === 0 && <Text style={styles.muted}>No vehicles loaded.</Text>}
            </View>

            <Text style={styles.sectionLabel}>Ticket type</Text>
            <View style={styles.chipWrap}>
              {TICKET_TYPES.map(t => {
                const active = details.ticket_type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDetails(d => ({ ...d, ticket_type: t }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{TYPE_LABELS[t]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field label="Issuer name (e.g. TfL, Westminster Council, Euro Car Parks)">
              <TextInput
                style={styles.input}
                value={details.issuer_name}
                onChangeText={t => setDetails(d => ({ ...d, issuer_name: t }))}
                placeholder="Who issued it?"
                placeholderTextColor="#aaa"
              />
            </Field>
            <Field label="Reference / PCN number">
              <TextInput
                style={styles.input}
                value={details.reference_number}
                onChangeText={t => setDetails(d => ({ ...d, reference_number: t }))}
                placeholder="e.g. IZ37457441"
                placeholderTextColor="#aaa"
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Date issued (YYYY-MM-DD)">
              <TextInput
                style={styles.input}
                value={details.date_issued}
                onChangeText={t => setDetails(d => ({ ...d, date_issued: t }))}
                placeholder="2026-07-19"
                placeholderTextColor="#aaa"
              />
            </Field>
            <View style={styles.row2}>
              <Field label="Original amount (£)" flex>
                <TextInput
                  style={styles.input}
                  value={details.original_amount}
                  onChangeText={t => setDetails(d => ({ ...d, original_amount: t }))}
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                />
              </Field>
              <Field label="Amount due now (£)" flex>
                <TextInput
                  style={styles.input}
                  value={details.current_amount_due}
                  onChangeText={t => setDetails(d => ({ ...d, current_amount_due: t }))}
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !detailsValid && styles.primaryBtnDisabled]}
              disabled={!detailsValid}
              onPress={() => goToNode(START_NODE)}
            >
              <Text style={styles.primaryBtnText}>Start the wizard</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {phase === 'tree' && node && (
          <View>
            <Text style={styles.question}>{node.prompt}</Text>

            {node.type === 'question' && node.options.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.optionBtn} onPress={() => answerQuestion(opt)}>
                <Text style={styles.optionText}>{opt.label}</Text>
                <ChevronRight size={18} color="#666" />
              </TouchableOpacity>
            ))}

            {node.type === 'grounds' && (
              <View>
                {node.grounds.map(g => {
                  const on = grounds.includes(g.value);
                  return (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.checkRow, on && styles.checkRowOn]}
                      onPress={() => setGrounds(gs => on ? gs.filter(x => x !== g.value) : [...gs, g.value])}
                    >
                      <View style={[styles.checkbox, on && styles.checkboxOn]}>
                        {on && <Check size={14} color="#fff" />}
                      </View>
                      <Text style={styles.checkLabel}>{g.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                <Field label="Other grounds (optional)">
                  <TextInput
                    style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                    value={groundsFreeText}
                    onChangeText={setGroundsFreeText}
                    placeholder="Describe any other reason…"
                    placeholderTextColor="#aaa"
                    multiline
                  />
                </Field>
                <TouchableOpacity
                  style={[styles.primaryBtn, !(grounds.length || groundsFreeText.trim()) && styles.primaryBtnDisabled]}
                  disabled={!(grounds.length || groundsFreeText.trim())}
                  onPress={() => answerGrounds('contest')}
                >
                  <Text style={styles.primaryBtnText}>Yes — contest on these grounds</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => answerGrounds('pay')}>
                  <Text style={styles.secondaryBtnText}>No grounds — I’ll pay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {phase === 'result' && leaf && (
          <View>
            <View style={styles.resultBadge}>
              <AlertTriangle size={16} color="#9a3412" />
              <Text style={styles.resultBadgeText}>Recommended action</Text>
            </View>
            <Text style={styles.resultTitle}>{leaf.title}</Text>
            <View style={styles.resultCard}>
              <FileText size={18} color="#333" />
              <Text style={styles.resultAction}>{buildLeafPatch(leaf, { ...answers, ...details }).recommended_action}</Text>
            </View>
            {leaf.deadlineDays != null && (
              <View style={styles.deadlineRow}>
                <CalendarClock size={16} color="#c4001a" />
                <Text style={styles.deadlineText}>
                  Deadline: {buildLeafPatch(leaf, answers).key_deadline_date} (about {leaf.deadlineDays} days)
                </Text>
              </View>
            )}
            <Text style={styles.muted}>
              This will be saved on the fine and flagged “needs action”. Flip it to “actioned” yourself once you’ve done it.
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]} disabled={saving} onPress={save}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Save fine</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children, flex }) {
  return (
    <View style={[{ marginBottom: 16 }, flex && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  body: { padding: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#626669', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000' },
  row2: { flexDirection: 'row', gap: 12 },
  question: { fontSize: 19, fontWeight: '700', color: '#000', marginBottom: 20, lineHeight: 26 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 16, marginBottom: 12 },
  optionText: { fontSize: 15, color: '#000', flex: 1, marginRight: 8, lineHeight: 21 },
  checkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 14, marginBottom: 10 },
  checkRowOn: { borderColor: '#000' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxOn: { backgroundColor: '#000', borderColor: '#000' },
  checkLabel: { fontSize: 14, color: '#333', flex: 1, lineHeight: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000', borderRadius: 10, paddingVertical: 15, marginTop: 12 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 8 },
  secondaryBtnText: { color: '#333', fontSize: 15, fontWeight: '500', textDecorationLine: 'underline' },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#ffedd5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginBottom: 12 },
  resultBadgeText: { color: '#9a3412', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 14, lineHeight: 28 },
  resultCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 16, marginBottom: 14 },
  resultAction: { flex: 1, fontSize: 15, color: '#222', lineHeight: 22 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  deadlineText: { fontSize: 14, color: '#c4001a', fontWeight: '600' },
  muted: { fontSize: 13, color: '#888', lineHeight: 19, marginBottom: 8 },
});
