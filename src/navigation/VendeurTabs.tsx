import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { VendeurTabParamList } from './types';
import GlassTabBar from '../components/GlassTabBar';
import VendeurAccueilScreen from '../screens/vendeur/VendeurAccueilScreen';
import VendeurMesLivraisonsScreen from '../screens/vendeur/VendeurMesLivraisonsScreen';
import VendeurHistoriqueScreen from '../screens/vendeur/VendeurHistoriqueScreen';
import VendeurProfilScreen from '../screens/vendeur/VendeurProfilScreen';

const Tab = createBottomTabNavigator<VendeurTabParamList>();

const TABS = [
  { name: 'VendeurAccueil' as const, label: 'Accueil', icon: 'home' as const },
  { name: 'VendeurMesLivraisons' as const, label: 'Livraison', icon: 'cube' as const },
  { name: 'VendeurHistorique' as const, label: 'Historique', icon: 'time' as const },
  { name: 'VendeurProfil' as const, label: 'Profil', icon: 'person-circle' as const },
];

export default function VendeurTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={
            tab.name === 'VendeurAccueil'
              ? VendeurAccueilScreen
              : tab.name === 'VendeurMesLivraisons'
              ? VendeurMesLivraisonsScreen
              : tab.name === 'VendeurHistorique'
              ? VendeurHistoriqueScreen
              : VendeurProfilScreen
          }
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} color={color} size={size} />
            ),
            tabBarLabel: tab.label,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
