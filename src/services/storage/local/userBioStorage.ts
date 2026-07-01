/**
 * services/storage/local/userBioStorage.ts
 *
 * Persists a lightweight UserBio snapshot — the subset of the full UserProfile
 * used by screens that only need the user's name, sex, age, and weight (not the
 * full goals, measurements, and history). Avoids loading the entire profile object
 * for simple display purposes like greeting the user by name.
 */

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
