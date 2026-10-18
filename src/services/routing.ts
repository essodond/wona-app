export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteInstruction = {
  id: string;
  text: string;
  roadName: string;
  distance: number;
  duration: number;
  startIndex: number;
  endIndex: number;
  icon: string;
};

export type DrivingRoute = {
  coordinates: RouteCoordinate[];
  cumulativeDistances: number[];
  distance: number;
  duration: number;
  instructions: RouteInstruction[];
};

export type RouteProgress = {
  nearestIndex: number;
  distanceToRoute: number;
  distanceToInstruction: number;
  remainingDistance: number;
  remainingDuration: number;
  instructionIndex: number;
};

type OsrmGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

type OsrmManeuver = {
  type: string;
  modifier?: string;
  exit?: number;
  location: [number, number];
};

type OsrmStep = {
  distance: number;
  duration: number;
  name?: string;
  ref?: string;
  maneuver: OsrmManeuver;
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: OsrmGeometry;
  legs: { steps: OsrmStep[] }[];
};

type OsrmResponse = {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
};

const DEFAULT_ROUTING_URL = 'https://router.project-osrm.org';

function isFiniteCoordinate(point: RouteCoordinate) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceBetween(a: RouteCoordinate, b: RouteCoordinate) {
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildCumulativeDistances(coordinates: RouteCoordinate[]) {
  const distances = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    distances.push(distances[index - 1] + distanceBetween(coordinates[index - 1], coordinates[index]));
  }
  return distances;
}

function modifierLabel(modifier?: string) {
  const labels: Record<string, string> = {
    straight: 'tout droit',
    'slight right': 'légèrement à droite',
    right: 'à droite',
    'sharp right': 'franchement à droite',
    uturn: 'en faisant demi-tour',
    'sharp left': 'franchement à gauche',
    left: 'à gauche',
    'slight left': 'légèrement à gauche',
  };
  return modifier ? labels[modifier] || modifier : 'tout droit';
}

function maneuverIcon(type: string, modifier?: string) {
  if (type === 'arrive') return 'map-marker-check';
  if (type.includes('roundabout') || type === 'rotary') return 'rotate-right';
  if (modifier === 'uturn') return 'backup-restore';
  if (modifier?.includes('left')) return modifier.includes('slight') ? 'arrow-top-left' : 'arrow-left';
  if (modifier?.includes('right')) return modifier.includes('slight') ? 'arrow-top-right' : 'arrow-right';
  return 'arrow-up';
}

function roadLabel(step: OsrmStep) {
  return step.name?.trim() || step.ref?.trim() || '';
}

function instructionText(step: OsrmStep) {
  const { type, modifier, exit } = step.maneuver;
  const road = roadLabel(step);
  const roadSuffix = road ? ` sur ${road}` : '';

  if (type === 'depart') return road ? `Prenez ${road}` : 'Démarrez le trajet';
  if (type === 'arrive') return 'Vous êtes arrivé à destination';
  if (type === 'roundabout' || type === 'rotary') {
    const exitText = exit ? ` et prenez la ${exit}${exit === 1 ? 're' : 'e'} sortie` : '';
    return `Entrez dans le rond-point${exitText}${roadSuffix}`;
  }
  if (type === 'exit roundabout' || type === 'exit rotary') {
    return `Sortez du rond-point${roadSuffix}`;
  }
  if (type === 'merge') return `Insérez-vous ${modifierLabel(modifier)}${roadSuffix}`;
  if (type === 'fork') return `À la bifurcation, restez ${modifierLabel(modifier)}${roadSuffix}`;
  if (type === 'end of road') return `Au bout de la route, tournez ${modifierLabel(modifier)}${roadSuffix}`;
  if (type === 'continue' || type === 'new name') return `Continuez ${modifierLabel(modifier)}${roadSuffix}`;
  if (type === 'notification') return road ? `Continuez sur ${road}` : 'Continuez sur la route';
  return `Tournez ${modifierLabel(modifier)}${roadSuffix}`;
}

function findClosestIndex(
  coordinates: RouteCoordinate[],
  point: RouteCoordinate,
  startIndex = 0,
) {
  let closestIndex = Math.min(startIndex, Math.max(0, coordinates.length - 1));
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = closestIndex; index < coordinates.length; index += 1) {
    const distance = distanceBetween(point, coordinates[index]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }
  return closestIndex;
}

