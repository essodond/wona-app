import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurAbonnement'>;

export default function LivreurAbonnementScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <TopBar title="Compte premium" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="crown-outline" size={52} color={colors.primary} />
        </View>
        <Text style={styles.title}>Fonctionnalité prévue après le MVP</Text>
        <Text style={styles.text}>
          Wona n’active aucun abonnement ni débit automatique dans cette version. Les prix et
          commissions restent transparents, enregistrés course par course.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.container },
  icon: { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginTop: spacing.lg },
  text: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm, backgroundColor: colors.surfaceLow, padding: spacing.md, borderRadius: radii.lg },
});

