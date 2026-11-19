import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors, serif } from '../theme';

const PAPER = '#fbf8f1';

// Reads a downloaded book inside the app, one page at a time. The last page and the text size are remembered.
export default function ReaderScreen({ book, onClose }) {
  const insets = useSafeAreaInsets();
  const scroller = useRef(null);
  const progressKey = `zebook_page_${book.id}`;

  const [page, setPage] = useState(null); // null until the saved page is loaded
  const [size, setSize] = useState(18);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    (async () => {
      let p = 1;
      try {
        const saved = await SecureStore.getItemAsync(progressKey);
        if (saved) p = parseInt(saved, 10) || 1;
        const s = await SecureStore.getItemAsync('zebook_font');
        if (s) setSize(parseInt(s, 10) || 18);
      } catch { /* storage unavailable */ }
      setPage(p);
    })();
  }, [progressKey]);

  const load = useCallback(async (p) => {
    setStatus('loading');
    try {
      const d = await api(`/books/${book.id}/read?page=${p}`);
      setData(d);
      setStatus('ready');
      scroller.current?.scrollTo({ y: 0, animated: false });
      if (d.page !== p) setPage(d.page);
      try { await SecureStore.setItemAsync(progressKey, String(d.page)); } catch { /* ignore */ }
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }, [book.id, progressKey]);

  useEffect(() => { if (page !== null) load(page); }, [page, retry, load]);

  const changeSize = async (delta) => {
    const next = Math.min(28, Math.max(14, size + delta));
    setSize(next);
    try { await SecureStore.setItemAsync('zebook_font', String(next)); } catch { /* ignore */ }
  };

  const total = data?.totalPages ?? 1;
  const current = data?.page ?? page ?? 1;
  const blockedFirst = status === 'error' && !data;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAPER} />
        <View style={styles.bar}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close book" hitSlop={8}>
            <Text style={styles.closeText}>← Library</Text>
          </Pressable>
          <View style={styles.fontCtl}>
            <Pressable onPress={() => changeSize(-2)} style={styles.fontBtn} accessibilityLabel="Smaller text"><Text style={styles.fontText}>A−</Text></Pressable>
            <Pressable onPress={() => changeSize(2)} style={styles.fontBtn} accessibilityLabel="Larger text"><Text style={styles.fontText}>A+</Text></Pressable>
          </View>
        </View>
        <View style={styles.heading}>
          <Text style={styles.title} numberOfLines={1}>{book.title}</Text>
          <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        </View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${data ? (data.page / data.totalPages) * 100 : 0}%` }]} /></View>

        {blockedFirst ? (
          <View style={styles.center}>
            <Text style={styles.errTitle}>{error?.status === 403 ? 'Download this book first' : 'Cannot open the book right now'}</Text>
            <Text style={styles.errText}>{error?.message}</Text>
            {error?.status !== 403 && (
              <Pressable style={styles.primary} onPress={() => setRetry(retry + 1)}><Text style={styles.primaryText}>Try again</Text></Pressable>
            )}
          </View>
        ) : (
          <ScrollView ref={scroller} contentContainerStyle={styles.textWrap}>
            {!data ? (
              <ActivityIndicator color={colors.teal} size="large" style={{ marginTop: 40 }} />
            ) : (
              <View style={{ opacity: status === 'loading' ? 0.45 : 1 }}>
                {data.text.split('\n\n').map((p, i) => (
                  <Text key={i} style={[styles.para, { fontSize: size, lineHeight: size * 1.65 }]}>{p}</Text>
                ))}
              </View>
            )}
            {status === 'error' && data && <Text style={styles.inlineError}>{error?.message}</Text>}
          </ScrollView>
        )}

        <View style={[styles.nav, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable style={[styles.navBtn, current <= 1 && styles.disabled]} disabled={current <= 1 || status === 'loading'} onPress={() => setPage(current - 1)}>
            <Text style={styles.navText}>← Previous</Text>
          </Pressable>
          <Text style={styles.pageText}>{data ? `Page ${data.page} of ${total}` : ' '}</Text>
          <Pressable style={[styles.navBtn, styles.navPrimary, (!data || current >= total) && styles.disabled]} disabled={!data || current >= total || status === 'loading'} onPress={() => setPage(current + 1)}>
            <Text style={[styles.navText, { color: '#fff' }]}>Next →</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  closeText: { color: colors.teal, fontWeight: '700', fontSize: 15 },
  fontCtl: { flexDirection: 'row', gap: 6 },
  fontBtn: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  fontText: { fontWeight: '700', color: colors.ink },
  heading: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontFamily: serif, fontWeight: '700', fontSize: 20, color: colors.ink },
  author: { color: colors.inkSoft, fontSize: 13 },
  progress: { height: 3, backgroundColor: '#e6dfcf' },
  progressFill: { height: '100%', backgroundColor: colors.teal },
  textWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  para: { fontFamily: serif, color: '#2a2a2a', marginBottom: 16 },
  inlineError: { color: colors.danger, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  errTitle: { fontFamily: serif, fontWeight: '700', fontSize: 22, color: colors.ink, textAlign: 'center' },
  errText: { color: colors.inkSoft, textAlign: 'center', fontSize: 15 },
  primary: { backgroundColor: colors.teal, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 22 },
  primaryText: { color: '#fff', fontWeight: '700' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e6dfcf', backgroundColor: PAPER },
  navBtn: { borderWidth: 2, borderColor: colors.line, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: '#fff' },
  navPrimary: { backgroundColor: colors.teal, borderColor: colors.teal },
  navText: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  pageText: { color: colors.inkSoft, fontSize: 13 },
  disabled: { opacity: 0.4 },
});
