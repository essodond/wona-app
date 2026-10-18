import type { DeliveryStatus } from '../types/api';

export const money = (value: string | number | null | undefined) =>
  `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

export const dateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const TERMINAL_STATUSES: DeliveryStatus[] = [
  'livree',
  'echec',
  'annulee_vendeur',
  'annulee_livreur',
  'litige',
];

export const STATUS_PROGRESS: Record<DeliveryStatus, number> = {
  brouillon: 0.05,
  en_attente: 0.1,
  acceptee: 0.2,
  en_route_retrait: 0.35,
  arrive_retrait: 0.48,
  colis_recupere: 0.62,
  en_livraison: 0.8,
  livree: 1,
  echec: 1,
  annulee_vendeur: 1,
  annulee_livreur: 1,
  litige: 1,
};

