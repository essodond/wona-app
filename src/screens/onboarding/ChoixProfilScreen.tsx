import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChoixProfil'>;

export default function ChoixProfilScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.brand}>WONA</Text>
      <View style={styles.headerText}>
        <Text style={styles.title}>Bienvenue sur WONA</Text>
        <Text style={styles.subtitle}>Veuillez choisir votre profil pour continuer l'aventure avec nous.</Text>
      </View>

      <View style={styles.cards}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('Connexion', { role: 'vendeur' })}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="storefront-outline" size={32} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Je suis vendeur</Text>
              <Text style={styles.cardText}>Gérez votre boutique et vos commandes facilement.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('Connexion', { role: 'livreur' })}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="truck-fast-outline" size={32} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Je suis livreur</Text>
              <Text style={styles.cardText}>Livrez des colis et augmentez vos revenus quotidiens.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
          </View>
        </Pressable>
      </View>

      <Pressable style={styles.infoBtn}>
        <Text style={styles.infoText}>En savoir plus sur nos services</Text>
        <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.container },
  brand: { fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center', marginBottom: spacing.lg },
  headerText: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.md },
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardPressed: { borderColor: colors.primary },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.primaryDark, marginBottom: 2 },
  cardText: { fontSize: 13, color: colors.textSecondary },
  infoBtn: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  infoText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
