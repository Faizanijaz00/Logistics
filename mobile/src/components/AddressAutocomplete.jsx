import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MapPin } from 'lucide-react-native';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Debounced Mapbox address autocomplete. Calls onSelect({ address, lat, lng })
// when the user picks a suggestion. `leftIcon` overrides the default pin,
// `rightAccessory` renders inside the pill (e.g. a "Later" button), and `big`
// enlarges it into an Uber-style "Where to?" search bar.
export default function AddressAutocomplete({ label, placeholder, value, onSelect, leftIcon: LeftIcon = MapPin, rightAccessory, big }) {
  const [text, setText] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const skip = useRef(false);

  useEffect(() => { if (value !== undefined && value !== text) setText(value || ''); }, [value]);

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const q = text.trim();
    if (q.length < 3 || !MAPBOX_TOKEN) { setSuggestions([]); setSearching(false); return; }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
          + `?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&types=poi,address,place,locality,neighborhood`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (alive) setSuggestions(Array.isArray(data.features) ? data.features : []);
      } catch {
        if (alive) setSuggestions([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [text]);

  const pick = (f) => {
    skip.current = true;
    setText(f.place_name);
    setSuggestions([]);
    const [lng, lat] = f.center || [null, null];
    onSelect?.({ address: f.place_name, lat, lng });
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, big && styles.inputRowBig]}>
        <LeftIcon size={big ? 22 : 16} color="#777" />
        <TextInput
          style={[styles.input, big && styles.inputBig]}
          value={text}
          onChangeText={(t) => { setText(t); if (!t) onSelect?.(null); }}
          placeholder={placeholder}
          placeholderTextColor="#9a9a9a"
          autoCorrect={false}
        />
        {searching ? <ActivityIndicator size="small" color="#888" /> : null}
        {rightAccessory}
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((f) => (
            <TouchableOpacity key={f.id} style={styles.suggestion} onPress={() => pick(f)}>
              <MapPin size={14} color="#999" />
              <Text style={styles.suggestionText} numberOfLines={2}>{f.place_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', color: '#626669', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  inputRowBig: { backgroundColor: '#f0f0f0', borderWidth: 0, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  input: { flex: 1, fontSize: 15, color: '#000', padding: 0 },
  inputBig: { fontSize: 20, fontWeight: '600' },
  suggestions: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  suggestionText: { flex: 1, fontSize: 14, color: '#333' },
});
