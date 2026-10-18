import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type Props = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showBrand?: boolean;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightPress?: () => void;
  transparent?: boolean;
};

export default function TopBar({
  title,
  showBack = true,
  onBack,
  showBrand,
  rightIcon,
  onRightPress,
  transparent,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xs },
        transparent && { backgroundColor: 'transparent' },
      ]}
    >
      <View style={styles.side}>
        {showBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={26} color={colors.primary} />
          </Pressable>
        )}
      </View>
      <View style={styles.center}>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : showBrand ? (
          <Text style={styles.brand}>WONA</Text>
        ) : null}
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {rightIcon && (
          <Pressable onPress={onRightPress} hitSlop={10}>
            <MaterialCommunityIcons name={rightIcon} size={24} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.container,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  side: { width: 60, justifyContent: 'center' },
  backBtn: { alignSelf: 'flex-start' },
  center: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: colors.primary },
  brand: { fontSize: 20, fontWeight: '700', color: colors.primary },
});
