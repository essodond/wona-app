export type Driver = {
  id: string;
  name: string;
  rating: number;
  ratingCount: number;
  distanceKm: number;
  vehicle: string;
  tag: string;
  recommended?: boolean;
  verified?: boolean;
};

export const drivers: Driver[] = [
  {
    id: 'd1',
    name: 'Moussa Diakité',
    rating: 4.8,
    ratingCount: 124,
    distanceKm: 1.2,
    vehicle: 'Moto',
    tag: 'Rapide',
  },
  {
    id: 'd2',
    name: 'Awa Kouamé',
    rating: 5.0,
    ratingCount: 89,
    distanceKm: 0.8,
    vehicle: 'Vélo',
    tag: 'Écolo',
  },
  {
    id: 'd3',
    name: 'Jean-Marc Koffi',
    rating: 4.2,
    ratingCount: 210,
    distanceKm: 2.5,
    vehicle: 'Camionnette',
    tag: 'Gros volume',
  },
  {
    id: 'd4',
    name: 'Sarah Touré',
    rating: 4.9,
    ratingCount: 452,
    distanceKm: 1.5,
    vehicle: 'Moto',
    tag: 'Premium',
    recommended: true,
    verified: true,
  },
];

export type DeliveryHistoryItem = {
  id: string;
  group: string;
  driverName: string;
  driverRating: number;
  driverTag: string;
  destination: string;
  date: string;
  price: string;
  status: string;
  myRating?: number;
};

export const vendeurHistory: DeliveryHistoryItem[] = [
  {
    id: 'h1',
    group: "Aujourd'hui",
    driverName: 'Moussa Traoré',
    driverRating: 4.9,
    driverTag: 'Coursier Gold',
    destination: 'Plateau, Avenue Marchand, Abidjan',
    date: '14 Oct, 14:30',
    price: '2,500 FCFA',
    status: 'Terminé',
    myRating: 5,
  },
  {
    id: 'h2',
    group: 'Hier',
    driverName: 'Awa Diop',
    driverRating: 4.8,
    driverTag: 'Express Pro',
    destination: 'Cocody Ambassades, Rue 12',
    date: '13 Oct, 11:15',
    price: '3,800 FCFA',
    status: 'Terminé',
    myRating: 4,
  },
  {
    id: 'h3',
    group: 'Hier',
    driverName: 'Koffi Kouamé',
    driverRating: 5.0,
    driverTag: 'Expert Van',
    destination: 'Yopougon Selmer, Près du Marché',
    date: '13 Oct, 09:40',
    price: '1,200 FCFA',
    status: 'Terminé',
    myRating: 5,
  },
];

export type DeliveryRequest = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  paymentMethod: string;
  distanceKm: number;
  etaMin: number;
  icon: string;
};

export const nearbyRequests: DeliveryRequest[] = [
  {
    id: 'r1',
    title: 'Livraison Express',
    subtitle: 'Colis (2.5kg) • Cocody',
    price: '2 500 CFA',
    paymentMethod: 'Paiement Cash',
    distanceKm: 1.2,
    etaMin: 15,
    icon: 'package-variant',
  },
  {
    id: 'r2',
    title: 'Menu Burger King',
    subtitle: 'Repas • Plateau',
    price: '1 800 CFA',
    paymentMethod: 'WONA Pay',
    distanceKm: 3.5,
    etaMin: 22,
    icon: 'silverware-fork-knife',
  },
  {
    id: 'r3',
    title: 'Courses Epicerie',
    subtitle: 'Articles variés • Riviera 2',
    price: '3 200 CFA',
    paymentMethod: 'Paiement Cash',
    distanceKm: 0.8,
    etaMin: 8,
    icon: 'shopping-outline',
  },
];

export const requestDetail = {
  pickup: 'Plateau, Avenue Marchand',
  dropoff: 'Cocody, Riviera 3',
  price: '5 500 FCFA',
  size: 'Taille M (40x30cm)',
  weight: 'Environ 3 kg',
  description:
    "Colis contenant des pièces de rechange automobile fragiles. Bien emballé dans un carton rigide. Nécessite une manipulation délicate et un transport à l'abri de l'humidité.",
  urgent: true,
  deadline: 'Avant 14:00',
  sender: {
    name: 'Jean-Marc KOFFI',
    rating: 4.8,
    memberSince: 'Membre depuis 2 ans',
  },
};

export const activeTrip = {
  customerName: 'Moussa Traoré',
  address: 'Plateau, Rue du Commerce',
  packageInfo: 'Standard (2kg)',
  etaMin: 4,
  distanceKm: 1.2,
  instruction: "Tournez à droite sur l'Avenue Jean-Paul II",
  instructionDistance: '450 m',
};

