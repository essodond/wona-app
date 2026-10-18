import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Connexion'>;

const formatPhone = (value: string) => value.replace(/(\d{2})(?=\d)/g, '$1 ').trim();

export default function ConnexionScreen({ navigation, route }: Props) {
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const isValid = phone.length === 8;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      const developmentCode = await requestOtp(phone, route.params.role);
      navigation.navigate('OTP', {
        role: route.params.role,
        phone,
        developmentCode,
      });
    } catch (error) {
      Alert.alert('Code non envoyé', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TopBar showBack onBack={() => navigation.goBack()} showBrand />
      <View style={styles.content}>
        <Image
          source={require('../../../assets/onboarding/welcome-wona.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel="Un livreur Wona et une cliente accueillent les nouveaux utilisateurs"
        />
        <Text style={styles.title}>Bienvenue sur Wona</Text>
        <Text style={styles.subtitle}>
          Entrez votre numéro togolais pour vous connecter ou créer un compte.
        </Text>
        <Text style={styles.label}>Numéro de téléphone</Text>
        <View style={styles.inputRow}>
          <Text style={styles.prefix}>🇹🇬 +228</Text>
          <View style={styles.divider} />
          <TextInput
            style={styles.input}
            placeholder="90 00 00 00"
            placeholderTextColor={colors.outline}
            keyboardType="number-pad"
            maxLength={11}
            value={formatPhone(phone)}
            onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 8))}
            textContentType="telephoneNumber"
          />
        </View>
        <Button
          label="Recevoir le code"
          icon="chevron-right"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
        <Text style={styles.legal}>
          En continuant, vous acceptez les conditions d’utilisation et la politique de
          confidentialité de Wona.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.container, justifyContent: 'center' },
  heroImage: {
    height: 130,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  prefix: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  divider: { width: 1, height: 28, backgroundColor: colors.outlineLight, margin: spacing.sm },
  input: { flex: 1, height: 56, fontSize: 17, color: colors.textPrimary },
  legal: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
