import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'wona.access';
const REFRESH_KEY = 'wona.refresh';

const getItem = (key: string) =>
  Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);

const setItem = (key: string, value: string) =>
  Platform.OS === 'web'
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

const deleteItem = (key: string) =>
  Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);

export const tokenStorage = {
  async get() {
    const [access, refresh] = await Promise.all([getItem(ACCESS_KEY), getItem(REFRESH_KEY)]);
    return { access, refresh };
  },
  async set(access: string, refresh: string) {
    await Promise.all([setItem(ACCESS_KEY, access), setItem(REFRESH_KEY, refresh)]);
  },
  async clear() {
    await Promise.all([deleteItem(ACCESS_KEY), deleteItem(REFRESH_KEY)]);
  },
};

export const deliveryPinStorage = {
  get: (deliveryId: string) => getItem(`wona.pin.${deliveryId}`),
  set: (deliveryId: string, pin: string) => setItem(`wona.pin.${deliveryId}`, pin),
  clear: (deliveryId: string) => deleteItem(`wona.pin.${deliveryId}`),
};
