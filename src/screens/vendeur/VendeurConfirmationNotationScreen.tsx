import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { deliveryApi } from '../../services/api';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'VendeurConfirmationNotation'>;

export default function VendeurConfirmationNotationScreen({ navigation, route }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await deliveryApi.rate(route.params.courseId, rating, comment.trim());
      Alert.alert('Merci !', 'Votre avis a été enregistré.');
      navigation.popTo('VendeurTabs');
    } catch (error) {
      Alert.alert('Avis non enregistré', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Noter le livreur" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="check-decagram" size={62} color={colors.success} />
        </View>
        <Text style={styles.title}>Livraison terminée</Text>
        <Text style={styles.subtitle}>Comment s’est passée votre livraison ?</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => setRating(value)}>
              <MaterialCommunityIcons
                name={value <= rating ? 'star' : 'star-outline'}
                size={42}
                color={colors.primary}
              />
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.comment}
          value={comment}
          onChangeText={setComment}
          placeholder="Un commentaire facultatif…"
          placeholderTextColor={colors.outline}
          multiline
          maxLength={1000}
        />
        <Button label="Envoyer mon avis" onPress={submit} loading={loading} />
        <Button label="Plus tard" variant="ghost" onPress={() => navigation.popTo('VendeurTabs')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', padding: spacing.container, paddingTop: 52, gap: spacing.md },
  icon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  stars: { flexDirection: 'row', gap: 4, marginVertical: spacing.md },
  comment: {
    width: '100%',
    minHeight: 110,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    padding: spacing.md,
    textAlignVertical: 'top',
    color: colors.textPrimary,
  },
});

