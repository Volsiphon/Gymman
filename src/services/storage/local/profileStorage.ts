import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NutritionGoals } from '@/types/user';

// NutritionGoals is now defined in @/types/user — re-exported here for backwards compatibility.
export type { NutritionGoals } from '@/types/user';

const KEY = 'gymman_nutrition_goals';

export async function saveNutritionGoals(goals: NutritionGoals): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(goals));
}

export async function loadNutritionGoals(): Promise<NutritionGoals | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NutritionGoals;
  } catch {
    return null;
  }
}
