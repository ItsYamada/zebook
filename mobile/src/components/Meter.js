import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function Meter({ used, limit, wide = false }) {
  const pct = Math.min((used / limit) * 100, 100);
  const full = used >= limit;
  return (
    <View style={[styles.wrap, wide && { width: '100%' }]}>
      <View style={styles.labels}>
        <Text style={styles.label}>Downloads</Text>
        <Text style={styles.value}>{used} / {limit}</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: full ? colors.danger : colors.teal }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 110 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 11, color: colors.inkSoft },
  value: { fontSize: 11, fontWeight: '700', color: colors.ink },
  bar: { height: 6, borderRadius: 99, backgroundColor: '#e3e7ee', overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 99 },
});
