import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';

type Props = {
  label: string;
  variant?: 'default' | 'active' | 'success' | 'error' | 'outline';
  small?: boolean;
};

export default function Chip({ label, variant = 'default', small }: Props) {
  return (
    <View
      style={[
        styles.base,
        small && { paddingVertical: 2, paddingHorizontal: spacing.xs },
        variant === 'default' && { backgroundColor: colors.secondaryContainer },
        variant === 'active' && { backgroundColor: colors.primary },
        variant === 'success' && { backgroundColor: colors.successBg },
        variant === 'error' && { backgroundColor: colors.errorBg },
        variant === 'outline' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.outline },
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'active' && { color: colors.white },
          variant === 'success' && { color: colors.success },
          variant === 'error' && { color: colors.error },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
