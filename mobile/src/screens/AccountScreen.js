import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../AuthContext';
import Meter from '../components/Meter';
import { API_URL } from '../config';
import { colors, serif } from '../theme';

export default function AccountScreen() {
  const { me, logout, goRegister } = useAuth();
  const { used, limit } = me.downloads;
  const role = me.isGuest ? 'Guest' : me.user.role === 'admin' ? 'Administrator' : 'Registered user';
  const left = limit - used;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.pageTitle}>Account</Text>

      <View style={styles.card}>
        <Row k="Name" v={me.isGuest ? 'Guest visitor' : me.user.name} />
        <Row k="Email" v={me.isGuest ? 'Not signed in' : me.user.email} />
        <Row k="Access level" v={role} last />
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>Download allowance</Text>
        <Text style={styles.muted}>
          {me.isGuest ? 'Guests can download up to 5 books per session.' : 'Registered users can download up to 10 books.'} The limit is enforced by the server, so it is the same on web and Android.
        </Text>
        <Meter used={used} limit={limit} wide />
        <Text style={styles.small}>{left} download{left === 1 ? '' : 's'} remaining</Text>
      </View>

      {me.isGuest && (
        <Pressable style={styles.primary} onPress={goRegister}><Text style={styles.primaryText}>Create an account</Text></Pressable>
      )}
      <Pressable style={styles.ghost} onPress={logout}><Text style={styles.ghostText}>Log out</Text></Pressable>

      <Text style={styles.server}>Server: {API_URL.replace(/^https?:\/\//, '').replace(/\/api$/, '')}</Text>
    </ScrollView>
  );
}

function Row({ k, v, last }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <Text style={styles.muted}>{k}</Text>
      <Text style={styles.value}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 100 },
  pageTitle: { fontFamily: serif, fontWeight: '700', fontSize: 30, color: colors.ink },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 10 },
  value: { color: colors.ink, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  h3: { fontFamily: serif, fontWeight: '700', fontSize: 20, color: colors.ink },
  muted: { color: colors.inkSoft, fontSize: 14 },
  small: { color: colors.inkSoft, fontSize: 12 },
  primary: { backgroundColor: colors.teal, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghost: { borderWidth: 2, borderColor: colors.line, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  ghostText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  server: { textAlign: 'center', color: colors.inkSoft, fontSize: 12, marginTop: 6 },
});
