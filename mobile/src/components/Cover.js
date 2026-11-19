import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '../config';
import { coverColors, serif } from '../theme';

// Every cover is drawn by the app, so it always looks good (and works without internet).
// The real cover image (looked up by the server on Open Library) is shown on top when one exists.
const GENRE_COLORS = {
  Classics: '#3d5a80',
  Adventure: '#a8452f',
  "Fantasy & Children's": '#5b4a8a',
  'Horror & Gothic': '#2f4858',
  Mystery: '#1f6f78',
  Philosophy: '#7a5f12',
  'Science Fiction': '#2a6f4f',
};
const colorFor = (book) => GENRE_COLORS[book.genre] || coverColors[book.id % coverColors.length];

export default function Cover({ book }) {
  const [failed, setFailed] = useState(false);
  const initial = (book.title || '?').replace(/^(The|A|An)\s+/i, '').charAt(0);
  return (
    <View style={[styles.cover, { backgroundColor: colorFor(book) }]}>
      <Text style={styles.mark}>{initial}</Text>
      <View style={[styles.shade, { height: '62%', opacity: 0.07 }]} />
      <View style={[styles.shade, { height: '46%', opacity: 0.08 }]} />
      <View style={[styles.shade, { height: '30%', opacity: 0.09 }]} />
      <View style={styles.textBox}>
        <Text style={styles.title} numberOfLines={4}>{book.title}</Text>
        <View style={styles.rule} />
        <Text style={styles.author} numberOfLines={2}>{book.author}</Text>
      </View>
      <View style={styles.spine} />
      {!failed && (
        <Image source={{ uri: `${API_URL}/books/${book.id}/cover` }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      )}
      <View style={styles.tag}><Text style={styles.tagText} numberOfLines={1}>{book.genre}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    aspectRatio: 2 / 3, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderTopRightRadius: 10, borderBottomRightRadius: 10,
    overflow: 'hidden', justifyContent: 'flex-end', paddingVertical: 12, paddingLeft: 16, paddingRight: 10, elevation: 4,
  },
  mark: { position: 'absolute', right: -6, bottom: -26, fontFamily: serif, fontWeight: '700', fontSize: 130, color: '#fff', opacity: 0.13 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  tag: { position: 'absolute', top: 9, left: 16, maxWidth: '78%', backgroundColor: 'rgba(20,33,61,0.78)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  textBox: { gap: 6 },
  title: { fontFamily: serif, fontWeight: '700', fontSize: 16, lineHeight: 19, color: '#fff' },
  rule: { width: 26, height: 3, borderRadius: 2, backgroundColor: '#e0a526' },
  author: { fontSize: 11, color: '#f2efe6', opacity: 0.9 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: 'rgba(0,0,0,0.22)' },
});
