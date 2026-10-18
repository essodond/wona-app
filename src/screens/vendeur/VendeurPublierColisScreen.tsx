import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery } from '../../types/api';
import { deliveryApi, type UploadAsset } from '../../services/api';
import { isCoordinateInTogo, resolveAddressCoordinate } from '../../services/locationResolver';
import type { RouteCoordinate } from '../../services/routing';
import { deliveryPinStorage } from '../../services/storage';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';
import AddressAutocompleteField from '../../components/AddressAutocompleteField';
import LocationPickerModal from '../../components/LocationPickerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'VendeurPublierColis'>;

const MAX_ADDRESS_LENGTH = 2048;

type FormState = {
  destinataire_nom: string;
  destinataire_telephone: string;
  adresse_depart: string;
  adresse_arrivee: string;
  description_colis: string;
  instructions: string;
  prix_livraison: string;
  montant_a_recuperer: string;
  taille_colis: Delivery['taille_colis'];
  methode_paiement: Delivery['methode_paiement'];
  urgence: Delivery['urgence'];
};

const initialForm: FormState = {
  destinataire_nom: '',
  destinataire_telephone: '',
  adresse_depart: '',
  adresse_arrivee: '',
  description_colis: '',
  instructions: '',
  prix_livraison: '',
  montant_a_recuperer: '0',
  taille_colis: 'petit',
  methode_paiement: 'especes',
  urgence: 'normale',
};

async function shareDeliveryPin(reference: string, recipientName: string, pin: string) {
  await Share.share({
    title: `Code de réception ${reference}`,
    message:
      `Bonjour ${recipientName},\n\n` +
      `Votre code de réception Wona pour la livraison ${reference} est : ${pin}\n\n` +
      'Donnez ce code au livreur uniquement après avoir reçu et vérifié votre colis. ' +
      "Vous n’avez pas besoin d’installer l’application Wona.",
  });
}

