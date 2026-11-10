import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { coverColors, serif } from '../theme';

export default function Cover({ book }) {
  const [failed, setFailed] = useState(false);
  const showImage = book.cover_url && !failed;
  return (
    <View style={[styles.cover, { backgroundColor: coverColors[book.id % coverColors.length] }]}>
      {showImage ? (
        <Image source={{ uri: book.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <Text style={styles.title} numberOfLines={5}>{book.title}</Text>
      )}
      <View style={styles.tag}><Text style={styles.tagText} numberOfLines={1}>{book.genre}</Text></View>
      <View style={styles.spine} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    aspectRatio: 2 / 3, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderTopRightRadius: 10, borderBottomRightRadius: 10,
    overflow: 'hidden', justifyContent: 'flex-end', padding: 10, elevation: 4,
  },
  title: { fontFamily: serif, fontWeight: '700', fontSize: 16, color: '#fff' },
  tag: { position: 'absolute', top: 8, left: 12, maxWidth: '80%', backgroundColor: 'rgba(20,33,61,0.78)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: 'rgba(0,0,0,0.2)' },
});
