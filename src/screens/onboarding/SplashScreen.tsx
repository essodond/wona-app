import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2200);
    return () => clearTimeout(timer);
  }, [navigation, pulse]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBox, { transform: [{ scale: pulse }] }]}>
        <MaterialCommunityIcons name="moped" size={56} color={colors.white} />
      </Animated.View>
      <Text style={styles.brand}>WONA</Text>
      <Text style={styles.tagline}>Logistique urbaine rapide & sécurisée</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.container,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 220,
  },
});
