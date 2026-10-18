import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { useDeliveries } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import { TERMINAL_STATUSES } from '../../utils/format';
import { colors, radii, shadow, spacing } from '../../theme';
import WonaMap from '../../components/WonaMap';

export default function VendeurAccueilScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { deliveries, refreshMine } = useDeliveries();

  useFocusEffect(
    useCallback(() => {
      refreshMine().catch(() => {});
    }, [refreshMine]),
  );

  const active = deliveries.find(
    (delivery) => !TERMINAL_STATUSES.includes(delivery.statut) && delivery.statut !== 'brouillon',
  );
  const driver = active?.livreur_detail;
  const points =
    driver?.derniere_position_lat && driver.derniere_position_lng
      ? [
          {
            latitude: Number(driver.derniere_position_lat),
            longitude: Number(driver.derniere_position_lng),
            title: driver.nom || 'Livreur',
          },
        ]
      : [];

  return (
    <View style={styles.container}>
      <WonaMap style={StyleSheet.absoluteFill} points={points} showRoute={false} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View>
          <Text style={styles.brand}>WONA</Text>
          <Text style={styles.greeting}>Bonjour {user?.nom_complet || 'vendeur'}</Text>
        </View>
        <Pressable style={styles.headerButton} onPress={() => navigation.navigate('Notifications')}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {active ? (
        <Pressable
          style={styles.activeCard}
          onPress={() => navigation.navigate('VendeurSuivi', { courseId: active.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.activeLabel}>LIVRAISON ACTIVE · {active.reference}</Text>
            <Text style={styles.activeTitle}>{active.statut_label}</Text>
            <Text style={styles.activeSub} numberOfLines={1}>
              {active.zone_arrivee || active.adresse_arrivee}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right-circle" size={28} color={colors.white} />
        </Pressable>
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="package-variant-closed" size={26} color={colors.primary} />
          <Text style={styles.emptyText}>Aucune livraison active</Text>
        </View>
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('VendeurPublierColis')}>
        <MaterialCommunityIcons name="plus" size={21} color={colors.white} />
        <Text style={styles.fabText}>PUBLIER UN COLIS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.container,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,.95)',
  },
  brand: { fontSize: 18, fontWeight: '700', color: colors.primary },
  greeting: { fontSize: 11, color: colors.textSecondary },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCard: {
    position: 'absolute',
    left: spacing.container,
    right: spacing.container,
    bottom: 104,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow.button,
  },
  activeLabel: { fontSize: 9, color: 'rgba(255,255,255,.78)', fontWeight: '700' },
  activeTitle: { fontSize: 16, color: colors.white, fontWeight: '700', marginTop: 2 },
  activeSub: { fontSize: 11, color: 'rgba(255,255,255,.85)' },
  emptyCard: {
    position: 'absolute',
    left: spacing.container,
    bottom: 104,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow.soft,
  },
  emptyText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: spacing.container,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    ...shadow.button,
  },
  fabText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});

