import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../AuthContext';
import { colors, serif } from '../theme';

const PAGES = {
  library: { title: 'My Library', icon: '📚', phase: 'Phase 2', needsAccount: true, text: 'Books you save will live here and stay in sync between the website and the Android app.' },
  favorites: { title: 'Favorites', icon: '❤️', phase: 'Phase 2', needsAccount: true, text: 'Heart the books you love and find them again in one tap, on any device.' },
  assistant: { title: 'AI Assistant', icon: '✨', phase: 'Phase 2', needsAccount: false, text: 'Ask in plain language. The assistant searches the real catalog, compares books, recommends titles, and saves a book to My Library only after you confirm.' },
};

export default function SoonScreen({ kind }) {
  const { me, goRegister } = useAuth();
  const page = PAGES[kind];
  const blocked = page.needsAccount && me.isGuest;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.pageTitle}>{page.title}</Text>
      <View style={styles.card}>
        <View style={styles.iconBox}><Text style={{ fontSize: 30 }}>{page.icon}</Text></View>
        <Text style={styles.muted}>{page.text}</Text>
        {blocked ? (
          <View style={styles.notice}>
            <Text style={{ color: colors.ink }}>This feature is for registered users.</Text>
            <Pressable style={styles.btn} onPress={goRegister}><Text style={styles.btnText}>Create an account</Text></Pressable>
          </View>
        ) : (
          <View style={styles.pill}><Text style={styles.pillText}>Planned for {page.phase}</Text></View>
        )}
      </View>

      {kind === 'assistant' && (
        <View style={{ gap: 8, marginTop: 6 }}>
          <Text style={styles.previewLabel}>PLANNED CONVERSATION (PREVIEW)</Text>
          <View style={[styles.bubble, styles.user]}><Text style={{ color: '#fff' }}>Recommend a short classic mystery.</Text></View>
          <View style={[styles.bubble, styles.bot]}>
            <Text style={{ color: colors.ink }}>I found <Text style={{ fontWeight: '700' }}>The Adventures of Sherlock Holmes</Text> by Arthur Conan Doyle in the catalog. Want me to save it to My Library?</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, opacity: 0.85 }}>
            <View style={styles.yes}><Text style={{ color: '#fff', fontWeight: '700' }}>Yes, save it</Text></View>
            <View style={styles.no}><Text style={{ color: colors.ink, fontWeight: '700' }}>Not now</Text></View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 100 },
  pageTitle: { fontFamily: serif, fontWeight: '700', fontSize: 30, color: colors.ink },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 24, alignItems: 'center', gap: 14 },
  iconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.inkSoft, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  pill: { backgroundColor: colors.tealSoft, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5 },
  pillText: { color: colors.tealDark, fontWeight: '700', fontSize: 12 },
  notice: { backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.warnLine, borderRadius: 8, padding: 14, gap: 10, alignItems: 'center', alignSelf: 'stretch' },
  btn: { backgroundColor: colors.teal, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  btnText: { color: '#fff', fontWeight: '700' },
  previewLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft, letterSpacing: 0.6 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  yes: { backgroundColor: colors.teal, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  no: { borderWidth: 2, borderColor: colors.line, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
});
