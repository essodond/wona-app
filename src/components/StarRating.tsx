import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

type Props = {
  rating: number;
  size?: number;
  onChange?: (value: number) => void;
  color?: string;
};

export default function StarRating({ rating, size = 18, onChange, color = colors.primary }: Props) {
  const interactive = !!onChange;
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((value) => {
        const filled = value <= Math.round(rating);
        const Comp = interactive ? Pressable : View;
        return (
          <Comp key={value} onPress={interactive ? () => onChange?.(value) : undefined} hitSlop={6}>
            <MaterialCommunityIcons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={color}
              style={{ marginRight: 2 }}
            />
          </Comp>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