export default function VendeurPublierColisScreen({ navigation }: Props) {
  const [form, setForm] = useState(initialForm);
  const [departure, setDeparture] = useState<RouteCoordinate | null>(null);
  const [arrival, setArrival] = useState<RouteCoordinate | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'departure' | 'arrival' | null>(null);
  const [pickerInitial, setPickerInitial] = useState<RouteCoordinate | null>(null);
  const [resolvingTarget, setResolvingTarget] = useState<'departure' | 'arrival' | null>(null);
  const [photo, setPhoto] = useState<UploadAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openLocationPicker = async (target: 'departure' | 'arrival') => {
    setResolvingTarget(target);
    try {
      const existing = target === 'departure' ? departure : arrival;
      const address = target === 'departure' ? form.adresse_depart : form.adresse_arrivee;
      const initial = existing || (address.trim() ? await resolveAddressCoordinate(address) : null);
      setPickerInitial(initial);
      setPickerTarget(target);
    } finally {
      setResolvingTarget(null);
    }
  };

  const confirmPickedLocation = (coordinate: RouteCoordinate) => {
    if (pickerTarget === 'departure') setDeparture(coordinate);
    if (pickerTarget === 'arrival') setArrival(coordinate);
    setPickerTarget(null);
  };

  const useCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Position refusée', 'Saisissez manuellement l’adresse de départ.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const point = {
      // Le backend conserve six décimales. Les capteurs GPS Expo peuvent en
      // fournir davantage, ce que le DecimalField Django refuse.
      latitude: Number(location.coords.latitude.toFixed(6)),
      longitude: Number(location.coords.longitude.toFixed(6)),
    };
    if (!isCoordinateInTogo(point)) {
      Alert.alert('Position hors zone', 'Le point de retrait doit se trouver au Togo.');
      return;
    }
    setDeparture(point);
    try {
      const addresses = await Location.reverseGeocodeAsync(point);
      const address = addresses[0];
      if (address) {
        update(
          'adresse_depart',
          [address.street, address.district, address.city].filter(Boolean).join(', '),
        );
      }
    } catch {
      // Les coordonnées restent enregistrées même si le géocodage est indisponible.
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!picked.canceled) {
      const asset = picked.assets[0];
      setPhoto({
        uri: asset.uri,
        name: asset.fileName || 'colis.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const submit = async (publier: boolean) => {
    const phone = form.destinataire_telephone.replace(/\D/g, '');
    if (
      !form.destinataire_nom.trim() ||
      phone.length !== 8 ||
      !form.adresse_depart.trim() ||
      !form.adresse_arrivee.trim() ||
      !form.description_colis.trim() ||
      Number(form.prix_livraison) <= 0
    ) {
      Alert.alert(
        'Informations incomplètes',
        'Renseignez le destinataire, son numéro à 8 chiffres, les deux adresses, le colis et un prix de livraison.',
      );
      return;
    }
    if (publier && (!departure || !arrival)) {
      Alert.alert(
        'Points à confirmer',
        'Placez et confirmez les points de retrait et de livraison sur la carte avant de publier.',
      );
      return;
    }
    setLoading(true);
    try {
      const course = await deliveryApi.create({
        ...form,
        destinataire_telephone: phone,
        prix_livraison: Number(form.prix_livraison),
        montant_a_recuperer: Number(form.montant_a_recuperer || 0),
        depart_latitude: departure
          ? Number(departure.latitude.toFixed(6))
          : undefined,
        depart_longitude: departure
          ? Number(departure.longitude.toFixed(6))
          : undefined,
        arrivee_latitude: arrival
          ? Number(arrival.latitude.toFixed(6))
          : undefined,
        arrivee_longitude: arrival
          ? Number(arrival.longitude.toFixed(6))
          : undefined,
        publier,
        photo_colis: photo,
      });
      if (course.code_pin_livraison) {
        await deliveryPinStorage.set(course.id, course.code_pin_livraison);
      }
      if (!publier) {
        Alert.alert('Brouillon enregistré', `La course ${course.reference} est sauvegardée.`);
        navigation.goBack();
      } else {
        const deliveryPin = course.code_pin_livraison;
        Alert.alert(
          'PIN destinataire généré',
          `Le code ${deliveryPin} appartient au destinataire. Envoyez-le-lui par le réseau de votre choix. Il le donnera au livreur uniquement après réception du colis.`,
          [
            {
              text: 'Partager le PIN',
              onPress: () => {
                if (deliveryPin) {
                  void shareDeliveryPin(
                    course.reference,
                    form.destinataire_nom.trim(),
                    deliveryPin,
                  ).finally(() =>
                    navigation.replace('VendeurSuivi', { courseId: course.id }),
                  );
                }
              },
            },
            {
              text: 'Partager plus tard',
              onPress: () =>
                navigation.replace('VendeurSuivi', { courseId: course.id }),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Publication impossible', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Publier un colis" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Destinataire">
          <Field label="Nom complet *" value={form.destinataire_nom} onChangeText={(v) => update('destinataire_nom', v)} />
          <Field
            label="Téléphone togolais *"
            value={form.destinataire_telephone}
            onChangeText={(v) => update('destinataire_telephone', v.replace(/\D/g, '').slice(0, 8))}
            keyboardType="number-pad"
            placeholder="90000000"
          />
        </Section>

        <Section title="Trajet">
          <AddressAutocompleteField
            label="Adresse de retrait *"
            value={form.adresse_depart}
            confirmed={departure !== null}
            onChangeText={(v) => {
              setDeparture(null);
              update('adresse_depart', v);
            }}
            onSelect={(place) =>
              setDeparture({ latitude: place.latitude, longitude: place.longitude })
            }
            placeholder="Ex. Solimé Transit, Tokoin..."
            autoCapitalize="words"
            maxLength={MAX_ADDRESS_LENGTH}
          />
          <Button
            label={departure ? 'Point de retrait confirmé' : 'Placer le retrait sur la carte'}
            icon={departure ? 'check-circle' : 'map-marker-plus-outline'}
            variant="secondary"
            loading={resolvingTarget === 'departure'}
            onPress={() => openLocationPicker('departure')}
          />
          <Button label="Utiliser ma position pour le retrait" icon="crosshairs-gps" variant="ghost" onPress={useCurrentLocation} />
          <AddressAutocompleteField
            label="Adresse de livraison *"
            value={form.adresse_arrivee}
            confirmed={arrival !== null}
            onChangeText={(v) => {
              setArrival(null);
              update('adresse_arrivee', v);
            }}
            onSelect={(place) =>
              setArrival({ latitude: place.latitude, longitude: place.longitude })
            }
            placeholder="Commencez à saisir un lieu au Togo..."
            autoCapitalize="words"
            maxLength={MAX_ADDRESS_LENGTH}
          />
          <Button
            label={arrival ? 'Point de livraison confirmé' : 'Placer la livraison sur la carte'}
            icon={arrival ? 'check-circle' : 'map-marker-plus-outline'}
            variant="secondary"
            loading={resolvingTarget === 'arrival'}
            onPress={() => openLocationPicker('arrival')}
          />
          <Text style={styles.hint}>
            Sélectionnez une proposition Google pour enregistrer automatiquement le point exact.
            Vous pouvez aussi coller un lien, puis confirmer l’épingle sur la carte.
          </Text>
        </Section>

        <Section title="Colis">
          <Field label="Description *" value={form.description_colis} onChangeText={(v) => update('description_colis', v)} multiline placeholder="Contenu, couleur du sachet, fragilité…" />
          <ChoiceRow
            value={form.taille_colis}
            choices={[
              ['petit', 'Petit'],
              ['moyen', 'Moyen'],
              ['grand', 'Grand'],
              ['tres_grand', 'Très grand'],
            ]}
            onChange={(value) => update('taille_colis', value as Delivery['taille_colis'])}
          />
          <Pressable style={styles.photo} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} />
            ) : (
              <>
                <MaterialCommunityIcons name="camera-plus-outline" size={26} color={colors.primary} />
                <Text style={styles.photoText}>Ajouter une photo du colis</Text>
              </>
            )}
          </Pressable>
          <Field label="Instructions" value={form.instructions} onChangeText={(v) => update('instructions', v)} multiline placeholder="Repères, précautions, personne à appeler…" />
        </Section>

        <Section title="Prix et encaissement">
          <Field label="Prix proposé au livreur (FCFA) *" value={form.prix_livraison} onChangeText={(v) => update('prix_livraison', v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Field label="Montant à récupérer chez le destinataire (FCFA)" value={form.montant_a_recuperer} onChangeText={(v) => update('montant_a_recuperer', v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Text style={styles.hint}>
            Le prix de livraison et l’argent à récupérer sont suivis séparément pour éviter toute confusion.
          </Text>
          <Text style={styles.label}>Mode de paiement</Text>
          <ChoiceRow
            value={form.methode_paiement}
            choices={[
              ['especes', 'Espèces'],
              ['tmoney', 'TMoney'],
              ['flooz', 'Flooz'],
              ['direct', 'Direct'],
            ]}
            onChange={(value) => update('methode_paiement', value as Delivery['methode_paiement'])}
          />
          <Text style={styles.label}>Urgence</Text>
          <ChoiceRow
            value={form.urgence}
            choices={[
              ['normale', 'Normale'],
              ['urgente', 'Urgente'],
              ['express', 'Express'],
            ]}
            onChange={(value) => update('urgence', value as Delivery['urgence'])}
          />
        </Section>

        <Button label="Publier maintenant" icon="send" onPress={() => submit(true)} loading={loading} />
        <Button label="Enregistrer en brouillon" variant="secondary" onPress={() => submit(false)} disabled={loading} />
      </ScrollView>
      <LocationPickerModal
        visible={pickerTarget !== null}
        title={pickerTarget === 'departure' ? 'Point de retrait' : 'Point de livraison'}
        description={
          pickerTarget === 'departure'
            ? form.adresse_depart
            : form.adresse_arrivee
        }
        initialCoordinate={pickerInitial}
        onClose={() => setPickerTarget(null)}
        onConfirm={confirmPickedLocation}
      />
    </View>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.multiline]}
        placeholderTextColor={colors.outline}
        {...props}
      />
    </View>
  );
}

function ChoiceRow({
  value,
  choices,
  onChange,
}: {
  value: string;
  choices: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choices}>
      {choices.map(([key, label]) => (
        <Pressable
          key={key}
          style={[styles.choice, value === key && styles.choiceActive]}
          onPress={() => onChange(key)}
        >
          <Text style={[styles.choiceText, value === key && styles.choiceTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.container, paddingBottom: 52, gap: spacing.md },
  section: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  multiline: { minHeight: 74, paddingTop: spacing.sm, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: {
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: 11, color: colors.textPrimary },
  choiceTextActive: { color: colors.white, fontWeight: '700' },
  photo: {
    height: 120,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.outline,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: { color: colors.primary, fontWeight: '700', fontSize: 12, marginTop: 5 },
  hint: { fontSize: 11, color: colors.tertiary, lineHeight: 16 },
});
