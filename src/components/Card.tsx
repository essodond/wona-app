import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'surface' | 'white' | 'outlined';
};

export default function Card({ children, style, variant = 'surface' }: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'surface' && { backgroundColor: colors.surfaceLow },
        variant === 'white' && { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.outlineLight },
        variant === 'outlined' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.outline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
