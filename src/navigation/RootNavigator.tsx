import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { colors } from '../theme';

import SplashScreen from '../screens/onboarding/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import ChoixProfilScreen from '../screens/onboarding/ChoixProfilScreen';
import ConnexionScreen from '../screens/onboarding/ConnexionScreen';
import OTPScreen from '../screens/onboarding/OTPScreen';

import VendeurTabs from './VendeurTabs';
import VendeurPublierColisScreen from '../screens/vendeur/VendeurPublierColisScreen';
import VendeurLivreursDisponiblesScreen from '../screens/vendeur/VendeurLivreursDisponiblesScreen';
import VendeurSuiviScreen from '../screens/vendeur/VendeurSuiviScreen';
import VendeurConfirmationNotationScreen from '../screens/vendeur/VendeurConfirmationNotationScreen';

import LivreurInscriptionDocumentsScreen from '../screens/livreur/LivreurInscriptionDocumentsScreen';
import LivreurAttenteValidationScreen from '../screens/livreur/LivreurAttenteValidationScreen';
import LivreurTabs from './LivreurTabs';
import LivreurDetailDemandeScreen from '../screens/livreur/LivreurDetailDemandeScreen';
import LivreurCourseActiveScreen from '../screens/livreur/LivreurCourseActiveScreen';
import LivreurNavigationScreen from '../screens/livreur/LivreurNavigationScreen';
import LivreurHistoriqueDetailScreen from '../screens/livreur/LivreurHistoriqueDetailScreen';
import LivreurResumeFinCourseScreen from '../screens/livreur/LivreurResumeFinCourseScreen';
import LivreurAbonnementScreen from '../screens/livreur/LivreurAbonnementScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import CourseMessagesScreen from '../screens/common/CourseMessagesScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={user ? `${user.role}-${user.validation_livreur}` : 'guest'}
      initialRouteName={
        !user
          ? 'Splash'
          : user.role === 'vendeur'
            ? 'VendeurTabs'
            : user.validation_livreur === 'valide'
              ? 'LivreurTabs'
              : 'LivreurInscriptionDocuments'
      }
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="ChoixProfil" component={ChoixProfilScreen} />
          <Stack.Screen name="Connexion" component={ConnexionScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
        </>
      ) : (
        <>
          {user.role === 'vendeur' ? (
            <>
              <Stack.Screen name="VendeurTabs" component={VendeurTabs} />
              <Stack.Screen name="VendeurPublierColis" component={VendeurPublierColisScreen} />
              <Stack.Screen name="VendeurLivreursDisponibles" component={VendeurLivreursDisponiblesScreen} />
              <Stack.Screen name="VendeurSuivi" component={VendeurSuiviScreen} />
              <Stack.Screen name="VendeurConfirmationNotation" component={VendeurConfirmationNotationScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="LivreurInscriptionDocuments" component={LivreurInscriptionDocumentsScreen} />
              <Stack.Screen name="LivreurAttenteValidation" component={LivreurAttenteValidationScreen} />
              <Stack.Screen name="LivreurTabs" component={LivreurTabs} />
              <Stack.Screen name="LivreurDetailDemande" component={LivreurDetailDemandeScreen} />
              <Stack.Screen name="LivreurCourseActive" component={LivreurCourseActiveScreen} />
              <Stack.Screen name="LivreurNavigation" component={LivreurNavigationScreen} />
              <Stack.Screen name="LivreurHistoriqueDetail" component={LivreurHistoriqueDetailScreen} />
              <Stack.Screen name="LivreurResumeFinCourse" component={LivreurResumeFinCourseScreen} />
              <Stack.Screen name="LivreurAbonnement" component={LivreurAbonnementScreen} />
            </>
          )}
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="CourseMessages" component={CourseMessagesScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
