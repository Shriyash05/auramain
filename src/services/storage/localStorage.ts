import AsyncStorage from '@react-native-async-storage/async-storage';

export const LocalStorage = {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`[LocalStorage] Failed to get key ${key}:`, e);
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[LocalStorage] Failed to set key ${key}:`, e);
      return false;
    }
  },

  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`[LocalStorage] Failed to remove key ${key}:`, e);
      return false;
    }
  },
};
