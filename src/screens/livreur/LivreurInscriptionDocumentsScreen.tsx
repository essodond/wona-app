import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { DriverDocument, DriverProfile } from '../../types/api';
import { driverApi, type UploadAsset } from '../../services/api';
import { colors, radii, spacing } from '../../theme';
import TopBar from '../../components/TopBar';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurInscriptionDocuments'>;
type DocumentType = DriverDocument['type'];

const REQUIRED_DOCUMENTS: Array<{
  type: DocumentType;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { type: 'cni', label: 'Pièce d’identité', description: 'CNI ou passeport', icon: 'card-account-details-outline' },
  { type: 'permis', label: 'Permis de conduire', description: 'Permis valide', icon: 'card-account-details' },
  { type: 'carte_grise', label: 'Carte grise', description: 'Document du véhicule', icon: 'file-document-outline' },
  { type: 'photo_livreur', label: 'Photo du livreur', description: 'Photo récente et nette', icon: 'account-box-outline' },
  { type: 'photo_vehicule', label: 'Photo avec le véhicule', description: 'Véhicule et livreur visibles', icon: 'motorbike' },
];

export default function LivreurInscriptionDocumentsScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('Lomé');
  const [immatriculation, setImmatriculation] = useState('');
  const [transport, setTransport] = useState<DriverProfile['moyen_transport']>('moto');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocumentType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const value = await driverApi.profile();
      setProfile(value);
      setNom(value.nom);
      setVille(value.ville || 'Lomé');
      setImmatriculation(value.immatriculation_moto);
      setTransport(value.moyen_transport);
      if (
        value.statut_verification === 'en_attente' &&
        REQUIRED_DOCUMENTS.every(({ type }) => value.documents.some((doc) => doc.type === type))
      ) {
        navigation.replace('LivreurAttenteValidation');
      }
    } catch (error) {
      Alert.alert('Profil indisponible', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const saveProfile = async () => {
    if (!nom.trim() || !ville.trim()) {
      Alert.alert('Profil incomplet', 'Le nom et la ville sont obligatoires.');
      return false;
    }
    try {
      const value = await driverApi.updateProfile({
        nom: nom.trim(),
        ville: ville.trim(),
        moyen_transport: transport,
        immatriculation_moto: immatriculation.trim(),
      });
      setProfile(value);
      return true;
    } catch (error) {
      Alert.alert('Profil non enregistré', error instanceof Error ? error.message : 'Réessayez.');
      return false;
    }
  };

  const upload = async (type: DocumentType) => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return;
    const item = picked.assets[0];
    if (item.size && item.size > 5 * 1024 * 1024) {
      Alert.alert('Fichier trop lourd', 'La taille maximale est de 5 Mo.');
      return;
    }
    setUploading(type);
    try {
      const asset: UploadAsset = {
        uri: item.uri,
        name: item.name || `${type}.jpg`,
        type: item.mimeType || 'image/jpeg',
      };
      await driverApi.uploadDocument(type, asset);
      await load();
    } catch (error) {
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setUploading(null);
    }
  };

  const complete = async () => {
    if (!(await saveProfile())) return;
    const documents = profile?.documents || [];
    const missing = REQUIRED_DOCUMENTS.filter(
      ({ type }) => !documents.some((document) => document.type === type),
    );
    if (missing.length) {
      Alert.alert(
        'Documents manquants',
        `Ajoutez : ${missing.map((item) => item.label).join(', ')}.`,
      );
      return;
    }
    navigation.replace('LivreurAttenteValidation');
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="Dossier livreur"
        showBack={false}
        rightIcon="logout"
        onRightPress={() => logout().catch(() => {})}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <MaterialCommunityIcons name="shield-check-outline" size={24} color={colors.tertiary} />
          <Text style={styles.bannerText}>
            Vos documents sont chiffrés en transit et accessibles uniquement aux administrateurs autorisés.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>1. Votre profil</Text>
        <Field label="Nom complet" value={nom} onChangeText={setNom} placeholder="Ex. Komlan Mensah" />
        <Field label="Ville" value={ville} onChangeText={setVille} placeholder="Lomé" />
        <Text style={styles.label}>Moyen de transport</Text>
        <View style={styles.choices}>
          {(['moto', 'velo', 'voiture', 'tricycle'] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.choice, transport === value && styles.choiceActive]}
              onPress={() => setTransport(value)}
            >
              <Text style={[styles.choiceText, transport === value && styles.choiceTextActive]}>
                {value === 'velo' ? 'Vélo' : value[0].toUpperCase() + value.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Immatriculation (si applicable)"
          value={immatriculation}
          onChangeText={setImmatriculation}
          placeholder="TG 1234 AB"
          autoCapitalize="characters"
        />
        <Button
          label="Enregistrer le profil"
          variant="secondary"
          onPress={saveProfile}
          loading={loading}
        />

        <Text style={styles.sectionTitle}>2. Documents de vérification</Text>
        {REQUIRED_DOCUMENTS.map((item) => {
          const document = profile?.documents.find((value) => value.type === item.type);
          return (
            <Pressable key={item.type} style={styles.uploadCard} onPress={() => upload(item.type)}>
              <View style={styles.documentIcon}>
                <MaterialCommunityIcons name={item.icon} size={23} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.documentTitle}>{item.label}</Text>
                <Text style={styles.documentDescription}>
                  {document?.statut === 'refuse'
                    ? document.commentaire_admin || 'Refusé : remplacez ce document'
                    : document
                      ? document.statut === 'valide'
                        ? 'Validé'
                        : 'Envoyé, en attente'
                      : item.description}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={
                  uploading === item.type
                    ? 'progress-upload'
                    : document?.statut === 'valide'
                      ? 'check-circle'
                      : document?.statut === 'refuse'
                        ? 'alert-circle'
                        : document
                          ? 'clock-outline'
                          : 'cloud-upload-outline'
                }
                size={23}
                color={
                  document?.statut === 'valide'
                    ? colors.success
                    : document?.statut === 'refuse'
                      ? colors.error
                      : colors.primary
                }
              />
            </Pressable>
          );
        })}
        <Text style={styles.help}>Formats JPG, PNG ou PDF · 5 Mo maximum par fichier.</Text>
        <Button label="Soumettre mon dossier" icon="shield-check-outline" onPress={complete} />
      </ScrollView>
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.outline} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.container, paddingBottom: 48, gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.tertiaryBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  bannerText: { flex: 1, fontSize: 12, color: colors.textPrimary },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineLight,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: 12, color: colors.textPrimary },
  choiceTextActive: { color: colors.white, fontWeight: '700' },
  uploadCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    backgroundColor: colors.surfaceLow,
  },
  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  documentDescription: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  help: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
});

