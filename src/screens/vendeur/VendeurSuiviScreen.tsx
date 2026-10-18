import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery } from '../../types/api';
import { deliveryApi } from '../../services/api';
import { deliveryPinStorage } from '../../services/storage';
import { STATUS_PROGRESS, TERMINAL_STATUSES, dateTime, money } from '../../utils/format';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';
import WonaMap from '../../components/WonaMap';

type Props = NativeStackScreenProps<RootStackParamList, 'VendeurSuivi'>;

export default function VendeurSuiviScreen({ navigation, route }: Props) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const value = await deliveryApi.get(route.params.courseId);
    setDelivery(value);
  }, [route.params.courseId]);

  useEffect(() => {
    load().catch((error) =>
      Alert.alert('Suivi indisponible', error instanceof Error ? error.message : 'Réessayez.'),
    );
    deliveryPinStorage.get(route.params.courseId).then(setPin);
    const interval = setInterval(() => load().catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, [load, route.params.courseId]);

  const points = useMemo(() => {
    if (!delivery) return [];
    const result = [];
    if (delivery.depart_latitude && delivery.depart_longitude) {
      result.push({
        latitude: Number(delivery.depart_latitude),
        longitude: Number(delivery.depart_longitude),
        title: 'Retrait',
        description: delivery.adresse_depart,
        color: colors.primary,
      });
    }
    if (delivery.arrivee_latitude && delivery.arrivee_longitude) {
      result.push({
        latitude: Number(delivery.arrivee_latitude),
        longitude: Number(delivery.arrivee_longitude),
        title: 'Destination',
        description: delivery.adresse_arrivee,
        color: colors.primaryDark,
      });
    }
    const driver = delivery.livreur_detail;
    if (driver?.derniere_position_lat && driver.derniere_position_lng) {
      result.push({
        latitude: Number(driver.derniere_position_lat),
        longitude: Number(driver.derniere_position_lng),
        title: driver.nom || 'Livreur',
        color: colors.tertiary,
      });
    }
    return result;
  }, [delivery]);

  const execute = async (action: () => Promise<Delivery>, success?: string) => {
    setLoading(true);
    try {
      const value = await action();
      setDelivery(value);
      if (success) Alert.alert('Terminé', success);
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const regeneratePin = async () => {
    setLoading(true);
    try {
      const response = await deliveryApi.regeneratePin(route.params.courseId);
      await deliveryPinStorage.set(route.params.courseId, response.code_pin_livraison);
      setPin(response.code_pin_livraison);
      Alert.alert('Nouveau PIN', `Le nouveau code de remise est ${response.code_pin_livraison}.`);
    } catch (error) {
      Alert.alert('PIN non régénéré', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const sharePin = async () => {
    if (!pin || !delivery) {
      Alert.alert(
        'PIN indisponible',
        'Ce PIN n’est plus enregistré sur ce téléphone. Générez-en un nouveau avant de le partager.',
      );
      return;
    }
    try {
      await Share.share({
        title: `Code de réception ${delivery.reference}`,
        message:
          `Bonjour ${delivery.destinataire_nom},\n\n` +
          `Votre code de réception Wona pour la livraison ${delivery.reference} est : ${pin}\n\n` +
          'Donnez ce code au livreur uniquement après avoir reçu et vérifié votre colis. ' +
          "Vous n’avez pas besoin d’installer l’application Wona.",
      });
    } catch {
      Alert.alert('Partage interrompu', 'Le PIN n’a pas été partagé.');
    }
  };

  if (!delivery) {
    return (
      <View style={styles.container}>
        <TopBar title="Suivi" onBack={() => navigation.goBack()} />
        <Text style={styles.loading}>Chargement de la course…</Text>
      </View>
    );
  }

  const driver = delivery.livreur_detail;
  const canCancel = delivery.peut_annuler && motif.trim().length >= 3;
  const ended = TERMINAL_STATUSES.includes(delivery.statut);

  return (
    <View style={styles.container}>
      <TopBar
        title={delivery.reference}
        onBack={() => navigation.goBack()}
        rightIcon="refresh"
        onRightPress={() => load().catch(() => {})}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <WonaMap points={points} style={styles.map} />
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <Text style={styles.statusLabel}>{delivery.statut_label}</Text>
            <Text style={styles.statusDate}>{dateTime(delivery.date_creation)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progress, { width: `${STATUS_PROGRESS[delivery.statut] * 100}%` }]} />
          </View>
          <Text style={styles.routeText}>{delivery.adresse_depart}</Text>
          <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.outline} />
          <Text style={styles.routeText}>{delivery.adresse_arrivee}</Text>
        </View>

        {driver ? (
          <View style={styles.driverCard}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={28} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driver.nom || 'Livreur Wona'}</Text>
              <Text style={styles.driverMeta}>
                ★ {driver.note_moyenne} · {driver.moyen_transport}
              </Text>
            </View>
            <Pressable
              style={styles.iconButton}
              onPress={() => navigation.navigate('CourseMessages', { courseId: delivery.id })}
            >
              <MaterialCommunityIcons name="chat-outline" size={20} color={colors.primary} />
            </Pressable>
            <Pressable
              style={[styles.iconButton, { backgroundColor: colors.primary }]}
              onPress={() => Linking.openURL(`tel:${driver.telephone}`).catch(() => {})}
            >
              <MaterialCommunityIcons name="phone" size={20} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.waiting}>
            <MaterialCommunityIcons name="radar" size={24} color={colors.primary} />
            <Text style={styles.waitingText}>La demande est visible par les livreurs validés.</Text>
          </View>
        )}

        <View style={styles.moneyCard}>
          <View>
            <Text style={styles.moneyLabel}>Prix de livraison</Text>
            <Text style={styles.moneyValue}>{money(delivery.prix_livraison)}</Text>
          </View>
          <View style={styles.moneyDivider} />
          <View>
            <Text style={styles.moneyLabel}>À récupérer</Text>
            <Text style={styles.moneyValue}>{money(delivery.montant_a_recuperer)}</Text>
          </View>
        </View>

        {!ended ? (
          <View style={styles.pinCard}>
            <View style={styles.pinHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pinLabel}>PIN RÉSERVÉ AU DESTINATAIRE</Text>
                <Text style={styles.pinValue}>{pin || `••${delivery.code_pin_apercu}`}</Text>
              </View>
              <View style={styles.pinActions}>
                <Pressable
                  style={[styles.pinAction, !pin && styles.pinActionDisabled]}
                  disabled={!pin}
                  onPress={() => void sharePin()}
                  accessibilityLabel="Partager le PIN au destinataire"
                >
                  <MaterialCommunityIcons name="share-variant" size={21} color={colors.white} />
                  <Text style={styles.pinActionText}>Partager</Text>
                </Pressable>
                <Pressable
                  style={styles.pinRegenerate}
                  onPress={regeneratePin}
                  accessibilityLabel="Générer un nouveau PIN"
                >
                  <MaterialCommunityIcons name="refresh" size={22} color={colors.primary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.pinNotice}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.pinHelp}>
                Envoyez ce code au destinataire par WhatsApp, SMS ou tout autre réseau. Il
                n’a pas besoin de Wona et ne doit donner le PIN au livreur qu’après la remise.
              </Text>
            </View>
            {!pin ? (
              <Pressable style={styles.missingPin} onPress={regeneratePin}>
                <Text style={styles.missingPinText}>Générer un nouveau PIN complet</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {delivery.statut === 'arrive_retrait' && !delivery.remise_confirmee_par_vendeur ? (
          <Button
            label="Confirmer la remise au livreur"
            icon="package-variant-closed-check"
            loading={loading}
            onPress={() =>
              execute(
                () => deliveryApi.confirmHandoff(delivery.id),
                'Le livreur peut maintenant déclarer le colis récupéré.',
              )
            }
          />
        ) : null}

        {delivery.statut === 'livree' ? (
          <Button
            label="Noter le livreur"
            icon="star-outline"
            onPress={() =>
              navigation.navigate('VendeurConfirmationNotation', { courseId: delivery.id })
            }
          />
        ) : null}

        {delivery.peut_annuler ? (
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Annuler avant la récupération</Text>
            <TextInput
              style={styles.reasonInput}
              value={motif}
              onChangeText={setMotif}
              placeholder="Motif obligatoire"
              placeholderTextColor={colors.outline}
            />
            <Button
              label="Annuler la course"
              variant="danger"
              disabled={!canCancel}
              loading={loading}
              onPress={() =>
                Alert.alert('Confirmer l’annulation', 'Cette action sera enregistrée.', [
                  { text: 'Retour', style: 'cancel' },
                  {
                    text: 'Annuler la course',
                    style: 'destructive',
                    onPress: () => execute(() => deliveryApi.cancel(delivery.id, motif)),
                  },
                ])
              }
            />
          </View>
        ) : null}

        {!ended ? (
          <Button
            label="Signaler un problème"
            variant="ghost"
            icon="alert-outline"
            onPress={() =>
              Alert.alert('Signaler cette course ?', 'Le dossier sera transmis à l’administration.', [
                { text: 'Retour', style: 'cancel' },
                {
                  text: 'Signaler',
                  style: 'destructive',
                  onPress: () =>
                    deliveryApi
                      .report(
                        delivery.id,
                        'autre',
                        motif.trim() || 'Problème signalé depuis l’application vendeur.',
                      )
                      .then(load)
                      .catch((error) =>
                        Alert.alert('Signalement impossible', error instanceof Error ? error.message : 'Réessayez.'),
                      ),
                },
              ])
            }
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.container, paddingBottom: 48, gap: spacing.md },
  loading: { textAlign: 'center', marginTop: 60, color: colors.textSecondary },
  map: { height: 230, borderRadius: radii.lg, overflow: 'hidden' },
  statusCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  statusDate: { color: colors.textSecondary, fontSize: 10 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  progress: { height: 8, backgroundColor: colors.primary },
  routeText: { fontSize: 12, color: colors.textPrimary },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  driverMeta: { fontSize: 11, color: colors.textSecondary },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  waitingText: { flex: 1, fontSize: 12, color: colors.primaryDark },
  moneyCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.tertiaryBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  moneyDivider: { height: 36, width: 1, backgroundColor: 'rgba(0,100,148,.2)' },
  moneyLabel: { fontSize: 10, color: colors.textSecondary },
  moneyValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  pinCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,121,30,0.22)',
  },
  pinHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pinLabel: { fontSize: 10, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.5 },
  pinValue: { fontSize: 30, fontWeight: '800', letterSpacing: 7, color: colors.primary },
  pinActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pinAction: {
    minHeight: 43,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pinActionDisabled: { opacity: 0.4 },
  pinActionText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  pinRegenerate: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  pinNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  pinHelp: { flex: 1, fontSize: 10, lineHeight: 15, color: colors.textSecondary },
  missingPin: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
  },
  missingPinText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  dangerCard: {
    borderWidth: 1,
    borderColor: colors.errorBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dangerTitle: { fontSize: 13, fontWeight: '700', color: colors.error },
  reasonInput: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
});
