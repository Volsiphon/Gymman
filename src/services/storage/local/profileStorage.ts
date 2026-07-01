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

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';
import type { NutritionGoals } from '@/types/user';


const KEY = 'nutritionGoals';
const LEGACY_KEYS = ['gymman_nutrition_goals'];

export async function saveNutritionGoals(goals: NutritionGoals): Promise<void> {
  await writeLocal(KEY, goals);
}

export async function loadNutritionGoals(): Promise<NutritionGoals | null> {
  return readLocal<NutritionGoals>(KEY, LEGACY_KEYS);
}
