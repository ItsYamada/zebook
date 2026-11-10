import { Text } from 'react-native';
import { colors, serif } from '../theme';

export default function Logo({ size = 26, dark = false }) {
  return (
    <Text style={{ fontFamily: serif, fontWeight: '700', fontSize: size, color: dark ? '#fff' : colors.ink }}>
      Ze<Text style={{ color: dark ? colors.brass : colors.teal }}>Book</Text>
    </Text>
  );
}
