import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { DriverProfile } from '../../types/api';
import { driverApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing } from '../../theme';
import Button from '../../components/Button';
import TopBar from '../../components/TopBar';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurAttenteValidation'>;

export default function LivreurAttenteValidationScreen({ navigation }: Props) {
  const { refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const checkingRef = useRef(false);
  const openingRef = useRef(false);

  const check = useCallback(async (silent = false) => {
    if (checkingRef.current || openingRef.current) return;
    checkingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const value = await driverApi.profile();
      setProfile(value);
      if (value.statut_verification === 'valide') {
        openingRef.current = true;
        const current = await refreshUser();
        if (current?.validation_livreur === 'valide') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'LivreurTabs' }],
          });
        } else {
          openingRef.current = false;
        }
      }
    } finally {
      checkingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [navigation, refreshUser]);

  useFocusEffect(
    useCallback(() => {
      check(true).catch(() => {});
      const interval = setInterval(() => check(true).catch(() => {}), 3000);
      return () => clearInterval(interval);
    }, [check]),
  );

  const refused = profile?.statut_verification === 'refuse';
  const suspended = profile?.statut_verification === 'suspendu';

  return (
    <View style={styles.container}>
      <TopBar
        showBack={false}
        showBrand
        rightIcon="logout"
        onRightPress={() => logout().catch(() => {})}
      />
      <View style={styles.content}>
        <View style={[styles.icon, (refused || suspended) && styles.iconError]}>
          <MaterialCommunityIcons
            name={refused || suspended ? 'account-alert-outline' : 'shield-lock-outline'}
            size={62}
            color={refused || suspended ? colors.error : colors.primary}
          />
        </View>
        <Text style={styles.title}>
          {refused ? 'Dossier à corriger' : suspended ? 'Compte suspendu' : 'Validation en cours'}
        </Text>
        <Text style={styles.text}>
          {profile?.commentaire_verification ||
            (refused
              ? 'Un document a été refusé. Consultez votre dossier et envoyez une version conforme.'
              : suspended
                ? 'Contactez le support Wona pour connaître les prochaines étapes.'
                : 'L’administrateur Wona vérifie votre identité et votre véhicule. Vous recevrez une notification après sa décision.')}
        </Text>
        {!refused && !suspended ? (
          <View style={styles.timeline}>
            <Step done label="Dossier reçu" />
            <Step active label="Vérification administrateur" />
            <Step label="Activation du compte" />
          </View>
        ) : null}
        <Button
          label="Actualiser le statut"
          variant="secondary"
          onPress={() => check(false)}
          loading={loading}
        />
        {refused ? (
          <Button
            label="Corriger mon dossier"
            onPress={() => navigation.replace('LivreurInscriptionDocuments')}
          />
        ) : null}
      </View>
    </View>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <View style={styles.step}>
      <MaterialCommunityIcons
        name={done ? 'check-circle' : active ? 'progress-clock' : 'circle-outline'}
        size={22}
        color={done ? colors.success : active ? colors.primary : colors.outline}
      />
      <Text style={[styles.stepText, active && { fontWeight: '700', color: colors.primary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.container, justifyContent: 'center', gap: spacing.md },
  icon: {
    width: 128,
    height: 128,
    alignSelf: 'center',
    borderRadius: 64,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconError: { backgroundColor: colors.errorBg },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  text: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  timeline: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceLow,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginVertical: spacing.md,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepText: { fontSize: 13, color: colors.textSecondary },
});
