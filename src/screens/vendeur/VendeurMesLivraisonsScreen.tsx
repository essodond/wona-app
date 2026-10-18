import React, { useCallback } from 'react';
import {
  ActivityIndicator,
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
import { useDeliveries } from '../../context/DeliveryContext';
import { TERMINAL_STATUSES, dateTime, money } from '../../utils/format';
import { colors, radii, spacing } from '../../theme';
import Button from '../../components/Button';

export default function VendeurMesLivraisonsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { deliveries, refreshMine, loading } = useDeliveries();

  useFocusEffect(
    useCallback(() => {
      refreshMine().catch(() => {});
    }, [refreshMine]),
  );

  const current = deliveries.filter((delivery) => !TERMINAL_STATUSES.includes(delivery.statut));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View>
          <Text style={styles.brand}>WONA</Text>
          <Text style={styles.title}>Mes livraisons</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Notifications')}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshMine} />}
      >
        <Button
          label="Publier un nouveau colis"
          icon="plus-circle-outline"
          variant="secondary"
          onPress={() => navigation.navigate('VendeurPublierColis')}
        />
        {!current.length && loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : !current.length ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="package-variant" size={46} color={colors.outline} />
            <Text style={styles.emptyTitle}>Aucune course en cours</Text>
          </View>
        ) : (
          current.map((delivery) => (
            <Pressable
              key={delivery.id}
              style={styles.card}
              onPress={() => navigation.navigate('VendeurSuivi', { courseId: delivery.id })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.reference}>{delivery.reference}</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{delivery.statut_label}</Text>
                </View>
              </View>
              <View style={styles.route}>
                <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.destination} numberOfLines={1}>
                    {delivery.zone_arrivee || delivery.adresse_arrivee}
                  </Text>
                  <Text style={styles.date}>{dateTime(delivery.date_creation)}</Text>
                </View>
                <Text style={styles.price}>{money(delivery.prix_livraison)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.container,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { fontSize: 13, fontWeight: '700', color: colors.primary },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  content: { padding: spacing.container, gap: spacing.sm, paddingBottom: 42 },
  card: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reference: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  statusPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  statusText: { fontSize: 9, color: colors.primaryDark, fontWeight: '700' },
  route: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  destination: { fontSize: 14, color: colors.textPrimary, fontWeight: '700' },
  date: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  price: { fontSize: 13, fontWeight: '700', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyTitle: { color: colors.textSecondary, marginTop: spacing.sm, fontWeight: '600' },
});

