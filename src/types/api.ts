export type Role = 'vendeur' | 'livreur';

export type DeliveryStatus =
  | 'brouillon'
  | 'en_attente'
  | 'acceptee'
  | 'en_route_retrait'
  | 'arrive_retrait'
  | 'colis_recupere'
  | 'en_livraison'
  | 'livree'
  | 'echec'
  | 'annulee_vendeur'
  | 'annulee_livreur'
  | 'litige';

export type User = {
  id: string;
  telephone: string;
  nom_complet: string;
  role: Role;
  telephone_verifie: boolean;
  photo?: string | null;
  whatsapp?: string;
  is_active: boolean;
  validation_livreur?: 'en_attente' | 'valide' | 'refuse' | 'suspendu' | null;
};

export type DriverDocument = {
  id: string;
  type: 'cni' | 'permis' | 'carte_grise' | 'photo_livreur' | 'photo_vehicule';
  type_label: string;
  fichier?: string;
  url_telechargement: string;
  statut: 'en_attente' | 'valide' | 'refuse';
  commentaire_admin: string;
  date_televersement: string;
};

export type PickupAddress = {
  id: string;
  libelle: string;
  adresse: string;
  latitude?: string | null;
  longitude?: string | null;
  indications: string;
  par_defaut: boolean;
  active: boolean;
};

export type SellerProfile = {
  id: string;
  nom: string;
  telephone: string;
  categorie: string;
  adresse: string;
  latitude?: string | null;
  longitude?: string | null;
  logo?: string | null;
  whatsapp: string;
  note_moyenne: string;
  nombre_avis: number;
  adresses_retrait: PickupAddress[];
};

export type DriverProfile = {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  moyen_transport: 'moto' | 'velo' | 'voiture' | 'tricycle' | 'autre';
  immatriculation_moto: string;
  photo?: string | null;
  statut_verification: 'en_attente' | 'valide' | 'refuse' | 'suspendu';
  statut_disponibilite: 'disponible' | 'en_livraison' | 'hors_ligne';
  commentaire_verification: string;
  note_moyenne: string;
  nombre_avis: number;
  derniere_position_lat?: string | null;
  derniere_position_lng?: string | null;
  position_mise_a_jour_le?: string | null;
  peut_accepter_course: boolean;
  documents: DriverDocument[];
};

export type DriverSummary = Omit<DriverProfile, 'documents'> & {
  documents?: DriverDocument[];
};

export type StatusHistory = {
  id: string;
  ancien_statut: DeliveryStatus | '';
  nouveau_statut: DeliveryStatus;
  libelle: string;
  auteur: string;
  commentaire: string;
  date_creation: string;
};

export type Payment = {
  id: string;
  type: 'livraison' | 'encaissement' | 'commission';
  montant: string;
  methode: 'especes' | 'tmoney' | 'flooz' | 'direct';
  reference: string;
  statut: string;
};

export type Delivery = {
  id: string;
  reference: string;
  vendeur_detail: {
    nom: string;
    note_moyenne: string;
    nombre_avis: number;
    telephone?: string;
    whatsapp?: string;
  };
  livreur?: string | null;
  livreur_detail?: DriverSummary | null;
  destinataire_nom: string;
  destinataire_telephone?: string | null;
  adresse_depart: string;
  zone_depart: string;
  depart_latitude?: string | null;
  depart_longitude?: string | null;
  adresse_arrivee: string;
  zone_arrivee: string;
  arrivee_latitude?: string | null;
  arrivee_longitude?: string | null;
  distance_estimee_km?: string | null;
  description_colis: string;
  taille_colis: 'petit' | 'moyen' | 'grand' | 'tres_grand';
  instructions: string;
  photo_colis?: string | null;
  prix_livraison: string;
  montant_a_recuperer?: string | null;
  methode_paiement: 'especes' | 'tmoney' | 'flooz' | 'direct';
  urgence: 'normale' | 'urgente' | 'express';
  statut: DeliveryStatus;
  statut_label: string;
  code_pin_apercu: string;
  code_pin_livraison?: string;
  remise_confirmee_par_vendeur: boolean;
  date_creation: string;
  livree_le?: string | null;
  historique_statuts: StatusHistory[];
  paiements: Payment[];
  peut_modifier: boolean;
  peut_annuler: boolean;
  informations_masquees: boolean;
};

export type AvailableDelivery = Pick<
  Delivery,
  | 'id'
  | 'reference'
  | 'zone_depart'
  | 'zone_arrivee'
  | 'distance_estimee_km'
  | 'description_colis'
  | 'taille_colis'
  | 'prix_livraison'
  | 'urgence'
  | 'date_creation'
> & {
  taille_label: string;
  urgence_label: string;
  vendeur: { nom: string; note_moyenne: string; nombre_avis: number };
};

export type DeliveryStats = {
  total: number;
  livrees: number;
  annulees: number;
  en_cours: number;
  montant_livraisons: number | string;
};

export type AppNotification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  donnees: { course_id?: string; [key: string]: unknown };
  lu_le?: string | null;
  cree_le: string;
};

export type CourseMessage = {
  id: string;
  auteur_nom: string;
  auteur_role: Role;
  contenu: string;
  date_creation: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
