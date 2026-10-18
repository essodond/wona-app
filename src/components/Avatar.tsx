import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

const PALETTE = ['#E8791E', '#974800', '#006494', '#665D52', '#BA6B3A'];

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return PALETTE[hash % PALETTE.length];
}

type Props = {
  name: string;
  size?: number;
  ringColor?: string;
};

export default function Avatar({ name, size = 56, ringColor }: Props) {
  const bg = getColorForName(name);
  return (
    <View
      style={[
        styles.ring,
        ringColor ? { borderColor: ringColor, borderWidth: 2 } : null,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <View
        style={[
          styles.circle,
          { backgroundColor: bg, width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
  },
});
