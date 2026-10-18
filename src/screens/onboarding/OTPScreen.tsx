import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OTP'>;

export default function OTPScreen({ navigation, route }: Props) {
  const { requestOtp, verifyOtp } = useAuth();
  const { role, phone } = route.params;
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [seconds, setSeconds] = useState(59);
  const [loading, setLoading] = useState(false);
  const [developmentCode, setDevelopmentCode] = useState(route.params.developmentCode);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const setDigit = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => current.map((item, position) => (position === index ? digit : item)));
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (digit && index === 5) Keyboard.dismiss();
  };

  const verify = async () => {
    const code = digits.join('');
    if (code.length !== 6 || loading) return;
    setLoading(true);
    try {
      await verifyOtp(phone, role, code);
    } catch (error) {
      Alert.alert('Code refusé', error instanceof Error ? error.message : 'Code invalide.');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (seconds) return;
    try {
      setDevelopmentCode(await requestOtp(phone, role));
      setSeconds(59);
      setDigits(['', '', '', '', '', '']);
    } catch (error) {
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Réessayez.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TopBar showBack onBack={() => navigation.goBack()} showBrand />
      <View style={styles.content}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="message-lock-outline" size={44} color={colors.primary} />
        </View>
        <Text style={styles.title}>Vérifiez votre code</Text>
        <Text style={styles.subtitle}>
          Code envoyé au <Text style={styles.strong}>+228 {phone}</Text>. Il expire dans 5
          minutes.
        </Text>
        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : undefined]}
              value={digit}
              onChangeText={(value) => setDigit(value, index)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                  inputs.current[index - 1]?.focus();
                }
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={1}
            />
          ))}
        </View>
        <Pressable disabled={seconds > 0} onPress={resend}>
          <Text style={[styles.resend, seconds > 0 && styles.disabled]}>
            {seconds ? `Renvoyer dans ${seconds} s` : 'Renvoyer le code'}
          </Text>
        </Pressable>
        {developmentCode ? (
          <Text style={styles.devCode}>Code local de développement : {developmentCode}</Text>
        ) : null}
        <Button
          label="Vérifier"
          icon="arrow-right"
          onPress={verify}
          disabled={digits.some((digit) => !digit)}
          loading={loading}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.container, alignItems: 'center', paddingTop: 52 },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.lg },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  strong: { color: colors.textPrimary, fontWeight: '700' },
  otpRow: { flexDirection: 'row', gap: 8, marginTop: spacing.xl },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    backgroundColor: colors.surfaceLow,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  otpBoxFilled: { borderColor: colors.primary },
  resend: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: spacing.lg },
  disabled: { opacity: 0.45 },
  devCode: { color: colors.tertiary, fontSize: 12, marginTop: spacing.md },
});

