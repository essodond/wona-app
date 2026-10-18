import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteCoordinate } from '../services/routing';
import { isCoordinateInTogo } from '../services/locationResolver';
import { colors, radii, shadow, spacing } from '../theme';
import Button from './Button';

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  initialCoordinate?: RouteCoordinate | null;
  onClose: () => void;
  onConfirm: (coordinate: RouteCoordinate) => void;
};

const LOME = { latitude: 6.1319, longitude: 1.2228 };

export default function LocationPickerModal({
  visible,
  title,
  description,
  initialCoordinate,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<RouteCoordinate | null>(initialCoordinate || null);
  const [error, setError] = useState('');
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');

  useEffect(() => {
    if (!visible) return;
    setSelected(initialCoordinate || null);
    setError('');
  }, [initialCoordinate, visible]);

  const selectPoint = (coordinate: RouteCoordinate) => {
    if (!isCoordinateInTogo(coordinate)) {
      setError('Ce point est hors du Togo. Choisissez un emplacement au Togo.');
      return;
    }
    setError('');
    setSelected(coordinate);
  };

  const center = initialCoordinate && isCoordinateInTogo(initialCoordinate) ? initialCoordinate : LOME;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={25} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.helpCard}>
          <MaterialCommunityIcons name="map-marker-check-outline" size={24} color={colors.primary} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Confirmez le lieu exact</Text>
            <Text style={styles.helpText} numberOfLines={2}>
              {description || 'Touchez la carte pour placer l’épingle au bon endroit.'}
            </Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            key={`${visible}-${center.latitude}-${center.longitude}`}
            style={StyleSheet.absoluteFill}
            mapType={mapType}
            initialRegion={{
              ...center,
              latitudeDelta: initialCoordinate ? 0.025 : 0.12,
              longitudeDelta: initialCoordinate ? 0.025 : 0.12,
            }}
            showsUserLocation
            showsMyLocationButton
            onPress={(event) => selectPoint(event.nativeEvent.coordinate)}
          >
            {selected ? (
              <Marker
                coordinate={selected}
                draggable
                pinColor={colors.primary}
                title="Point confirmé"
                onDragEnd={(event) => selectPoint(event.nativeEvent.coordinate)}
              />
            ) : null}
          </MapView>
          <Pressable
            style={[styles.mapTypeButton, shadow.soft]}
            onPress={() => setMapType((current) => (current === 'standard' ? 'hybrid' : 'standard'))}
          >
            <MaterialCommunityIcons
              name={mapType === 'standard' ? 'satellite-variant' : 'map-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.mapTypeText}>
              {mapType === 'standard' ? 'Satellite' : 'Plan'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, spacing.md) }, shadow.soft]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.instruction}>
            {selected
              ? 'Vérifiez l’épingle orange, puis confirmez.'
              : 'Touchez la carte pour placer l’épingle orange.'}
          </Text>
          <Button
            label="Confirmer ce point"
            icon="check-circle-outline"
            disabled={!selected}
            onPress={() => selected && onConfirm(selected)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  headerSpacer: { width: 42 },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLow,
  },
  helpContent: { flex: 1 },
  helpTitle: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  helpText: { marginTop: 2, fontSize: 10, lineHeight: 14, color: colors.textSecondary },
  mapContainer: { flex: 1 },
  mapTypeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  mapTypeText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  bottomPanel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.background,
  },
  instruction: { textAlign: 'center', fontSize: 12, color: colors.textSecondary },
  error: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.error },
});
