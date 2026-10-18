import { Platform } from 'react-native';
import type {
  AppNotification,
  AvailableDelivery,
  CourseMessage,
  Delivery,
  DeliveryStats,
  DriverProfile,
  Paginated,
  Role,
  SellerProfile,
  User,
} from '../types/api';
import { tokenStorage } from './storage';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || `http://${fallbackHost}:8000/api`
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<string | null> | null = null;

function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(errorMessage).join(' ');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const wrapped = record.erreur;
    if (wrapped && typeof wrapped === 'object') {
      const wrappedRecord = wrapped as Record<string, unknown>;
      return errorMessage(
        wrappedRecord.details ?? wrappedRecord.detail ?? wrappedRecord.message ?? wrapped,
      );
    }
    if (record.details !== undefined) return errorMessage(record.details);
    if (record.detail !== undefined) return errorMessage(record.detail);
    if (record.message !== undefined) return errorMessage(record.message);
    const messages = Object.values(record)
      .map(errorMessage)
      .filter(Boolean);
    if (messages.length) return messages.join('\n');
  }
  return 'Une erreur est survenue. Réessayez.';
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const { refresh } = await tokenStorage.get();
    if (!refresh) return null;
    const response = await fetch(`${API_URL}/auth/token/rafraichir/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) {
      await tokenStorage.clear();
      return null;
    }
    const payload = (await response.json()) as { access: string; refresh?: string };
    await tokenStorage.set(payload.access, payload.refresh || refresh);
    return payload.access;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  authenticated?: boolean;
  retry?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, authenticated = true, retry = true, ...init } = options;
  const headers = new Headers(init.headers);
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const { access } = await tokenStorage.get();
    if (access) headers.set('Authorization', `Bearer ${access}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (response.status === 401 && authenticated && retry) {
    const access = await refreshAccessToken();
    if (access) return apiRequest<T>(path, { ...options, retry: false });
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  if (!response.ok) throw new ApiError(errorMessage(payload), response.status, payload);
  return payload as T;
}

function listResults<T>(payload: T[] | Paginated<T>) {
  return Array.isArray(payload) ? payload : payload.results;
}

function normalizeCoordinate(value: number) {
  return Number(value.toFixed(6));
}

export const authApi = {
  requestOtp: (telephone: string, role: Role) =>
    apiRequest<{ message: string; expire_dans: number; code_developpement?: string }>(
      '/auth/otp/demande/',
      { method: 'POST', body: { telephone, role }, authenticated: false },
    ),
  verifyOtp: (telephone: string, role: Role, code: string, nom?: string) =>
    apiRequest<{
      access: string;
      refresh: string;
      nouveau_compte: boolean;
      utilisateur: User;
    }>('/auth/otp/verification/', {
      method: 'POST',
      body: { telephone, role, code, nom },
      authenticated: false,
    }),
  me: () => apiRequest<User>('/auth/moi/'),
  logout: (refresh: string) =>
    apiRequest<void>('/auth/deconnexion/', { method: 'POST', body: { refresh } }),
};

export const driverApi = {
  profile: () => apiRequest<DriverProfile>('/livreurs/profil/'),
  updateProfile: (body: Partial<DriverProfile>) =>
    apiRequest<DriverProfile>('/livreurs/profil/', { method: 'PATCH', body }),
  setAvailability: (disponible: boolean) =>
    apiRequest<DriverProfile>('/livreurs/disponibilite/', {
      method: 'PATCH',
      body: { disponible },
    }),
  updatePosition: (latitude: number, longitude: number) =>
    apiRequest('/livreurs/position/', {
      method: 'PATCH',
      body: {
        latitude: normalizeCoordinate(latitude),
        longitude: normalizeCoordinate(longitude),
      },
    }),
  uploadDocument: (type: DriverProfile['documents'][number]['type'], asset: UploadAsset) => {
    const form = new FormData();
    form.append('type', type);
    form.append('fichier', asset as unknown as Blob);
    return apiRequest('/livreurs/documents/', { method: 'POST', body: form });
  },
};

export const sellerApi = {
  profile: () => apiRequest<SellerProfile>('/vendeurs/profil/'),
  updateProfile: (body: Partial<SellerProfile>) =>
    apiRequest<SellerProfile>('/vendeurs/profil/', { method: 'PATCH', body }),
  createAddress: (body: {
    libelle: string;
    adresse: string;
    indications?: string;
    par_defaut?: boolean;
    active?: boolean;
  }) => apiRequest('/vendeurs/adresses/', { method: 'POST', body }),
  deleteAddress: (id: string) =>
    apiRequest<void>(`/vendeurs/adresses/${id}/`, { method: 'DELETE' }),
};

export type UploadAsset = { uri: string; name: string; type: string };

export type PlaceSuggestion = {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  provider: 'google';
};

export type PlaceDetails = {
  place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  google_maps_url: string;
};

export const placesApi = {
  autocomplete: (query: string, sessionToken: string) =>
    apiRequest<{ suggestions: PlaceSuggestion[]; configured: boolean }>(
      `/localisation/autocomplete/?q=${encodeURIComponent(query)}&session_token=${encodeURIComponent(sessionToken)}`,
    ),
  details: (placeId: string, sessionToken: string) =>
    apiRequest<PlaceDetails>(
      `/localisation/details/?place_id=${encodeURIComponent(placeId)}&session_token=${encodeURIComponent(sessionToken)}`,
    ),
};

export type NewDelivery = {
  destinataire_nom: string;
  destinataire_telephone: string;
  adresse_depart: string;
  zone_depart?: string;
  depart_latitude?: number;
  depart_longitude?: number;
  adresse_arrivee: string;
  zone_arrivee?: string;
  arrivee_latitude?: number;
  arrivee_longitude?: number;
  description_colis: string;
  taille_colis: Delivery['taille_colis'];
  instructions?: string;
  prix_livraison: number;
  montant_a_recuperer: number;
  methode_paiement: Delivery['methode_paiement'];
  urgence: Delivery['urgence'];
  publier?: boolean;
  photo_colis?: UploadAsset | null;
};

export const deliveryApi = {
  list: async () =>
    listResults(await apiRequest<Delivery[] | Paginated<Delivery>>('/courses/')),
  get: (id: string) => apiRequest<Delivery>(`/courses/${id}/`),
  available: async () =>
    listResults(
      await apiRequest<AvailableDelivery[] | Paginated<AvailableDelivery>>(
        '/courses/disponibles/',
      ),
    ),
  create: (delivery: NewDelivery) => {
    if (delivery.photo_colis) {
      const form = new FormData();
      Object.entries(delivery).forEach(([key, value]) => {
        if (key === 'photo_colis' || value === undefined || value === null) return;
        form.append(key, String(value));
      });
      form.append('photo_colis', delivery.photo_colis as unknown as Blob);
      return apiRequest<Delivery>('/courses/', { method: 'POST', body: form });
    }
    return apiRequest<Delivery>('/courses/', { method: 'POST', body: delivery });
  },
  accept: (id: string) =>
    apiRequest<Delivery>(`/courses/${id}/accepter/`, { method: 'POST' }),
  transition: (id: string, statut: string, commentaire = '') =>
    apiRequest<Delivery>(`/courses/${id}/transition/`, {
      method: 'POST',
      body: { statut, commentaire },
    }),
  confirmHandoff: (id: string) =>
    apiRequest<Delivery>(`/courses/${id}/confirmer_remise/`, { method: 'POST' }),
  confirmDelivery: (id: string, pin: string, preuve?: UploadAsset | null) => {
    if (preuve) {
      const form = new FormData();
      form.append('pin', pin);
      form.append('preuve', preuve as unknown as Blob);
      return apiRequest<Delivery>(`/courses/${id}/confirmer_livraison/`, {
        method: 'POST',
        body: form,
      });
    }
    return apiRequest<Delivery>(`/courses/${id}/confirmer_livraison/`, {
      method: 'POST',
      body: { pin },
    });
  },
  cancel: (id: string, motif: string) =>
    apiRequest<Delivery>(`/courses/${id}/annuler/`, {
      method: 'POST',
      body: { motif },
    }),
  regeneratePin: (id: string) =>
    apiRequest<{ code_pin_livraison: string; code_pin_apercu: string }>(
      `/courses/${id}/regenerer_pin/`,
      { method: 'POST' },
    ),
  rate: (id: string, note: number, commentaire = '') =>
    apiRequest<Delivery>(`/courses/${id}/noter/`, {
      method: 'POST',
      body: { note, commentaire },
    }),
  report: (id: string, motif: string, description: string) =>
    apiRequest(`/courses/${id}/signalements/`, {
      method: 'POST',
      body: { motif, description },
    }),
  sendMessage: (id: string, contenu: string) =>
    apiRequest<CourseMessage>(`/courses/${id}/messages/`, {
      method: 'POST',
      body: { contenu },
    }),
  messages: (id: string) => apiRequest<CourseMessage[]>(`/courses/${id}/messages/`),
  stats: () => apiRequest<DeliveryStats>('/courses/statistiques/'),
};

export const notificationsApi = {
  list: () => apiRequest<AppNotification[]>('/auth/notifications/'),
  markRead: (ids?: string[]) =>
    apiRequest<void>('/auth/notifications/', { method: 'PATCH', body: { ids: ids || [] } }),
  registerDevice: (jeton: string, plateforme: 'android' | 'ios' | 'web') =>
    apiRequest('/auth/appareil-notification/', {
      method: 'POST',
      body: { jeton, plateforme, actif: true },
    }),
};
