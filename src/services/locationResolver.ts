import * as Location from 'expo-location';
import type { RouteCoordinate } from './routing';

const GOOGLE_MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'google.com',
  'www.google.com',
  'maps.google.com',
]);

// Limites volontairement un peu plus larges que les frontières du Togo afin
// de ne pas rejeter un point proche d'une frontière à cause de la précision GPS.
const TOGO_BOUNDS = {
  minLatitude: 5.5,
  maxLatitude: 11.5,
  minLongitude: -0.5,
  maxLongitude: 2,
};

export function validCoordinate(latitude: number, longitude: number): RouteCoordinate | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

export function storedCoordinate(latitude?: string | null, longitude?: string | null) {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return null;
  const coordinate = validCoordinate(Number(latitude), Number(longitude));
  return coordinate && isCoordinateInTogo(coordinate) ? coordinate : null;
}

export function isCoordinateInTogo(coordinate: RouteCoordinate) {
  return (
    coordinate.latitude >= TOGO_BOUNDS.minLatitude &&
    coordinate.latitude <= TOGO_BOUNDS.maxLatitude &&
    coordinate.longitude >= TOGO_BOUNDS.minLongitude &&
    coordinate.longitude <= TOGO_BOUNDS.maxLongitude
  );
}

function normalizeGoogleMapsText(value: string) {
  let normalized = value
    .replace(/\\u003d/gi, '=')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Certaines pages Google contiennent des pourcentages qui ne forment pas un encodage URL.
  }
  return normalized;
}

export function extractCoordinate(text: string): RouteCoordinate | null {
  const readable = normalizeGoogleMapsText(text);
  const patterns = [
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/i,
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    /(?:[?&](?:q|query|destination|daddr|center|ll)=|^)(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = readable.match(pattern);
    if (!match) continue;
    const coordinate = validCoordinate(Number(match[1]), Number(match[2]));
    if (coordinate) return coordinate;
  }
  return null;
}

function isGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && GOOGLE_MAPS_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function readGoogleMapsLink(address: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(address, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const content = await response.text();
    return [
      response.url,
      response.headers.get('location') || '',
      content,
    ].filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeTogoAddress(address: string) {
  try {
    const results = await Location.geocodeAsync(address);
    for (const result of results) {
      const coordinate = validCoordinate(result.latitude, result.longitude);
      if (coordinate && isCoordinateInTogo(coordinate)) return coordinate;
    }
  } catch {
    // Une adresse non reconnue devra être confirmée manuellement sur la carte.
  }
  return null;
}

export async function resolveAddressCoordinate(address: string) {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) return null;

  const embedded = extractCoordinate(trimmedAddress);
  if (embedded && isCoordinateInTogo(embedded)) return embedded;

  if (isGoogleMapsUrl(trimmedAddress)) {
    const linkContents = await readGoogleMapsLink(trimmedAddress);
    for (const content of linkContents) {
      const coordinate = extractCoordinate(content);
      if (coordinate && isCoordinateInTogo(coordinate)) return coordinate;
    }
    return null;
  }

  return geocodeTogoAddress(trimmedAddress);
}
