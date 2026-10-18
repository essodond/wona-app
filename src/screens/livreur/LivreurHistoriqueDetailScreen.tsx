import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery } from '../../types/api';
import { useDeliveries } from '../../context/DeliveryContext';
import { dateTime, money } from '../../utils/format';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurHistoriqueDetail'>;

const PAYMENT_LABELS: Record<Delivery['methode_paiement'], string> = {
  especes: 'Espèces',
  tmoney: 'TMoney',
  flooz: 'Flooz',
  direct: 'Paiement direct',
};

export default function LivreurHistoriqueDetailScreen({ navigation, route }: Props) {
  const { getDelivery } = useDeliveries();
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  const load = useCallback(async () => {
    const value = await getDelivery(route.params.courseId);
    setDelivery(value);
  }, [getDelivery, route.params.courseId]);

  useFocusEffect(
    useCallback(() => {
      load().catch((error) =>
        Alert.alert(
          'Détail indisponible',
          error instanceof Error ? error.message : 'Réessayez.',
        ),
      );
    }, [load]),
  );

  if (!delivery) {
    return (
      <View style={styles.container}>
        <TopBar title="Détail de la course" onBack={() => navigation.goBack()} />
        <Text style={styles.loading}>Chargement de la livraison…</Text>
      </View>
    );
  }

  const success = delivery.statut === 'livree';
  const deliveryPayment = delivery.paiements.find((item) => item.type === 'livraison');
  const commission = delivery.paiements.find((item) => item.type === 'commission');

  return (
    <View style={styles.container}>
      <TopBar title={delivery.reference} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, !success && styles.statusCardWarning]}>
          <View style={[styles.statusIcon, !success && styles.statusIconWarning]}>
            <MaterialCommunityIcons
              name={success ? 'check-decagram' : 'alert-circle-outline'}
              size={30}
              color={success ? colors.success : colors.error}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusEyebrow}>STATUT FINAL</Text>
            <Text style={[styles.statusTitle, !success && styles.statusTitleWarning]}>
              {delivery.statut_label}
            </Text>
            <Text style={styles.statusDate}>
              {dateTime(
                delivery.historique_statuts.at(-1)?.date_creation ||
                  delivery.livree_le ||
                  delivery.date_creation,
              )}
            </Text>
          </View>
        </View>

        <Section title="Trajet" icon="map-marker-path">
          <View style={styles.routeRow}>
            <View style={styles.routeRail}>
              <View style={styles.routeDotStart} />
              <View style={styles.routeLine} />
              <View style={styles.routeDotEnd} />
            </View>
            <View style={styles.routeContent}>
              <View>
                <Text style={styles.detailLabel}>RETRAIT</Text>
                <Text style={styles.routeAddress}>{delivery.adresse_depart}</Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>LIVRAISON</Text>
                <Text style={styles.routeAddress}>{delivery.adresse_arrivee}</Text>
              </View>
            </View>
          </View>
        </Section>

        <Section title="Personnes" icon="account-group-outline">
          <DetailRow
            icon="storefront-outline"
            label="Vendeur"
            value={delivery.vendeur_detail.nom}
          />
          <DetailRow
            icon="account-outline"
            label="Destinataire"
            value={delivery.destinataire_nom}
          />
          {delivery.destinataire_telephone ? (
            <DetailRow
              icon="phone-outline"
              label="Téléphone du destinataire"
              value={delivery.destinataire_telephone}
            />
          ) : null}
        </Section>

        <Section title="Colis" icon="package-variant-closed">
          <DetailRow
            icon="package-variant"
            label="Description"
            value={delivery.description_colis}
          />
          <DetailRow
            icon="resize"
            label="Taille"
            value={delivery.taille_colis.replace('_', ' ')}
          />
          {delivery.instructions ? (
            <DetailRow
              icon="text-box-outline"
              label="Instructions"
              value={delivery.instructions}
            />
          ) : null}
        </Section>

        <Section title="Paiement" icon="cash-multiple">
          <View style={styles.moneyGrid}>
            <MoneyBox label="Prix de la course" value={money(delivery.prix_livraison)} />
            <MoneyBox
              label="Montant récupéré"
              value={money(delivery.montant_a_recuperer)}
            />
          </View>
          <DetailRow
            icon="credit-card-outline"
            label="Mode de paiement"
            value={PAYMENT_LABELS[delivery.methode_paiement]}
          />
          <DetailRow
            icon="check-circle-outline"
            label="Paiement de la course"
            value={deliveryPayment?.statut || 'Non renseigné'}
          />
          {commission ? (
            <DetailRow
              icon="percent-outline"
              label="Commission suivie"
              value={money(commission.montant)}
            />
          ) : null}
        </Section>

        <Section title="Chronologie" icon="timeline-clock-outline">
          {delivery.historique_statuts.map((entry, index) => (
            <View key={entry.id} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View
                  style={[
                    styles.timelineDot,
                    index === delivery.historique_statuts.length - 1 &&
                      styles.timelineDotCurrent,
                  ]}
                />
                {index < delivery.historique_statuts.length - 1 ? (
                  <View style={styles.timelineLine} />
                ) : null}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{entry.libelle}</Text>
                <Text style={styles.timelineDate}>{dateTime(entry.date_creation)}</Text>
                {entry.commentaire ? (
                  <Text style={styles.timelineComment}>{entry.commentaire}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: React.PropsWithChildren<{ title: string; icon: string }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon as never} size={21} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialCommunityIcons name={icon as never} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function MoneyBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.moneyBox}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={styles.moneyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.container, paddingBottom: 48, gap: spacing.md },
  loading: { textAlign: 'center', marginTop: 60, color: colors.textSecondary },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.xl,
    padding: spacing.md,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.16)',
  },
  statusCardWarning: {
    backgroundColor: colors.errorBg,
    borderColor: 'rgba(186,26,26,0.15)',
  },
  statusIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,125,50,0.11)',
  },
  statusIconWarning: { backgroundColor: 'rgba(186,26,26,0.09)' },
  statusEyebrow: { fontSize: 9, fontWeight: '800', color: colors.textSecondary },
  statusTitle: { fontSize: 19, fontWeight: '800', color: colors.success },
  statusTitleWarning: { color: colors.error },
  statusDate: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  section: {
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  routeRow: { flexDirection: 'row', gap: spacing.sm },
  routeRail: { width: 18, alignItems: 'center', paddingVertical: 5 },
  routeDotStart: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  routeLine: { width: 2, flex: 1, minHeight: 44, backgroundColor: colors.primaryLight },
  routeDotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryDark,
  },
  routeContent: { flex: 1, justifyContent: 'space-between', gap: spacing.md },
  routeAddress: { fontSize: 12, lineHeight: 17, color: colors.textPrimary, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: 8, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.4 },
  detailValue: { fontSize: 12, lineHeight: 17, color: colors.textPrimary, fontWeight: '600' },
  moneyGrid: { flexDirection: 'row', gap: spacing.xs },
  moneyBox: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  moneyLabel: { fontSize: 9, color: colors.textSecondary },
  moneyValue: { fontSize: 14, fontWeight: '800', color: colors.primary },
  timelineRow: { flexDirection: 'row', gap: spacing.sm, minHeight: 50 },
  timelineRail: { width: 18, alignItems: 'center' },
  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  timelineDotCurrent: { backgroundColor: colors.primary },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.primaryLight },
  timelineContent: { flex: 1, paddingBottom: spacing.xs },
  timelineTitle: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  timelineDate: { fontSize: 9, color: colors.textSecondary, marginTop: 1 },
  timelineComment: { fontSize: 10, lineHeight: 15, color: colors.textSecondary, marginTop: 3 },
});