export const tripSummary = {
  amount: '3 500',
  durationMin: 24,
  distanceKm: 8.2,
  client: { name: 'Moussa Traoré', rating: 4.9, tag: 'Client VIP' },
  route: 'Plateau ➔ Cocody',
  paymentMethod: 'Espèces',
};

export const trackingInfo = {
  driver: { name: 'Moussa Diop', rating: 4.9, tag: 'Moto Express' },
  etaMin: 8,
  distanceKm: 1.4,
  orderId: '#WN-9021',
  orderLabel: 'Livraison Repas • Plateau',
  progress: 0.75,
  statusText: 'Le livreur approche de votre position.',
};

export const ratingContext = {
  driver: { name: 'Moussa Traoré', tag: 'Livraison Express • Toyota Hilux', rating: 4.9 },
  quickTags: ['Rapide', 'Courtois', 'Colis soigné'],
};

export const driverProfile = {
  name: 'Moussa Diop',
  rating: 4.8,
  deliveries: 150,
  score: '4.8/5',
  premiumActive: true,
  subscriptionExpiry: '30/11/2026',
};

export const subscriptionPlans = [
  {
    id: 'standard',
    name: 'Standard',
    price: '2500 F',
    period: '/ mois',
    current: true,
    features: ['Suivi en temps réel', 'Support standard 24/7', '3 livraisons prioritaires / mois'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '5000 F',
    period: '/ mois',
    recommended: true,
    verified: true,
    features: [
      'Tout le plan Standard',
      'Livraisons gratuites illimitées',
      'Assurance premium incluse',
      'Gestionnaire de compte dédié',
    ],
  },
];

export const earnings = {
  monthTotal: '145.250 FCFA',
  trendVsLastWeek: '+12%',
  weeklyAverage: '18.400/j',
  chart: [
    { label: 'L', value: 60, amount: '12k' },
    { label: 'M', value: 85, amount: '18k' },
    { label: 'M', value: 45, amount: '9k' },
    { label: 'J', value: 70, amount: '14k' },
    { label: 'V', value: 95, amount: '22k' },
    { label: 'S', value: 100, amount: '25k' },
    { label: 'D', value: 30, amount: '6k' },
  ],
};

export type RevenueTrip = {
  id: string;
  title: string;
  amount: string;
  date: string;
  route: string;
  icon: string;
};

export const revenueTrips: RevenueTrip[] = [
  { id: 't1', title: 'Livraison Express', amount: '3.500 FCFA', date: 'Hier, 14:20', route: 'Plateau → Cocody', icon: 'truck-delivery-outline' },
  { id: 't2', title: 'Courses Alimentaires', amount: '5.200 FCFA', date: '12 Mai, 10:45', route: 'Riviera 3 → Zone 4', icon: 'basket-outline' },
  { id: 't3', title: 'Dépôt Colis', amount: '2.800 FCFA', date: '11 Mai, 16:30', route: 'Yopougon → Adjamé', icon: 'package-variant-closed' },
  { id: 't4', title: 'Livraison Food', amount: '1.500 FCFA', date: '11 Mai, 12:15', route: 'Angré 7ème → 8ème', icon: 'silverware-fork-knife' },
];

export const onboardingSteps = [
  {
    id: 1,
    image: require('../../assets/onboarding/publish-parcel.jpg'),
    imageLabel: 'Une commerçante confie un colis à un livreur Wona',
    title: 'Publiez un colis, un livreur vous répond',
    text: 'Simple et rapide. Décrivez votre besoin et recevez des propositions instantanément.',
  },
  {
    id: 2,
    image: require('../../assets/onboarding/live-tracking.jpg'),
    imageLabel: 'Une commerçante suit l’arrivée de son livreur sur son téléphone',
    title: 'Suivez votre livraison en temps réel',
    text: "Gardez l'esprit tranquille. Visualisez chaque étape du trajet de votre colis sur la carte.",
  },
  {
    id: 3,
    image: require('../../assets/onboarding/cash-on-delivery.jpg'),
    imageLabel: 'Une cliente règle sa course après avoir reçu son colis',
    title: 'Payez en espèces à la livraison',
    text: 'Pas besoin de carte bancaire. Réglez votre course en toute sécurité une fois le colis reçu.',
  },
];

export const nearbyDriverMarkers = [
  { id: 'm1', top: '30%', left: '40%' },
  { id: 'm2', top: '55%', left: '25%' },
  { id: 'm3', top: '40%', right: '30%' },
  { id: 'm4', bottom: '40%', left: '60%' },
];

export const OTP_VALID_CODE = '123456';
export const MOCK_PHONE_SUFFIX = '71608097';
