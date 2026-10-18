import React, { useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery, DeliveryStatus } from '../../types/api';
import { useDeliveries } from '../../context/DeliveryContext';
import { TERMINAL_STATUSES, dateTime, money } from '../../utils/format';
import { colors, radii, shadow, spacing } from '../../theme';

const ACTIVE_STATUSES: DeliveryStatus[] = [
  'acceptee',
  'en_route_retrait',
  'arrive_retrait',
  'colis_recupere',
  'en_livraison',
];

const STATUS_ICON: Partial<Record<DeliveryStatus, string>> = {
  livree: 'check-circle-outline',
  echec: 'alert-circle-outline',
  annulee_vendeur: 'close-circle-outline',
  annulee_livreur: 'close-circle-outline',
  litige: 'shield-alert-outline',
};

export default function LivreurHistoriqueRevenusScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { deliveries, stats, loading, refreshMine, refreshStats } = useDeliveries();

  const load = useCallback(async () => {
    await Promise.all([refreshMine(), refreshStats()]);
  }, [refreshMine, refreshStats]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const active = deliveries.find((item) => ACTIVE_STATUSES.includes(item.statut));
  const history = deliveries.filter((item) => TERMINAL_STATUSES.includes(item.statut));
  const delivered = history.filter((item) => item.statut === 'livree');
  const commissions = delivered.reduce((sum, delivery) => {
    const payment = delivery.paiements.find((item) => item.type === 'commission');
    return sum + Number(payment?.montant || 0);
  }, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View>
          <Text style={styles.brand}>WONA</Text>
          <Text style={styles.title}>Mes courses</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="history" size={24} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <Text style={styles.sectionTitle}>Livraison en cours</Text>
        {active ? (
          <Pressable
            style={({ pressed }) => [styles.activeCard, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate('LivreurCourseActive', { courseId: active.id })
            }
          >
            <View style={styles.activeTop}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>EN COURS</Text>
              </View>
              <Text style={styles.activeReference}>{active.reference}</Text>
            </View>
            <Text style={styles.activeStatus}>{active.statut_label}</Text>
            <View style={styles.activeRoute}>
              <MaterialCommunityIcons
                name="map-marker-path"
                size={22}
                color={colors.white}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeAddress} numberOfLines={1}>
                  {active.zone_depart || active.adresse_depart}
                </Text>
                <Text style={styles.activeAddress} numberOfLines={1}>
                  → {active.zone_arrivee || active.adresse_arrivee}
                </Text>
              </View>
              <View style={styles.activeArrow}>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={colors.primary}
                />
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.noActive}>
            <MaterialCommunityIcons
              name="moped-outline"
              size={30}
              color={colors.outline}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.noActiveTitle}>Aucune livraison en cours</Text>
              <Text style={styles.noActiveText}>
                Une course acceptée apparaîtra ici automatiquement.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Revenus des courses livrées</Text>
            <Text style={styles.total}>{money(stats?.montant_livraisons)}</Text>
            <Text style={styles.totalSub}>{stats?.livrees || 0} livraison(s) réussie(s)</Text>
          </View>
          <View style={styles.walletIcon}>
            <MaterialCommunityIcons name="wallet-outline" size={27} color={colors.white} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Summary
            label="Commissions suivies"
            value={money(commissions)}
            icon="percent-outline"
          />
          <Summary
            label="Historique total"
            value={String(history.length)}
            icon="package-check"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historique des livraisons</Text>
          <Text style={styles.sectionCount}>{history.length}</Text>
        </View>

        {!history.length ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={44} color={colors.outline} />
            <Text style={styles.emptyTitle}>Aucune ancienne livraison</Text>
            <Text style={styles.emptyText}>
              Les courses terminées, annulées ou signalées seront conservées ici.
            </Text>
          </View>
        ) : (
          history.map((delivery) => (
            <HistoryRow
              key={delivery.id}
              delivery={delivery}
              onPress={() =>
                navigation.navigate('LivreurHistoriqueDetail', {
                  courseId: delivery.id,
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Summary({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.summary}>
      <MaterialCommunityIcons name={icon as never} size={21} color={colors.primary} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function HistoryRow({
  delivery,
  onPress,
}: {
  delivery: Delivery;
  onPress: () => void;
}) {
  const success = delivery.statut === 'livree';
  const lastUpdate =
    delivery.historique_statuts.at(-1)?.date_creation ||
    delivery.livree_le ||
    delivery.date_creation;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, !success && styles.rowIconWarning]}>
        <MaterialCommunityIcons
          name={(STATUS_ICON[delivery.statut] || 'package-variant') as never}
          size={22}
          color={success ? colors.success : colors.error}
        />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.reference}>{delivery.reference}</Text>
          <Text style={styles.amount}>{money(delivery.prix_livraison)}</Text>
        </View>
        <Text style={styles.routeText} numberOfLines={1}>
          {delivery.zone_depart || delivery.adresse_depart} →{' '}
          {delivery.zone_arrivee || delivery.adresse_arrivee}
        </Text>
        <View style={styles.rowBottom}>
          <Text style={[styles.status, !success && styles.statusWarning]}>
            {delivery.statut_label}
          </Text>
          <Text style={styles.date}>{dateTime(lastUpdate)}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.outline} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.container,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 13, fontWeight: '800', color: colors.primary },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.container, gap: spacing.md, paddingBottom: 34 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  activeCard: {
    borderRadius: radii.xl,
    padding: spacing.md,
    backgroundColor: colors.primary,
    gap: spacing.sm,
    ...shadow.button,
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.17)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white },
  liveText: { fontSize: 9, fontWeight: '900', color: colors.white, letterSpacing: 0.5 },
  activeReference: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.78)' },
  activeStatus: { fontSize: 19, fontWeight: '800', color: colors.white },
  activeRoute: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  activeAddress: { fontSize: 11, color: 'rgba(255,255,255,0.88)', lineHeight: 17 },
  activeArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noActive: {
    minHeight: 86,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outline,
    backgroundColor: colors.surfaceLow,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noActiveTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  noActiveText: { fontSize: 10, lineHeight: 15, color: colors.textSecondary },
  totalCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,.8)' },
  total: { fontSize: 27, fontWeight: '800', color: colors.white },
  totalSub: { fontSize: 10, color: 'rgba(255,255,255,.76)' },
  walletIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summary: {
    flex: 1,
    minHeight: 100,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  summaryValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 3 },
  summaryLabel: { fontSize: 9, color: colors.textSecondary, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.surface,
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    backgroundColor: colors.surfaceLow,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconWarning: { backgroundColor: colors.errorBg },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reference: { fontSize: 11, fontWeight: '800', color: colors.textPrimary },
  amount: { fontSize: 12, fontWeight: '800', color: colors.primary },
  routeText: { fontSize: 10, color: colors.textSecondary },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 9, color: colors.success, fontWeight: '700' },
  statusWarning: { color: colors.error },
  date: { fontSize: 9, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 42, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.textPrimary, marginTop: spacing.xs, fontWeight: '700' },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 3,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
