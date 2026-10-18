import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import { onboardingSteps } from '../../data/mockData';
import ProgressDots from '../../components/ProgressDots';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const goToChoixProfil = () => navigation.replace('ChoixProfil');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== index) setIndex(newIndex);
  };

  const handleNext = () => {
    if (index < onboardingSteps.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    } else {
      goToChoixProfil();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>WONA</Text>
        <Pressable onPress={goToChoixProfil} hitSlop={10}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {onboardingSteps.map((step) => (
          <View key={step.id} style={[styles.slide, { width }]}>
            <View style={styles.photoFrame}>
              <Image
                source={step.image}
                style={styles.photo}
                resizeMode="cover"
                accessibilityLabel={step.imageLabel}
              />
            </View>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.text}>{step.text}</Text>
          </View>
        ))}
      </ScrollView>

      <ProgressDots count={onboardingSteps.length} activeIndex={index} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={index === onboardingSteps.length - 1 ? 'Commencer' : 'Suivant'}
          icon="arrow-right"
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.container,
    paddingVertical: spacing.md,
  },
  brand: { fontSize: 20, fontWeight: '700', color: colors.primary },
  skip: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.container,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 280,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  photo: { width: '100%', height: '100%' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: { paddingHorizontal: spacing.container, paddingTop: spacing.md },
});
