import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { useDeliveries } from '../../context/DeliveryContext';
import { TERMINAL_STATUSES, dateTime, money } from '../../utils/format';
import { colors, radii, spacing } from '../../theme';

export default function VendeurHistoriqueScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { deliveries, loading, refreshMine } = useDeliveries();

  useFocusEffect(
    useCallback(() => {
      refreshMine().catch(() => {});
    }, [refreshMine]),
  );

  const history = deliveries.filter((delivery) => TERMINAL_STATUSES.includes(delivery.statut));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Text style={styles.brand}>WONA</Text>
        <Text style={styles.title}>Historique</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshMine} />}
      >
        {!history.length ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={48} color={colors.outline} />
            <Text style={styles.emptyTitle}>Aucune livraison terminée</Text>
          </View>
        ) : (
          history.map((delivery) => (
            <Pressable
              key={delivery.id}
              style={styles.card}
              onPress={() => navigation.navigate('VendeurSuivi', { courseId: delivery.id })}
            >
              <View style={styles.icon}>
                <MaterialCommunityIcons
                  name={delivery.statut === 'livree' ? 'check' : 'alert-outline'}
                  size={21}
                  color={delivery.statut === 'livree' ? colors.success : colors.error}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.destination}>{delivery.zone_arrivee || delivery.adresse_arrivee}</Text>
                <Text style={styles.meta}>{delivery.statut_label} · {dateTime(delivery.date_creation)}</Text>
              </View>
              <Text style={styles.price}>{money(delivery.prix_livraison)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.container, paddingBottom: spacing.sm },
  brand: { fontSize: 13, fontWeight: '700', color: colors.primary },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  content: { flexGrow: 1, padding: spacing.container, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  destination: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 10, color: colors.textSecondary, marginTop: 3 },
  price: { fontSize: 12, fontWeight: '700', color: colors.primary },
  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingBottom: 80 },
  emptyTitle: { marginTop: spacing.sm, color: colors.textSecondary, fontWeight: '600' },
});

