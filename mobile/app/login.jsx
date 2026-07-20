import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../src/store/authStore';

// Segmented account-type toggle. Driver/Admin are existing staff logins; User
// is the rider side (with self-signup). The rendered app view is still driven
// by the account's real role after auth — this just tailors the login UI.
const TABS = [
  { key: 'driver', label: 'Driver' },
  { key: 'user', label: 'User' },
  { key: 'admin', label: 'Admin' },
];

export default function LoginScreen() {
  const { login, signup, loading, error } = useAuthStore();
  const [tab, setTab] = useState('driver');
  const [authMode, setAuthMode] = useState('login'); // login | signup (User only)
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const isUser = tab === 'user';
  const isSignup = isUser && authMode === 'signup';

  const submit = async () => {
    if (!username.trim() || !password) return;
    try {
      if (isSignup) {
        if (!name.trim()) return;
        await signup(username.trim(), password, name.trim());
      } else {
        await login(username.trim(), password);
      }
    } catch {}
  };

  const canSubmit = username.trim() && password && (!isSignup || name.trim()) && !loading;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.logoBox}><Text style={styles.logoText}>LOGISTICS</Text></View>

        {/* Account-type toggle */}
        <View style={styles.toggle}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.toggleBtn, tab === t.key && styles.toggleBtnActive]}
              onPress={() => { setTab(t.key); setAuthMode('login'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, tab === t.key && styles.toggleTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>{isSignup ? 'Create your account' : 'Sign in'}</Text>
        <Text style={styles.subtitle}>
          {isUser
            ? (isSignup ? 'Sign up to book rides' : 'Sign in to book rides')
            : `Sign in as ${tab === 'admin' ? 'an admin' : 'a driver'}`}
        </Text>

        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        {isSignup && (
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#999" />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Enter username" placeholderTextColor="#999" autoCapitalize="none" autoCorrect={false} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Enter password" placeholderTextColor="#999" secureTextEntry />
        </View>

        <TouchableOpacity style={[styles.button, !canSubmit && styles.buttonDisabled]} onPress={submit} disabled={!canSubmit} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>{isSignup ? 'Create account' : 'Sign In'}</Text>}
        </TouchableOpacity>

        {isUser && (
          <TouchableOpacity style={styles.switchMode} onPress={() => setAuthMode(m => (m === 'login' ? 'signup' : 'login'))}>
            <Text style={styles.switchModeText}>
              {authMode === 'login' ? "New here? Create an account" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  inner: { paddingHorizontal: 32 },
  logoBox: { alignSelf: 'center', marginBottom: 28 },
  logoText: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: '#000' },
  toggle: { flexDirection: 'row', backgroundColor: '#eaeaea', borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: '#000' },
  title: { fontSize: 24, fontWeight: '600', color: '#000', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#c4001a', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, fontSize: 16, color: '#000' },
  button: { backgroundColor: '#000', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchMode: { alignItems: 'center', marginTop: 18 },
  switchModeText: { color: '#0061bd', fontSize: 14, fontWeight: '600' },
});
