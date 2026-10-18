import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery } from '../../types/api';
import { deliveryApi } from '../../services/api';
import { money } from '../../utils/format';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurDetailDemande'>;

export default function LivreurDetailDemandeScreen({ navigation, route }: Props) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    deliveryApi
      .get(route.params.courseId)
      .then(setDelivery)
      .catch((error) => {
        Alert.alert('Demande indisponible', error instanceof Error ? error.message : 'Réessayez.');
        navigation.goBack();
      });
  }, [navigation, route.params.courseId]);

  const accept = async () => {
    setLoading(true);
    try {
      const accepted = await deliveryApi.accept(route.params.courseId);
      navigation.replace('LivreurCourseActive', { courseId: accepted.id });
    } catch (error) {
      Alert.alert(
        'Course non acceptée',
        error instanceof Error
          ? error.message
          : 'Un autre livreur a peut-être accepté cette course.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!delivery) {
    return (
      <View style={styles.container}>
        <TopBar title="Demande" onBack={() => navigation.goBack()} />
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title={delivery.reference} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Rémunération proposée</Text>
          <Text style={styles.price}>{money(delivery.prix_livraison)}</Text>
          <Text style={styles.priceHint}>Le montant à encaisser est révélé après acceptation.</Text>
        </View>
        <View style={styles.card}>
          <Route icon="store-marker-outline" label="Zone de retrait" value={delivery.zone_depart} />
          <View style={styles.routeLine} />
          <Route icon="map-marker-outline" label="Zone de livraison" value={delivery.zone_arrivee} />
        </View>
        <View style={styles.card}>
          <Info icon="package-variant" label="Colis" value={delivery.description_colis} />
          <Info icon="resize" label="Taille" value={delivery.taille_colis.replace('_', ' ')} />
          <Info icon="lightning-bolt-outline" label="Urgence" value={delivery.urgence} />
          <Info
            icon="map-marker-distance"
            label="Distance estimée"
            value={delivery.distance_estimee_km ? `${delivery.distance_estimee_km} km` : 'À confirmer'}
          />
        </View>
        <View style={styles.security}>
          <MaterialCommunityIcons name="shield-lock-outline" size={22} color={colors.tertiary} />
          <Text style={styles.securityText}>
            Le nom, le téléphone et les adresses exactes restent masqués jusqu’à votre acceptation.
          </Text>
        </View>
        <Button label="Accepter cette course" icon="check-circle-outline" onPress={accept} loading={loading} />
        <Button label="Retour aux demandes" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </View>
  );
}

function Route({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.route}>
      <MaterialCommunityIcons name={icon as never} size={22} color={colors.primary} />
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

function Info({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <MaterialCommunityIcons name={icon as never} size={19} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.container, gap: spacing.md, paddingBottom: 48 },
  loading: { textAlign: 'center', color: colors.textSecondary, marginTop: 60 },
  priceCard: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  priceLabel: { fontSize: 11, color: 'rgba(255,255,255,.8)' },
  price: { fontSize: 28, fontWeight: '700', color: colors.white },
  priceHint: { fontSize: 10, color: 'rgba(255,255,255,.75)', textAlign: 'center', marginTop: 3 },
  card: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  route: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  routeLine: { height: 22, width: 2, backgroundColor: colors.outline, marginLeft: 10 },
  label: { fontSize: 10, color: colors.textSecondary },
  value: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  info: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoLabel: { width: 100, fontSize: 11, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  security: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.tertiaryBg,
  },
  securityText: { flex: 1, fontSize: 11, lineHeight: 16, color: colors.textPrimary },
});

