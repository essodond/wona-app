import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SellerProfile } from '../../types/api';
import { sellerApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDeliveries } from '../../context/DeliveryContext';
import { colors, radii, spacing } from '../../theme';
import Button from '../../components/Button';

export default function VendeurProfilScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { clear } = useDeliveries();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('');
  const [adresse, setAdresse] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const value = await sellerApi.profile();
      setProfile(value);
      setNom(value.nom);
      setCategorie(value.categorie);
      setAdresse(value.adresse);
      setWhatsapp(value.whatsapp);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const save = async () => {
    if (!nom.trim()) {
      Alert.alert('Nom requis', 'Renseignez le nom de votre boutique ou activité.');
      return;
    }
    setLoading(true);
    try {
      const value = await sellerApi.updateProfile({
        nom: nom.trim(),
        categorie: categorie.trim(),
        adresse: adresse.trim(),
        whatsapp: whatsapp.replace(/\s/g, ''),
      });
      setProfile(value);
      Alert.alert('Profil enregistré');
    } catch (error) {
      Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    setLoading(true);
    try {
      await sellerApi.createAddress({
        libelle: newLabel.trim(),
        adresse: newAddress.trim(),
        active: true,
        par_defaut: !profile?.adresses_retrait.length,
      });
      setNewLabel('');
      setNewAddress('');
      await load();
    } catch (error) {
      Alert.alert('Adresse non ajoutée', error instanceof Error ? error.message : 'Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const removeAddress = (id: string) => {
    Alert.alert('Supprimer cette adresse ?', 'Cette action retire le point de retrait enregistré.', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          sellerApi
            .deleteAddress(id)
            .then(load)
            .catch((error) =>
              Alert.alert('Suppression impossible', error instanceof Error ? error.message : 'Réessayez.'),
            ),
      },
    ]);
  };

  const signOut = async () => {
    clear();
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Text style={styles.brand}>WONA</Text>
        <Text style={styles.title}>Mon profil</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <View style={styles.identity}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="store-outline" size={43} color={colors.primary} />
          </View>
          <Text style={styles.phone}>{profile?.telephone}</Text>
          <Text style={styles.rating}>
            ★ {profile?.note_moyenne || '0'} · {profile?.nombre_avis || 0} avis
          </Text>
        </View>
        <View style={styles.card}>
          <Field label="Nom de la boutique *" value={nom} onChangeText={setNom} />
          <Field label="Catégorie d’activité" value={categorie} onChangeText={setCategorie} />
          <Field label="Adresse principale" value={adresse} onChangeText={setAdresse} multiline />
          <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
          <Button label="Enregistrer les modifications" onPress={save} loading={loading} />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Adresses de retrait</Text>
          {profile?.adresses_retrait.map((item) => (
            <View key={item.id} style={styles.addressRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>
                  {item.libelle}
                  {item.par_defaut ? ' · Par défaut' : ''}
                </Text>
                <Text style={styles.addressText}>{item.adresse}</Text>
              </View>
              <Pressable onPress={() => removeAddress(item.id)}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}
          <Field label="Libellé" value={newLabel} onChangeText={setNewLabel} placeholder="Boutique, dépôt…" />
          <Field label="Nouvelle adresse" value={newAddress} onChangeText={setNewAddress} />
          <Button label="Ajouter l’adresse" variant="secondary" icon="plus" onPress={addAddress} />
        </View>
        <Pressable style={styles.logout} onPress={signOut}>
          <MaterialCommunityIcons name="logout" size={21} color={colors.error} />
          <Text style={styles.logoutText}>Déconnexion sécurisée</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && { minHeight: 72, paddingTop: spacing.sm }]}
        placeholderTextColor={colors.outline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.container, paddingBottom: spacing.sm },
  brand: { fontSize: 13, fontWeight: '700', color: colors.primary },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  content: { padding: spacing.container, gap: spacing.md, paddingBottom: 48 },
  identity: { alignItems: 'center' },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  phone: { color: colors.textPrimary, fontWeight: '700', marginTop: spacing.xs },
  rating: { fontSize: 11, color: colors.textSecondary },
  card: {
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.outlineLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  addressLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  addressText: { fontSize: 10, color: colors.textSecondary },
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
