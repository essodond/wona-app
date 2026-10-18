import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import type { DriverProfile } from '../../types/api';
import { driverApi } from '../../services/api';
import { useDeliveries } from '../../context/DeliveryContext';
import { money } from '../../utils/format';
import { colors, radii, shadow, spacing } from '../../theme';
import WonaMap from '../../components/WonaMap';

export default function LivreurAccueilScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { available, refreshAvailable, refreshStats, stats, loading } = useDeliveries();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    const value = await driverApi.profile();
    setProfile(value);
    await Promise.all([
      value.statut_disponibilite === 'disponible' ? refreshAvailable() : Promise.resolve([]),
      refreshStats(),
    ]);
  }, [refreshAvailable, refreshStats]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const setAvailability = async (enabled: boolean) => {
    if (changing) return;
    setChanging(true);
    try {
      if (enabled) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert(
            'Position nécessaire',
            'La position est requise pour recevoir les demandes proches.',
          );
          return;
        }
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const point = {
          latitude: Number(current.coords.latitude.toFixed(6)),
          longitude: Number(current.coords.longitude.toFixed(6)),
        };
        setPosition(point);
        await driverApi.updatePosition(point.latitude, point.longitude);
      }
      const value = await driverApi.setAvailability(enabled);
      setProfile(value);
      if (enabled) await refreshAvailable();
    } catch (error) {
      Alert.alert('Disponibilité non modifiée', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setChanging(false);
    }
  };

  const online = profile?.statut_disponibilite === 'disponible';
  const active = profile?.statut_disponibilite === 'en_livraison';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View>
          <Text style={styles.brand}>WONA</Text>
          <Text style={styles.sub}>Espace livreur</Text>
        </View>
        <Pressable style={styles.bell} onPress={() => navigation.navigate('Notifications')}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.toggle}>
          <Switch
            value={online || active}
            onValueChange={setAvailability}
            disabled={changing || active}
            trackColor={{ true: colors.primary, false: colors.secondaryContainer }}
            thumbColor={colors.white}
          />
          <Text style={styles.toggleText}>
            {active ? 'En livraison' : online ? 'Disponible' : 'Hors ligne'}
          </Text>
        </View>
      </View>

      <View style={styles.mapArea}>
        <WonaMap
          style={StyleSheet.absoluteFill}
          points={position ? [{ ...position, title: 'Ma position' }] : []}
          showRoute={false}
        />
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Gains livrés</Text>
          <Text style={styles.statsValue}>{money(stats?.montant_livraisons)}</Text>
          <Text style={styles.statsSub}>{stats?.livrees || 0} course(s) terminée(s)</Text>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Demandes disponibles</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{available.length}</Text>
          </View>
        </View>
        <ScrollView
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.requests}
        >
          {!online ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="toggle-switch-off-outline" size={42} color={colors.outline} />
              <Text style={styles.emptyTitle}>Passez disponible</Text>
              <Text style={styles.emptyText}>Les demandes proches s’afficheront ici.</Text>
            </View>
          ) : !available.length ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="radar" size={42} color={colors.outline} />
              <Text style={styles.emptyTitle}>Aucune demande pour le moment</Text>
              <Text style={styles.emptyText}>Tirez vers le bas pour actualiser.</Text>
            </View>
          ) : (
            available.map((request) => (
              <Pressable
                key={request.id}
                style={styles.request}
                onPress={() =>
                  navigation.navigate('LivreurDetailDemande', { courseId: request.id })
                }
              >
                <View style={styles.requestTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestTitle}>{request.zone_depart}</Text>
                    <Text style={styles.requestRoute}>→ {request.zone_arrivee}</Text>
                  </View>
                  <Text style={styles.requestPrice}>{money(request.prix_livraison)}</Text>
                </View>
                <View style={styles.requestMeta}>
                  <Text style={styles.metaText}>{request.taille_label}</Text>
                  <Text style={styles.metaText}>
                    {request.distance_estimee_km ? `${request.distance_estimee_km} km` : 'Distance à confirmer'}
                  </Text>
                  {request.urgence !== 'normale' ? (
                    <Text style={styles.urgent}>{request.urgence_label.toUpperCase()}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.container,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  brand: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  sub: { fontSize: 10, color: colors.textSecondary },
  bell: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleText: { fontSize: 11, fontWeight: '700', color: colors.textPrimary },
  mapArea: { height: '34%' },
  statsCard: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.container,
    backgroundColor: 'rgba(255,255,255,.95)',
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow.soft,
  },
  statsLabel: { fontSize: 10, color: colors.textSecondary },
  statsValue: { fontSize: 17, color: colors.primary, fontWeight: '700' },
  statsSub: { fontSize: 9, color: colors.textSecondary },
  sheet: {
    flex: 1,
    marginTop: -18,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
    ...shadow.soft,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.container,
    marginBottom: spacing.sm,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  requests: { paddingHorizontal: spacing.container, paddingBottom: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  request: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between' },
  requestTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  requestRoute: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  requestPrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  requestMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  metaText: { fontSize: 10, color: colors.textSecondary },
  urgent: { fontSize: 9, color: colors.error, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 36 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.xs },
  emptyText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
