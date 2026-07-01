/**
 * engine/nutrition/macros.ts
 *
 * Calculates protein, fat, and carb gram targets from a calorie budget and lean body mass.
 * Protein scales with LBM (lean body mass) and the goal type — fat-loss needs more to
 * protect muscle under a calorie deficit. Fat is fixed at 25% of total calories.
 * Carbs fill whatever calories are left after protein and fat are allocated.
 */

import type { BodyGoalType } from '../goal-engine/goal-classifier';

const CALS_PER_G_PROTEIN = 4;
const CALS_PER_G_CARB    = 4;
const CALS_PER_G_FAT     = 9;

// Fat is set at 25% of total calories — enough for hormonal health without crowding out protein.
const FAT_CALORIE_FRACTION = 0.25;

// Protein targets per kg of lean body mass by goal
const PROTEIN_G_PER_KG_LBM: Record<string, number> = {
  'fat-loss':    2.2, // higher to spare muscle under deficit
  'muscle-gain': 1.8, // sufficient for synthesis without excess
  'recomp':      2.0, // middle ground
};
const DEFAULT_PROTEIN_G_PER_KG_LBM = 2.0;

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

export function calcProteinGrams(lbmKg: number, goalType: BodyGoalType): number {
  const multiplier = PROTEIN_G_PER_KG_LBM[goalType] ?? DEFAULT_PROTEIN_G_PER_KG_LBM;
  return Math.round(lbmKg * multiplier);
}

export function calcFatGrams(calorieTarget: number): number {
  return Math.round((calorieTarget * FAT_CALORIE_FRACTION) / CALS_PER_G_FAT);
}

export function calcCarbGrams(calorieTarget: number, proteinG: number, fatsG: number): number {
  const remainingCals = calorieTarget - proteinG * CALS_PER_G_PROTEIN - fatsG * CALS_PER_G_FAT;
  return Math.max(0, Math.round(remainingCals / CALS_PER_G_CARB));
}

export function calcMacros(
  calorieTarget: number,
  lbmKg: number,
  goalType: BodyGoalType,
): MacroTargets {
  const proteinG = calcProteinGrams(lbmKg, goalType);
  const fatsG    = calcFatGrams(calorieTarget);
  const carbsG   = calcCarbGrams(calorieTarget, proteinG, fatsG);
  return { proteinG, carbsG, fatsG };
}
