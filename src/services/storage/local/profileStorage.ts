/**
 * services/storage/local/profileStorage.ts
 *
 * Persists the user's active nutrition goals (daily calories, protein, carbs, fats,
 * and optional goal weight). These goals are read by GoalsContext on every app focus
 * and surfaced on the Plan screen's Today's Targets card and the Diet screen.
 *
 * Note: the full user profile (including these goals) lives in userProfileStorage.ts.
 * This file handles the lighter-weight NutritionGoals shape used by the Diet screen
 * when it only needs macro targets, not the full profile.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NutritionGoals } from '@/types/user';


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