function mapInstructions(steps: OsrmStep[], coordinates: RouteCoordinate[]) {
  let searchFrom = 0;
  const instructions = steps.map((step, index) => {
    const maneuverPoint = {
      latitude: step.maneuver.location[1],
      longitude: step.maneuver.location[0],
    };
    const startIndex = findClosestIndex(coordinates, maneuverPoint, searchFrom);
    searchFrom = startIndex;
    return {
      id: `${index}-${startIndex}`,
      text: instructionText(step),
      roadName: roadLabel(step),
      distance: step.distance,
      duration: step.duration,
      startIndex,
      endIndex: coordinates.length - 1,
      icon: maneuverIcon(step.maneuver.type, step.maneuver.modifier),
    };
  });

  return instructions.map((instruction, index) => ({
    ...instruction,
    endIndex: instructions[index + 1]?.startIndex ?? coordinates.length - 1,
  }));
}

export async function getDrivingRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
): Promise<DrivingRoute> {
  if (!isFiniteCoordinate(origin) || !isFiniteCoordinate(destination)) {
    throw new Error('Les coordonnées de cet itinéraire sont invalides.');
  }

  const routingUrl = (process.env.EXPO_PUBLIC_ROUTING_URL || DEFAULT_ROUTING_URL).replace(/\/$/, '');
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url =
    `${routingUrl}/route/v1/driving/${coordinates}` +
    '?alternatives=2&steps=true&overview=full&geometries=geojson';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Le service d’itinéraire est momentanément indisponible.');
    const payload = (await response.json()) as OsrmResponse;
    if (payload.code !== 'Ok' || !payload.routes?.length) {
      throw new Error(payload.message || 'Aucun trajet routier n’a été trouvé.');
    }

    // Parmi les trajets recommandés, Wona retient celui qui parcourt le moins de kilomètres.
    const selected = [...payload.routes].sort((a, b) => a.distance - b.distance)[0];
    const routeCoordinates = selected.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));
    if (routeCoordinates.length < 2) throw new Error('Le tracé reçu est incomplet.');

    const steps = selected.legs.flatMap((leg) => leg.steps);
    return {
      coordinates: routeCoordinates,
      cumulativeDistances: buildCumulativeDistances(routeCoordinates),
      distance: selected.distance,
      duration: selected.duration,
      instructions: mapInstructions(steps, routeCoordinates),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Le calcul de l’itinéraire a pris trop de temps.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getRouteProgress(position: RouteCoordinate, route: DrivingRoute): RouteProgress {
  let nearestIndex = 0;
  let distanceToRoute = Number.POSITIVE_INFINITY;
  route.coordinates.forEach((coordinate, index) => {
    const distance = distanceBetween(position, coordinate);
    if (distance < distanceToRoute) {
      distanceToRoute = distance;
      nearestIndex = index;
    }
  });

  const geometryDistance =
    route.cumulativeDistances[route.cumulativeDistances.length - 1] || route.distance;
  const travelledGeometryDistance = route.cumulativeDistances[nearestIndex] || 0;
  const progressRatio = geometryDistance > 0 ? travelledGeometryDistance / geometryDistance : 0;
  const nextInstructionIndex = route.instructions.findIndex(
    (instruction) => instruction.startIndex >= nearestIndex,
  );
  const instructionIndex =
    nextInstructionIndex >= 0 ? nextInstructionIndex : Math.max(0, route.instructions.length - 1);
  const instructionStartIndex = route.instructions[instructionIndex]?.startIndex ?? nearestIndex;
  const instructionDistance =
    (route.cumulativeDistances[instructionStartIndex] || travelledGeometryDistance) -
    travelledGeometryDistance;

  return {
    nearestIndex,
    distanceToRoute,
    distanceToInstruction: Math.max(0, instructionDistance),
    remainingDistance: Math.max(0, route.distance * (1 - progressRatio)),
    remainingDuration: Math.max(0, route.duration * (1 - progressRatio)),
    instructionIndex,
  };
}

export function formatRouteDistance(meters: number) {
  if (meters < 950) return `${Math.max(0, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0).replace('.', ',')} km`;
}

export function formatRouteDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}
