import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import type { DriverProfile } from '../../types/api';
import { driverApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDeliveries } from '../../context/DeliveryContext';
import { colors, radii, spacing } from '../../theme';

export default function LivreurProfilScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { clear } = useDeliveries();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await driverApi.profile());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const signOut = async () => {
    clear();
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Text style={styles.brand}>WONA</Text>
        <Pressable onPress={() => navigation.navigate('Notifications')}>
          <MaterialCommunityIcons name="bell-outline" size={23} color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={52} color={colors.primary} />
          </View>
          <Text style={styles.name}>{profile?.nom || 'Livreur Wona'}</Text>
          <Text style={styles.phone}>{profile?.telephone}</Text>
          <View style={styles.verified}>
            <MaterialCommunityIcons name="shield-check" size={16} color={colors.success} />
            <Text style={styles.verifiedText}>Compte validé</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.note_moyenne || '0'}</Text>
            <Text style={styles.statLabel}>NOTE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.nombre_avis || 0}</Text>
            <Text style={styles.statLabel}>AVIS</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.documents.filter((doc) => doc.statut === 'valide').length || 0}</Text>
            <Text style={styles.statLabel}>DOCUMENTS</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Line icon="map-marker-outline" label="Ville" value={profile?.ville || '—'} />
          <Line icon="moped" label="Transport" value={profile?.moyen_transport || '—'} />
          <Line icon="card-text-outline" label="Immatriculation" value={profile?.immatriculation_moto || 'Non renseignée'} />
          <Line icon="circle-slice-8" label="Disponibilité" value={profile?.statut_disponibilite || '—'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Documents</Text>
          {profile?.documents.map((document) => (
            <Line
              key={document.id}
              icon={document.statut === 'valide' ? 'check-circle-outline' : 'clock-outline'}
              label={document.type_label}
              value={document.statut}
            />
          ))}
        </View>

        <Pressable style={styles.logout} onPress={signOut}>
          <MaterialCommunityIcons name="logout" size={21} color={colors.error} />
          <Text style={styles.logoutText}>Déconnexion sécurisée</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Line({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.line}>
      <MaterialCommunityIcons name={icon as never} size={20} color={colors.primary} />
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
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
  },
  brand: { fontSize: 18, fontWeight: '700', color: colors.primary },
  content: { padding: spacing.container, gap: spacing.md, paddingBottom: 48 },
  profile: { alignItems: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm },
  phone: { fontSize: 12, color: colors.textSecondary },
  verified: { flexDirection: 'row', gap: 4, marginTop: 4, alignItems: 'center' },
  verifiedText: { fontSize: 11, color: colors.success, fontWeight: '700' },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 8, color: colors.textSecondary },
  divider: { width: 1, height: 32, backgroundColor: colors.outlineLight },
  card: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.outlineLight, gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  lineLabel: { flex: 1, fontSize: 12, color: colors.textSecondary },
  lineValue: { fontSize: 11, color: colors.textPrimary, fontWeight: '600', textTransform: 'capitalize' },
  logout: {
    height: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.errorBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  logoutText: { color: colors.error, fontWeight: '700' },
});

