import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.safeArea,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.track}>
        <LinearGradient
          colors={['rgba(255,244,235,0.98)', 'rgba(255,211,178,0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trackBackground}
        >
          <View style={styles.trackHighlight} />
        </LinearGradient>

        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const options = descriptor.options;
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;
          const color = focused ? colors.white : '#713817';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.item,
                focused && styles.activeItem,
                pressed && styles.pressed,
              ]}
            >
              {focused ? (
                <View style={styles.activeSurface}>
                  <BlurView
                    intensity={78}
                    tint="systemUltraThinMaterialLight"
                    experimentalBlurMethod="dimezisBlurView"
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['rgba(255,153,76,0.96)', 'rgba(218,91,8,0.98)']}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.activeHighlight} />
                  <View style={styles.activeGlow} />
                </View>
              ) : null}

              {options.tabBarIcon?.({
                focused,
                color,
                size: focused ? 24 : 22,
              })}
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color },
                  focused && styles.activeLabel,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  track: {
    height: 66,
    borderRadius: 34,
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    overflow: 'visible',
    elevation: 15,
    shadowColor: '#8A3D0D',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.24,
    shadowRadius: 17,
  },
  trackBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 34,
    overflow: 'hidden',
  },
  trackHighlight: {
    position: 'absolute',
    top: 2,
    left: 26,
    right: 26,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  item: {
    flex: 1,
    height: 56,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  activeItem: {
    flex: 1.28,
    height: 76,
    borderRadius: 36,
    transform: [{ translateY: -5 }],
    zIndex: 3,
    elevation: 18,
    shadowColor: '#8D3C08',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 13,
  },
  activeSurface: {
    ...StyleSheet.absoluteFill,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  activeHighlight: {
    position: 'absolute',
    top: 3,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.74)',
  },
  activeGlow: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    top: -20,
    left: -8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  label: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
