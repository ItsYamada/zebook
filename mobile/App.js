import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import SoonScreen from './src/screens/SoonScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import AccountScreen from './src/screens/AccountScreen';
import Logo from './src/components/Logo';
import Meter from './src/components/Meter';
import { colors } from './src/theme';

const TABS = [
  { key: 'discover', label: 'Discover', icon: '🔎' },
  { key: 'library', label: 'My Library', icon: '📚' },
  { key: 'favorites', label: 'Favorites', icon: '❤️' },
  { key: 'assistant', label: 'Assistant', icon: '✨' },
  { key: 'account', label: 'Account', icon: '👤' },
];

function Main() {
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const [tab, setTab] = useState('discover');
  const [reading, setReading] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style="dark" />
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <Logo size={26} />
        <Meter used={me.downloads.used} limit={me.downloads.limit} />
      </View>

      {me.isGuest && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Browsing as a guest: {me.downloads.limit} downloads per session. Create an account for 10 downloads, My Library and favorites.</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {tab === 'discover' && <DiscoverScreen onRead={setReading} />}
        {tab === 'library' && <SoonScreen kind="library" />}
        {tab === 'favorites' && <SoonScreen kind="favorites" />}
        {tab === 'assistant' && <SoonScreen kind="assistant" />}
        {tab === 'account' && <AccountScreen />}
      </View>

      {reading && <ReaderScreen book={reading} onClose={() => setReading(null)} />}

      <View style={[styles.tabbar, { paddingBottom: insets.bottom + 6 }]}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)} accessibilityRole="button" accessibilityLabel={t.label}>
              <Text style={[styles.tabIcon, !on && { opacity: 0.5 }]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Root() {
  const { me, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Logo size={48} dark />
        <ActivityIndicator color={colors.brass} style={{ marginTop: 18 }} />
      </View>
    );
  }
  if (!me) return (<><StatusBar style="light" /><AuthScreen /></>);
  return <Main />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  banner: { backgroundColor: colors.warnBg, borderBottomWidth: 1, borderBottomColor: colors.warnLine, paddingHorizontal: 16, paddingVertical: 8 },
  bannerText: { fontSize: 12, color: colors.ink },
  tabbar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10.5, color: colors.inkSoft },
  tabLabelOn: { color: colors.teal, fontWeight: '700' },
});
