import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Cover from '../components/Cover';
import { colors, serif } from '../theme';

const PAGE = 20;

export default function DiscoverScreen({ onRead }) {
  const { me, refresh } = useAuth();
  const { width } = useWindowDimensions();
  const cardW = (width - 16 * 2 - 14) / 2;

  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const reqId = useRef(0);

  const { used, limit } = me.downloads;
  const limitReached = used >= limit;

  useEffect(() => { api('/books/genres').then((d) => setGenres(d.genres)).catch(() => {}); }, []);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (pageToLoad, replace) => {
    const id = ++reqId.current;
    if (replace) setStatus('loading'); else setLoadingMore(true);
    try {
      const qs = new URLSearchParams({ search: query, genre, page: String(pageToLoad), limit: String(PAGE) });
      const d = await api(`/books?${qs}`);
      if (id !== reqId.current) return; // a newer request replaced this one
      setBooks((prev) => (replace ? d.books : [...prev, ...d.books]));
      setPage(d.page);
      setTotalPages(d.totalPages);
      setTotal(d.total);
      setStatus('ready');
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e.message);
      setStatus('error');
    } finally {
      if (id === reqId.current) setLoadingMore(false);
    }
  }, [query, genre]);

  useEffect(() => { load(1, true); }, [load]);

  const loadMore = () => {
    if (status === 'ready' && !loadingMore && page < totalPages) load(page + 1, false);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  async function download(book) {
    setBusyId(book.id);
    try {
      const d = await api(`/books/${book.id}/download`, { method: 'POST' });
      setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, downloaded: true } : b)));
      setToast({ type: 'ok', msg: d.message, book });
    } catch (e) {
      setToast({ type: 'error', msg: e.message });
    } finally {
      await refresh();
      setBusyId(null);
    }
  }

  const header = (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Find your next read</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search books, authors, topics…" placeholderTextColor="#8a93a3"
            returnKeyType="search" autoCapitalize="none" autoCorrect={false}
          />
          {!!search && <Pressable onPress={() => setSearch('')} hitSlop={10}><Text style={styles.clear}>✕</Text></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          <Chip label="All" on={genre === ''} onPress={() => setGenre('')} />
          {genres.map((g) => <Chip key={g.genre} label={`${g.genre} ${g.count}`} on={genre === g.genre} onPress={() => setGenre(g.genre)} />)}
        </ScrollView>
      </View>
      <View style={styles.resultsHead}>
        <Text style={styles.resultsTitle}>{genre || 'All books'}</Text>
        <Text style={styles.muted}>{status === 'ready' ? `${total} ${total === 1 ? 'book' : 'books'}` : ''}</Text>
      </View>
      {status === 'error' && <View style={styles.alert}><Text style={styles.alertText}>{error}</Text></View>}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={books}
        keyExtractor={(b) => String(b.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 16 }}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 90, gap: 18 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          status === 'loading' ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.teal} size="large" /> :
          status === 'ready' ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{query || genre ? 'No books match your search' : 'The library is empty'}</Text>
              <Text style={styles.muted}>{query || genre ? 'Try a different title, author or category.' : 'Add books to the database and they will appear here.'}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.teal} /> : null}
        renderItem={({ item: b }) => (
          <View style={{ width: cardW, gap: 6 }}>
            <Cover book={b} />
            <View style={{ minHeight: 40 }}>
              <Text style={styles.bookTitle} numberOfLines={1}>{b.title}</Text>
              <Text style={styles.bookMeta} numberOfLines={1}>{b.author}{b.year ? ` · ${b.year}` : ''}</Text>
            </View>
            {b.downloaded ? (
              <Pressable style={[styles.dl, styles.dlRead]} onPress={() => onRead(b)}>
                <Text style={styles.dlReadText}>📖 Read</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.dl, (busyId === b.id || limitReached) && { opacity: 0.55 }]} onPress={() => download(b)} disabled={busyId === b.id || limitReached}>
                <Text style={styles.dlText}>{busyId === b.id ? 'Preparing…' : limitReached ? 'Limit reached' : 'Download'}</Text>
              </Pressable>
            )}
          </View>
        )}
      />

      {toast && (
        <View style={[styles.toast, toast.type === 'error' && { backgroundColor: colors.danger }]}>
          <Text style={styles.toastText} numberOfLines={3}>{toast.msg}</Text>
          {!!toast.book && <Pressable onPress={() => { onRead(toast.book); setToast(null); }}><Text style={styles.toastLink}>Read now</Text></Pressable>}
          <Pressable onPress={() => setToast(null)} hitSlop={10}><Text style={styles.toastX}>✕</Text></Pressable>
        </View>
      )}
    </View>
  );
}

function Chip({ label, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 12 },
  heroTitle: { fontFamily: serif, fontWeight: '700', fontSize: 30, color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.ink },
  clear: { color: colors.inkSoft, fontSize: 16, paddingHorizontal: 4 },
  chip: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.brass, borderColor: colors.brass },
  chipText: { color: '#e6ebf5', fontSize: 13 },
  chipTextOn: { color: colors.ink, fontWeight: '700' },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, paddingVertical: 14 },
  resultsTitle: { fontFamily: serif, fontWeight: '700', fontSize: 22, color: colors.ink },
  muted: { color: colors.inkSoft, fontSize: 13 },
  alert: { backgroundColor: colors.dangerBg, margin: 16, borderRadius: 8, padding: 12 },
  alertText: { color: colors.danger },
  empty: { margin: 16, padding: 28, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 12, gap: 6 },
  emptyTitle: { fontFamily: serif, fontWeight: '700', fontSize: 20, color: colors.ink, textAlign: 'center' },
  bookTitle: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  bookMeta: { color: colors.inkSoft, fontSize: 12 },
  dl: { backgroundColor: colors.teal, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  dlText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dlRead: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.teal },
  dlReadText: { color: colors.tealDark, fontWeight: '700', fontSize: 13 },
  toast: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, elevation: 8 },
  toastText: { flex: 1, color: '#fff', fontSize: 14 },
  toastLink: { color: colors.brass, fontWeight: '700' },
  toastX: { color: '#fff', fontSize: 16 },
});
