import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function ProgressDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 28, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.outline },
});
