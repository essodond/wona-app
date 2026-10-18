import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  GestureResponderEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, shadow, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'right',
  loading,
  disabled,
  fullWidth = true,
  style,
}: Props) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && { width: '100%' },
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        isPrimary && shadow.button,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.primary} />
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={isPrimary ? colors.white : isDanger ? colors.error : colors.primary}
              style={{ marginRight: spacing.xs }}
            />
          )}
          <Text
            style={[
              styles.label,
              isPrimary && { color: colors.white },
              isSecondary && { color: colors.primary },
              isGhost && { color: colors.primary },
              isDanger && { color: colors.error },
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={isPrimary ? colors.white : isDanger ? colors.error : colors.primary}
              style={{ marginLeft: spacing.xs }}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.error,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
