import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gymman_user_bio';

export type UserBio = {
  bmr: number;
  goalOffset: number; // e.g. -500 for fat-loss, +250 for muscle-gain, 0 for recomp
};

export async function saveUserBio(bio: UserBio): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(bio));
}

export async function loadUserBio(): Promise<UserBio | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as UserBio; } catch { return null; }
}
