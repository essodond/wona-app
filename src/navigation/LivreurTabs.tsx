import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { LivreurTabParamList } from './types';
import GlassTabBar from '../components/GlassTabBar';
import LivreurAccueilScreen from '../screens/livreur/LivreurAccueilScreen';
import LivreurHistoriqueRevenusScreen from '../screens/livreur/LivreurHistoriqueRevenusScreen';
import LivreurProfilScreen from '../screens/livreur/LivreurProfilScreen';

const Tab = createBottomTabNavigator<LivreurTabParamList>();

const TABS = [
  { name: 'LivreurAccueil' as const, label: 'Accueil', icon: 'home' as const },
  { name: 'LivreurHistorique' as const, label: 'Historique', icon: 'time' as const },
  { name: 'LivreurProfil' as const, label: 'Profil', icon: 'person' as const },
];

export default function LivreurTabs() {
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
            tab.name === 'LivreurAccueil'
              ? LivreurAccueilScreen
              : tab.name === 'LivreurHistorique'
              ? LivreurHistoriqueRevenusScreen
              : LivreurProfilScreen
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
