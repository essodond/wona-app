export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  ChoixProfil: undefined;
  Connexion: { role: 'vendeur' | 'livreur' };
  OTP: { role: 'vendeur' | 'livreur'; phone: string; developmentCode?: string };
  VendeurTabs: undefined;
  VendeurPublierColis: undefined;
  VendeurLivreursDisponibles: undefined;
  VendeurSuivi: { courseId: string };
  VendeurConfirmationNotation: { courseId: string };
  Notifications: undefined;
  CourseMessages: { courseId: string };
  LivreurInscriptionDocuments: undefined;
  LivreurAttenteValidation: undefined;
  LivreurTabs: undefined;
  LivreurDetailDemande: { courseId: string };
  LivreurCourseActive: { courseId: string };
  LivreurNavigation: { courseId: string };
  LivreurHistoriqueDetail: { courseId: string };
  LivreurResumeFinCourse: { courseId: string };
  LivreurAbonnement: undefined;
};

export type VendeurTabParamList = {
  VendeurAccueil: undefined;
  VendeurMesLivraisons: undefined;
  VendeurHistorique: undefined;
  VendeurProfil: undefined;
};

export type LivreurTabParamList = {
  LivreurAccueil: undefined;
  LivreurHistorique: undefined;
  LivreurProfil: undefined;
};
