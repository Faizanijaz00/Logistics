// A tap-to-open native date field. Stores/returns a plain 'YYYY-MM-DD' string
// (what the tickets API expects) and stays timezone-safe by building and
// formatting the Date from local parts — never via toISOString(), which can
// shift the day in negative-offset zones.
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(s) {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function displayDate(s) {
  if (!s) return null;
  const d = parseYMD(s);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DateField({ label, value, onChange, placeholder = 'Select date', clearable = true }) {
  const [show, setShow] = useState(false);
  const current = parseYMD(value);
  const shown = displayDate(value);

  function handleChange(event, selected) {
    if (Platform.OS === 'android') {
      // Android fires once with the dialog result (or 'dismissed').
      setShow(false);
      if (event.type === 'set' && selected) onChange(toYMD(selected));
      return;
    }
    // iOS: live-update as the spinner turns; the sheet has its own Done button.
    if (selected) onChange(toYMD(selected));
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Calendar size={16} color="#888" />
        <Text style={[styles.value, !shown && styles.placeholder]}>{shown || placeholder}</Text>
        {clearable && value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={8}>
            <X size={16} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {show && Platform.OS === 'android' ? (
        <DateTimePicker value={current} mode="date" display="default" onChange={handleChange} />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={current} mode="date" display="spinner" onChange={handleChange} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500' },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#fff',
  },
  value: { flex: 1, fontSize: 15, color: '#111' },
  placeholder: { color: '#bbb' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  doneText: { fontSize: 16, fontWeight: '700', color: '#0061bd' },
});
