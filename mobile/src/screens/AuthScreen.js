import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import Logo from '../components/Logo';
import { colors, serif } from '../theme';

// Decorative shelf: [width, height %, color]
const SPINES = [
  [22, 62, '#e0a526'], [14, 78, '#f2efe6'], [26, 54, '#2a9d8f'], [18, 86, '#c8553d'],
  [24, 70, '#f2efe6'], [16, 58, '#e0a526'], [28, 80, '#3d5a80'], [17, 66, '#f2efe6'],
  [25, 90, '#2a9d8f'], [19, 60, '#c8553d'], [15, 74, '#e0a526'], [26, 68, '#f2efe6'],
];

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, continueAsGuest, authMode, setAuthMode, returning } = useAuth();
  const isRegister = authMode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      await action();
    } catch (e) {
      setError(e.message);
      setFieldErrors(e.details || {});
      setBusy(false);
    }
  }

  const submit = () => run(() => (isRegister ? register(name.trim(), email.trim(), password) : login(email.trim(), password)));
  const fe = (k) => fieldErrors[k]?.[0];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <Text style={styles.brand}>Ze<Text style={{ color: colors.brass }}>Book</Text></Text>
          <Text style={styles.tagline}>Your digital library on the web and on your phone, with an AI assistant that helps you find what to read next.</Text>
          <View style={styles.shelf}>
            {SPINES.map(([w, h, c], i) => <View key={i} style={{ width: w, height: `${h}%`, backgroundColor: c, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />)}
          </View>
        </View>

        <View style={[styles.form, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.h2}>{isRegister ? 'Create your account' : returning ? 'Welcome back' : 'Welcome to ZeBook'}</Text>
          <Text style={styles.muted}>{isRegister ? 'Registered readers can download up to 10 books.' : returning ? 'Log in to open your library.' : 'Log in, create an account, or continue as a guest to start reading.'}</Text>

          {!!error && <View style={styles.alert}><Text style={styles.alertText}>{error}</Text></View>}

          {isRegister && (
            <Field label="Full name" value={name} onChangeText={setName} error={fe('name')} autoComplete="name" />
          )}
          <Field label="Email" value={email} onChangeText={setEmail} error={fe('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field
            label="Password" value={password} onChangeText={setPassword} error={fe('password')} secureTextEntry
            hint={isRegister ? 'At least 8 characters.' : undefined} autoCapitalize="none"
          />

          <Pressable style={[styles.btn, styles.primary, busy && styles.disabled]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isRegister ? 'Create account' : 'Log in'}</Text>}
          </Pressable>

          <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>or</Text><View style={styles.line} /></View>

          <Pressable style={[styles.btn, styles.ghost, busy && styles.disabled]} onPress={() => run(continueAsGuest)} disabled={busy}>
            <Text style={styles.ghostText}>Continue as guest (5 downloads)</Text>
          </Pressable>

          <Pressable onPress={() => { setAuthMode(isRegister ? 'login' : 'register'); setError(''); setFieldErrors({}); }} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={styles.muted}>
              {isRegister ? 'Already have an account? ' : 'New here? '}
              <Text style={styles.link}>{isRegister ? 'Log in' : 'Create an account'}</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, hint, ...props }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, !!error && { borderColor: colors.danger }]} placeholderTextColor="#9aa3b2" {...props} />
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
      {!error && !!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, paddingHorizontal: 24, paddingBottom: 0, gap: 10 },
  brand: { fontFamily: serif, fontWeight: '700', fontSize: 52, color: '#fff', letterSpacing: -1 },
  tagline: { color: '#cfd6e4', fontSize: 15, lineHeight: 21 },
  shelf: { marginTop: 14, height: 90, flexDirection: 'row', alignItems: 'flex-end', gap: 3, borderBottomWidth: 7, borderBottomColor: colors.brass },
  form: { padding: 24, gap: 14 },
  h2: { fontFamily: serif, fontWeight: '700', fontSize: 28, color: colors.ink },
  muted: { color: colors.inkSoft, fontSize: 14 },
  link: { color: colors.teal, fontWeight: '700' },
  label: { fontWeight: '600', color: colors.ink, fontSize: 14 },
  input: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: colors.ink, backgroundColor: '#fff' },
  hint: { fontSize: 12, color: colors.inkSoft },
  fieldError: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  alert: { backgroundColor: colors.dangerBg, borderRadius: 8, padding: 12 },
  alertText: { color: colors.danger, fontSize: 14 },
  btn: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  primary: { backgroundColor: colors.teal },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghost: { borderColor: colors.line },
  ghostText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { color: colors.inkSoft, fontSize: 13 },
});
