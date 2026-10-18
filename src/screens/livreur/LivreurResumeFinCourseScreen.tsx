import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery } from '../../types/api';
import { deliveryApi } from '../../services/api';
import { money } from '../../utils/format';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurResumeFinCourse'>;

export default function LivreurResumeFinCourseScreen({ navigation, route }: Props) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    deliveryApi.get(route.params.courseId).then(setDelivery).catch(() => {});
  }, [route.params.courseId]);

  const finish = async () => {
    setLoading(true);
    try {
      await deliveryApi.rate(route.params.courseId, rating, comment.trim());
      navigation.popTo('LivreurTabs');
    } catch (error) {
      Alert.alert('Avis non enregistré', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Course terminée" showBack={false} />
      <View style={styles.content}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="check-bold" size={58} color={colors.success} />
        </View>
        <Text style={styles.title}>Livraison confirmée</Text>
        <Text style={styles.subtitle}>{delivery?.reference}</Text>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Rémunération de la course</Text>
          <Text style={styles.amount}>{money(delivery?.prix_livraison)}</Text>
          <Text style={styles.amountHint}>Paiement suivi séparément de l’encaissement client.</Text>
        </View>
        <Text style={styles.question}>Noter le vendeur</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => setRating(value)}>
              <MaterialCommunityIcons
                name={value <= rating ? 'star' : 'star-outline'}
                size={38}
                color={colors.primary}
              />
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.comment}
          value={comment}
          onChangeText={setComment}
          placeholder="Commentaire facultatif"
          placeholderTextColor={colors.outline}
          multiline
        />
        <Button label="Envoyer et revenir à l’accueil" onPress={finish} loading={loading} />
        <Button label="Plus tard" variant="ghost" onPress={() => navigation.popTo('LivreurTabs')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', padding: spacing.container, gap: spacing.md },
  icon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary },
  amountCard: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  amountLabel: { fontSize: 10, color: 'rgba(255,255,255,.8)' },
  amount: { fontSize: 24, fontWeight: '700', color: colors.white },
  amountHint: { fontSize: 9, color: 'rgba(255,255,255,.75)' },
  question: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  stars: { flexDirection: 'row', gap: 4 },
  comment: {
    width: '100%',
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    textAlignVertical: 'top',
    color: colors.textPrimary,
  },
});

