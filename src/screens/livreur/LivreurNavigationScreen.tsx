import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { LocationObject, LocationSubscription } from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Delivery } from '../../types/api';
import { deliveryApi, driverApi } from '../../services/api';
import { resolveAddressCoordinate, storedCoordinate } from '../../services/locationResolver';
import {
  distanceBetween,
  formatRouteDistance,
  formatRouteDuration,
  getDrivingRoute,
  getRouteProgress,
  type DrivingRoute,
  type RouteCoordinate,
  type RouteProgress,
} from '../../services/routing';
import { colors, radii, shadow, spacing } from '../../theme';
import Button from '../../components/Button';
import LocationPickerModal from '../../components/LocationPickerModal';
import TopBar from '../../components/TopBar';

type Props = NativeStackScreenProps<RootStackParamList, 'LivreurNavigation'>;

const LOME = { latitude: 6.1319, longitude: 1.2228 };
const OFF_ROUTE_DISTANCE = 80;
const REROUTE_COOLDOWN = 30_000;

async function resolveDestination(delivery: Delivery) {
  const towardPickup = ['acceptee', 'en_route_retrait', 'arrive_retrait'].includes(delivery.statut);
  const stored = towardPickup
    ? storedCoordinate(delivery.depart_latitude, delivery.depart_longitude)
    : storedCoordinate(delivery.arrivee_latitude, delivery.arrivee_longitude);
  const address = towardPickup ? delivery.adresse_depart : delivery.adresse_arrivee;
  const coordinate = stored || (await resolveAddressCoordinate(address));
  return {
    coordinate,
    address,
    label: towardPickup ? 'Point de retrait' : 'Point de livraison',
    requiresConfirmation: !stored,
  };
}

