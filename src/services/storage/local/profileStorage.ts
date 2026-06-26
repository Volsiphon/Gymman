import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gymman_nutrition_goals';

export type NutritionGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  goalWeightKg?: number;
};

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
