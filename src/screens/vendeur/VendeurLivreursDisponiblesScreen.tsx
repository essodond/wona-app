import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';

type Props = NativeStackScreenProps<RootStackParamList, 'VendeurLivreursDisponibles'>;

export default function VendeurLivreursDisponiblesScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <TopBar title="Attribution des courses" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="account-search-outline" size={50} color={colors.primary} />
        </View>
        <Text style={styles.title}>Attribution équitable et sécurisée</Text>
        <Text style={styles.text}>
          Une course publiée est proposée aux livreurs validés et disponibles. Le premier à
          l’accepter devient l’unique livreur assigné ; les coordonnées exactes restent privées
          jusque-là.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.container },
  icon: { width: 106, height: 106, borderRadius: 53, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginTop: spacing.lg },
  text: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm, backgroundColor: colors.surfaceLow, padding: spacing.md, borderRadius: radii.lg },
});

