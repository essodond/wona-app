import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery, DeliveryStatus } from '../../types/api';
import { deliveryApi, driverApi, type UploadAsset } from '../../services/api';
import { STATUS_PROGRESS, money } from '../../utils/format';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';
import WonaMap from '../../components/WonaMap';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurCourseActive'>;

const NEXT_STEP: Partial<
  Record<DeliveryStatus, { status: DeliveryStatus; label: string; icon: string }>
> = {
  acceptee: { status: 'en_route_retrait', label: 'Je pars vers le retrait', icon: 'navigation-variant-outline' },
  en_route_retrait: { status: 'arrive_retrait', label: 'Je suis arrivé au retrait', icon: 'map-marker-check-outline' },
  arrive_retrait: { status: 'colis_recupere', label: 'Colis récupéré', icon: 'package-variant-closed-check' },
  colis_recupere: { status: 'en_livraison', label: 'Commencer la livraison', icon: 'moped' },
};

export default function LivreurCourseActiveScreen({ navigation, route }: Props) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [pin, setPin] = useState('');
  const [incident, setIncident] = useState('');
  const [proof, setProof] = useState<UploadAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const value = await deliveryApi.get(route.params.courseId);
    setDelivery(value);
    if (value.statut === 'livree') {
      navigation.replace('LivreurResumeFinCourse', { courseId: value.id });
    }
  }, [navigation, route.params.courseId]);

  useFocusEffect(
    useCallback(() => {
      load().catch((error) =>
        Alert.alert('Course indisponible', error instanceof Error ? error.message : 'Réessayez.'),
      );
      const interval = setInterval(() => load().catch(() => {}), 10000);
      let subscription: LocationSubscription | undefined;
      Location.requestForegroundPermissionsAsync()
        .then((permission) => {
          if (permission.status !== 'granted') return;
          return Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 50,
              timeInterval: 20000,
            },
            (location) => {
              driverApi
                .updatePosition(location.coords.latitude, location.coords.longitude)
                .catch(() => {});
            },
          );
        })
        .then((value) => {
          subscription = value;
        })
        .catch(() => {});
      return () => {
        clearInterval(interval);
        subscription?.remove();
      };
    }, [load]),
  );

  const points = useMemo(() => {
    if (!delivery) return [];
    return [
      delivery.depart_latitude && delivery.depart_longitude
        ? {
            latitude: Number(delivery.depart_latitude),
            longitude: Number(delivery.depart_longitude),
            title: 'Retrait',
            description: delivery.adresse_depart,
            color: colors.primary,
          }
        : null,
      delivery.arrivee_latitude && delivery.arrivee_longitude
        ? {
            latitude: Number(delivery.arrivee_latitude),
            longitude: Number(delivery.arrivee_longitude),
            title: 'Destination',
            description: delivery.adresse_arrivee,
            color: colors.primaryDark,
          }
        : null,
    ].filter((point): point is NonNullable<typeof point> => Boolean(point));
  }, [delivery]);

  const transition = async (status: DeliveryStatus, commentaire = '') => {
    setLoading(true);
    try {
      const updated = await deliveryApi.transition(delivery!.id, status, commentaire);
      setDelivery(updated);
    } catch (error) {
      Alert.alert('Étape impossible', error instanceof Error ? error.message : 'Actualisez la course.');
    } finally {
      setLoading(false);
    }
  };

  const takeProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.75,
    });
    if (!result.canceled) {
      const image = result.assets[0];
      setProof({
        uri: image.uri,
        name: image.fileName || 'preuve-livraison.jpg',
        type: image.mimeType || 'image/jpeg',
      });
    }
  };

  const confirmDelivery = async () => {
    if (pin.length !== 4) {
      Alert.alert('PIN incomplet', 'Demandez les 4 chiffres au destinataire.');
      return;
    }
    setLoading(true);
    try {
      const updated = await deliveryApi.confirmDelivery(delivery!.id, pin, proof);
      setDelivery(updated);
      navigation.replace('LivreurResumeFinCourse', { courseId: updated.id });
    } catch (error) {
      Alert.alert('Livraison non confirmée', error instanceof Error ? error.message : 'PIN incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = () => {
    if (!delivery) return;
    navigation.navigate('LivreurNavigation', { courseId: delivery.id });
  };

  if (!delivery) {
    return (
      <View style={styles.container}>
        <TopBar title="Course active" showBack={false} />
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  const next = NEXT_STEP[delivery.statut];
  const waitingHandoff =
    delivery.statut === 'arrive_retrait' && !delivery.remise_confirmee_par_vendeur;

  return (
    <View style={styles.container}>
      <TopBar
        title={delivery.reference}
        showBack={false}
        rightIcon="refresh"
        onRightPress={() => load().catch(() => {})}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <WonaMap points={points} style={styles.map} showRoute={false} />
        <Button label="Démarrer l’itinéraire" icon="navigation" variant="secondary" onPress={openNavigation} />
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <Text style={styles.status}>{delivery.statut_label}</Text>
            <Text style={styles.progressText}>{Math.round(STATUS_PROGRESS[delivery.statut] * 100)} %</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progress, { width: `${STATUS_PROGRESS[delivery.statut] * 100}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Detail icon="store-marker-outline" label="Vendeur" value={delivery.vendeur_detail.nom} />
          <Detail icon="map-marker" label="Retrait" value={delivery.adresse_depart} />
          <Detail icon="account-outline" label="Destinataire" value={delivery.destinataire_nom} />
          <Detail icon="map-marker-check" label="Livraison" value={delivery.adresse_arrivee} />
          <Detail icon="package-variant" label="Colis" value={delivery.description_colis} />
        </View>

        <View style={styles.contactRow}>
          <ContactButton
            icon="phone"
            label="Vendeur"
            disabled={!delivery.vendeur_detail.telephone}
            onPress={() => Linking.openURL(`tel:${delivery.vendeur_detail.telephone}`).catch(() => {})}
          />
          <ContactButton
            icon="phone"
            label="Destinataire"
            disabled={!delivery.destinataire_telephone}
            onPress={() => Linking.openURL(`tel:${delivery.destinataire_telephone}`).catch(() => {})}
          />
          <ContactButton
            icon="chat-outline"
            label="Message"
            onPress={() => navigation.navigate('CourseMessages', { courseId: delivery.id })}
          />
        </View>

        <View style={styles.moneyCard}>
          <View>
            <Text style={styles.moneyLabel}>Votre course</Text>
            <Text style={styles.moneyValue}>{money(delivery.prix_livraison)}</Text>
          </View>
          <View style={styles.moneyDivider} />
          <View>
            <Text style={styles.moneyLabel}>À encaisser</Text>
            <Text style={styles.moneyValue}>{money(delivery.montant_a_recuperer)}</Text>
          </View>
        </View>

        {waitingHandoff ? (
          <View style={styles.waiting}>
            <MaterialCommunityIcons name="timer-sand" size={22} color={colors.primary} />
            <Text style={styles.waitingText}>
              Attendez que le vendeur confirme la remise du colis, puis actualisez.
            </Text>
          </View>
        ) : next ? (
          <Button
            label={next.label}
            icon={next.icon as never}
            loading={loading}
            onPress={() => transition(next.status)}
          />
        ) : null}

        {delivery.statut === 'en_livraison' ? (
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Code remis par le destinataire</Text>
            <Text style={styles.pinHelp}>
              Le destinataire n’a pas besoin de l’application Wona. Après lui avoir remis le
              colis, demandez le PIN que le vendeur lui a envoyé, puis saisissez-le ici.
            </Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={colors.outline}
              secureTextEntry
            />
            <Button
              label={proof ? 'Photo de preuve ajoutée' : 'Ajouter une photo de preuve'}
              icon={proof ? 'check-circle' : 'camera-outline'}
              variant="secondary"
              onPress={takeProof}
            />
            <Button label="Confirmer la livraison" icon="check-decagram" onPress={confirmDelivery} loading={loading} />
          </View>
        ) : null}

        {['colis_recupere', 'en_livraison'].includes(delivery.statut) ? (
          <View style={styles.incidentCard}>
            <Text style={styles.incidentTitle}>Incident après récupération</Text>
            <TextInput
              style={styles.incidentInput}
              value={incident}
              onChangeText={setIncident}
              placeholder="Expliquez l’échec ou le problème"
              placeholderTextColor={colors.outline}
              multiline
            />
            <Button
              label="Déclarer un échec"
              variant="danger"
              disabled={incident.trim().length < 3}
              onPress={() =>
                Alert.alert('Déclarer l’échec ?', 'L’administration et le vendeur seront informés.', [
                  { text: 'Retour', style: 'cancel' },
                  {
                    text: 'Déclarer',
                    style: 'destructive',
                    onPress: () => transition('echec', incident.trim()),
                  },
                ])
              }
            />
          </View>
        ) : null}

        {delivery.peut_annuler ? (
          <View style={styles.incidentCard}>
            <Text style={styles.incidentTitle}>Annuler avant récupération</Text>
            <TextInput
              style={styles.incidentInput}
              value={incident}
              onChangeText={setIncident}
              placeholder="Motif obligatoire"
              placeholderTextColor={colors.outline}
            />
            <Button
              label="Annuler la course"
              variant="danger"
              disabled={incident.trim().length < 3}
              onPress={() =>
                deliveryApi
                  .cancel(delivery.id, incident.trim())
                  .then((value) => {
                    setDelivery(value);
                    navigation.popTo('LivreurTabs');
                  })
                  .catch((error) =>
                    Alert.alert('Annulation impossible', error instanceof Error ? error.message : 'Réessayez.'),
                  )
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <MaterialCommunityIcons name={icon as never} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ContactButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.contact, disabled && { opacity: 0.4 }]} disabled={disabled} onPress={onPress}>
      <MaterialCommunityIcons name={icon as never} size={20} color={colors.primary} />
      <Text style={styles.contactText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.container, gap: spacing.md, paddingBottom: 52 },
  loading: { textAlign: 'center', marginTop: 60, color: colors.textSecondary },
  map: { height: 230, borderRadius: radii.lg, overflow: 'hidden' },
  statusCard: { backgroundColor: colors.surfaceLow, padding: spacing.md, borderRadius: radii.lg },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  status: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  progressText: { fontSize: 11, color: colors.textSecondary },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  progress: { height: 8, backgroundColor: colors.primary },
  card: { backgroundColor: colors.surfaceLow, padding: spacing.md, borderRadius: radii.lg, gap: spacing.sm },
  detail: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  detailLabel: { fontSize: 9, color: colors.textSecondary },
  detailValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  contactRow: { flexDirection: 'row', gap: spacing.xs },
  contact: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  contactText: { fontSize: 10, color: colors.primary, fontWeight: '700', marginTop: 3 },
  moneyCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.tertiaryBg,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  moneyLabel: { fontSize: 10, color: colors.textSecondary },
  moneyValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  moneyDivider: { width: 1, height: 36, backgroundColor: 'rgba(0,100,148,.2)' },
  waiting: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radii.lg },
  waitingText: { flex: 1, fontSize: 12, color: colors.primaryDark },
  pinCard: { padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceLow, gap: spacing.sm },
  pinTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  pinHelp: { fontSize: 11, color: colors.textSecondary },
  pinInput: {
    height: 64,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 10,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  incidentCard: { borderWidth: 1, borderColor: colors.errorBg, padding: spacing.md, borderRadius: radii.lg, gap: spacing.sm },
  incidentTitle: { fontSize: 13, fontWeight: '700', color: colors.error },
  incidentInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    color: colors.textPrimary,
  },
});
