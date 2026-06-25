import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_NAME = '@user:name';

export async function saveUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEY_NAME, name);
}

export async function loadUserName(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_NAME);
}
