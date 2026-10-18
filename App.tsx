import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { DeliveryProvider } from './src/context/DeliveryContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  usePushNotifications();
  return <RootNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      (Text as any).defaultProps = (Text as any).defaultProps || {};
      (Text as any).defaultProps.style = [{ fontFamily: 'BeVietnamPro_400Regular' }];
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <AuthProvider>
            <DeliveryProvider>
              <AppContent />
            </DeliveryProvider>
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