function locationCoordinate(location: LocationObject): RouteCoordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export default function LivreurNavigationScreen({ navigation, route }: Props) {
  const mapRef = useRef<MapView>(null);
  const routeRef = useRef<DrivingRoute | null>(null);
  const destinationRef = useRef<RouteCoordinate | null>(null);
  const currentPositionRef = useRef<RouteCoordinate | null>(null);
  const followingRef = useRef(true);
  const routeRequestRef = useRef(0);
  const rerouteInFlightRef = useRef(false);
  const offRouteUpdatesRef = useRef(0);
  const lastRerouteRef = useRef(0);
  const lastPositionSyncRef = useRef(0);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [currentPosition, setCurrentPosition] = useState<RouteCoordinate | null>(null);
  const [destination, setDestination] = useState<RouteCoordinate | null>(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('Destination');
  const [drivingRoute, setDrivingRoute] = useState<DrivingRoute | null>(null);
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerouting, setRerouting] = useState(false);
  const [following, setFollowing] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [destinationPickerVisible, setDestinationPickerVisible] = useState(false);
  const [destinationCandidate, setDestinationCandidate] = useState<RouteCoordinate | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');

  useEffect(() => {
    followingRef.current = following;
  }, [following]);

  const calculateRoute = useCallback(
    async (origin: RouteCoordinate, target: RouteCoordinate, automatic = false) => {
      if (automatic && rerouteInFlightRef.current) return;
      if (automatic) {
        rerouteInFlightRef.current = true;
        setRerouting(true);
      } else {
        setLoading(true);
      }

      const requestId = ++routeRequestRef.current;
      try {
        const result = await getDrivingRoute(origin, target);
        if (requestId !== routeRequestRef.current) return;
        routeRef.current = result;
        setDrivingRoute(result);
        setProgress(getRouteProgress(origin, result));
        setError('');
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(result.coordinates, {
            animated: true,
            edgePadding: { top: 140, right: 48, bottom: 80, left: 48 },
          });
        }, 120);
      } catch (routeError) {
        if (requestId !== routeRequestRef.current) return;
        if (!automatic || !routeRef.current) {
          setError(
            routeError instanceof Error
              ? routeError.message
              : 'Impossible de calculer l’itinéraire.',
          );
        }
      } finally {
        if (requestId === routeRequestRef.current) setLoading(false);
        if (automatic) {
          rerouteInFlightRef.current = false;
          setRerouting(false);
        }
      }
    },
    [],
  );

  const handleLocation = useCallback(
    (location: LocationObject) => {
      const coordinate = locationCoordinate(location);
      currentPositionRef.current = coordinate;
      setCurrentPosition(coordinate);

      if (Date.now() - lastPositionSyncRef.current >= 20_000) {
        lastPositionSyncRef.current = Date.now();
        driverApi.updatePosition(coordinate.latitude, coordinate.longitude).catch(() => {});
      }

      if (followingRef.current) {
        mapRef.current?.animateCamera(
          {
            center: coordinate,
            heading: location.coords.heading && location.coords.heading > 0 ? location.coords.heading : 0,
            pitch: 45,
            zoom: 17,
          },
          { duration: 700 },
        );
      }

      const activeRoute = routeRef.current;
      const target = destinationRef.current;
      if (!activeRoute || !target) return;
      const nextProgress = getRouteProgress(coordinate, activeRoute);
      setProgress(nextProgress);

      if (
        nextProgress.distanceToRoute > OFF_ROUTE_DISTANCE &&
        distanceBetween(coordinate, target) > 50
      ) {
        offRouteUpdatesRef.current += 1;
      } else {
        offRouteUpdatesRef.current = 0;
      }

      if (
        offRouteUpdatesRef.current >= 2 &&
        Date.now() - lastRerouteRef.current >= REROUTE_COOLDOWN
      ) {
        offRouteUpdatesRef.current = 0;
        lastRerouteRef.current = Date.now();
        calculateRoute(coordinate, target, true).catch(() => {});
      }
    },
    [calculateRoute],
  );

  useEffect(() => {
    let cancelled = false;
    let subscription: LocationSubscription | undefined;

    const startNavigation = async () => {
      setLoading(true);
      setError('');
      const course = await deliveryApi.get(route.params.courseId);
      if (cancelled) return;
      setDelivery(course);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Autorisez la position dans les réglages pour démarrer le guidage.');
      }

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      if (cancelled) return;
      const initialCoordinate = locationCoordinate(initialLocation);
      currentPositionRef.current = initialCoordinate;
      setCurrentPosition(initialCoordinate);

      const resolved = await resolveDestination(course);
      if (cancelled) return;
      setDestinationAddress(resolved.address);
      setDestinationLabel(resolved.label);

      if (resolved.coordinate && !resolved.requiresConfirmation) {
        destinationRef.current = resolved.coordinate;
        setDestination(resolved.coordinate);
        await calculateRoute(initialCoordinate, resolved.coordinate);
        if (cancelled) return;
      } else {
        setDestinationCandidate(resolved.coordinate);
        setDestinationPickerVisible(true);
        setLoading(false);
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 8,
          timeInterval: 3000,
        },
        handleLocation,
      );
    };

    startNavigation().catch((startError) => {
      if (cancelled) return;
      setError(
        startError instanceof Error ? startError.message : 'Impossible de démarrer la navigation.',
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
      routeRequestRef.current += 1;
      subscription?.remove();
    };
  }, [calculateRoute, handleLocation, retryKey, route.params.courseId]);

  const confirmDestination = (coordinate: RouteCoordinate) => {
    const origin = currentPositionRef.current;
    destinationRef.current = coordinate;
    setDestination(coordinate);
    setDestinationCandidate(coordinate);
    setDestinationPickerVisible(false);
    if (origin) calculateRoute(origin, coordinate).catch(() => {});
  };

  const recenter = () => {
    setFollowing(true);
    if (!currentPosition) return;
    mapRef.current?.animateCamera(
      { center: currentPosition, pitch: 45, zoom: 17 },
      { duration: 500 },
    );
  };

  const instruction =
    drivingRoute && progress ? drivingRoute.instructions[progress.instructionIndex] : null;
  const remainingDistance = progress?.remainingDistance ?? drivingRoute?.distance ?? 0;
  const remainingDuration = progress?.remainingDuration ?? drivingRoute?.duration ?? 0;
  const distanceToDestination =
    currentPosition && destination ? distanceBetween(currentPosition, destination) : Number.POSITIVE_INFINITY;
  const arrived = distanceToDestination <= 40;

  return (
    <View style={styles.container}>
      <TopBar
        title={delivery?.reference ? `Navigation · ${delivery.reference}` : 'Navigation Wona'}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          mapType={mapType}
          initialRegion={{
            latitude: currentPosition?.latitude ?? LOME.latitude,
            longitude: currentPosition?.longitude ?? LOME.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          showsTraffic
          onPanDrag={() => setFollowing(false)}
        >
          {destination ? (
            <Marker
              coordinate={destination}
              title={destinationLabel}
              description={destinationAddress}
              pinColor={colors.primary}
            />
          ) : null}
          {drivingRoute ? (
            <Polyline
              coordinates={drivingRoute.coordinates}
              strokeColor={colors.primary}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
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

        {instruction || arrived ? (
          <View style={[styles.instructionCard, shadow.soft]}>
            <View style={styles.maneuverIcon}>
              <MaterialCommunityIcons
                name={(arrived ? 'map-marker-check' : instruction?.icon || 'arrow-up') as never}
                size={34}
                color={colors.white}
              />
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionDistance}>
                {arrived
                  ? 'Destination atteinte'
                  : formatRouteDistance(progress?.distanceToInstruction ?? instruction?.distance ?? 0)}
              </Text>
              <Text style={styles.instructionText} numberOfLines={2}>
                {arrived ? `Vous êtes arrivé au ${destinationLabel.toLowerCase()}.` : instruction?.text}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable style={[styles.recenterButton, shadow.soft]} onPress={recenter}>
          <MaterialCommunityIcons
            name={following ? 'crosshairs-gps' : 'crosshairs'}
            size={24}
            color={colors.primary}
          />
        </Pressable>

        <View style={styles.attribution}>
          <Text style={styles.attributionText}>Calcul OSRM · © OpenStreetMap</Text>
        </View>

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Calcul du trajet le plus court…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomPanel}>
        {error && !drivingRoute ? (
          <View style={styles.errorContent}>
            <MaterialCommunityIcons name="map-marker-alert-outline" size={28} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Button
              label="Réessayer"
              icon="refresh"
              variant="secondary"
              onPress={() => setRetryKey((value) => value + 1)}
            />
          </View>
        ) : (
          <>
            <View style={styles.destinationRow}>
              <View style={styles.destinationText}>
                <Text style={styles.destinationLabel}>{destinationLabel}</Text>
                <Text style={styles.destinationAddress} numberOfLines={1}>
                  {destinationAddress || 'Localisation de la course'}
                </Text>
              </View>
              <View style={styles.routeBadge}>
                <Text style={styles.routeBadgeText}>{rerouting ? 'Recalcul…' : 'Plus court'}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="map-marker-distance" size={20} color={colors.primary} />
                <Text style={styles.statValue}>{formatRouteDistance(remainingDistance)}</Text>
                <Text style={styles.statLabel}>restants</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
                <Text style={styles.statValue}>{formatRouteDuration(remainingDuration)}</Text>
                <Text style={styles.statLabel}>estimées</Text>
              </View>
            </View>

            <Button
              label="Retour à la course"
              icon="arrow-left"
              iconPosition="left"
              variant="secondary"
              onPress={() => navigation.goBack()}
            />
          </>
        )}
      </View>
      <LocationPickerModal
        visible={destinationPickerVisible}
        title={`Confirmer le ${destinationLabel.toLowerCase()}`}
        description="Le lien reçu n’avait pas de position enregistrée. Vérifiez l’épingle avant de démarrer."
        initialCoordinate={destinationCandidate}
        onClose={() => navigation.goBack()}
        onConfirm={confirmDestination}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1, minHeight: 280, backgroundColor: colors.surfaceHigh },
  instructionCard: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  maneuverIcon: {
    width: 62,
    height: 62,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  instructionContent: { flex: 1, paddingHorizontal: spacing.sm },
  instructionDistance: { fontSize: 12, fontWeight: '700', color: colors.primary },
  instructionText: { marginTop: 3, fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.textPrimary },
  recenterButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  mapTypeButton: {
    position: 'absolute',
    top: 108,
    right: spacing.md,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  mapTypeText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  attribution: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  attributionText: { fontSize: 8, color: colors.textSecondary },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  loadingText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  bottomPanel: {
    padding: spacing.md,
    gap: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.background,
  },
  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  destinationText: { flex: 1 },
  destinationLabel: { fontSize: 11, color: colors.textSecondary },
  destinationAddress: { marginTop: 2, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  routeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.successBg,
  },
  routeBadgeText: { fontSize: 10, fontWeight: '700', color: colors.success },
  statsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
  },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 9, color: colors.textSecondary },
  divider: { width: 1, height: 32, backgroundColor: colors.outline },
  errorContent: { alignItems: 'center', gap: spacing.sm },
  errorText: { textAlign: 'center', fontSize: 13, lineHeight: 18, color: colors.error },
});
