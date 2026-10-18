import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { notificationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Device.isDevice) return;
    let cancelled = false;

    const register = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('wona', {
          name: 'Notifications Wona',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E8791E',
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const permission =
        current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted' || cancelled) return;

      const projectId =
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;
      if (!projectId) return;

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!cancelled) {
        await notificationsApi.registerDevice(
          token.data,
          Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        );
      }
    };

    register().catch(() => {
      // L'app reste utilisable sans notifications si le projet EAS n'est pas configuré.
    });
    return () => {
      cancelled = true;
    };
  }, [user]);
}

