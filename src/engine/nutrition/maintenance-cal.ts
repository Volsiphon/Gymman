/**
 * engine/nutrition/maintenance-cal.ts
 *
 * Calculates maintenance calories for Dynamic Mode. Instead of using the full TDEE
 * activity multiplier, Dynamic Mode starts from a sedentary baseline (BMR × 1.2)
 * and then adds whatever activity calories the user actually logged today.
 * This makes the calorie target rise and fall with real activity, not an estimate.
 */

// Sedentary baseline multiplier applied to BMR before adding explicit activity calories.
// When Dynamic Mode is on, activity calories are logged separately and added to this base.
const SEDENTARY_MULTIPLIER = 1.2;

export function calcMaintenanceCal(bmr: number, activityBurnedKcal: number = 0): number {
  return Math.round(bmr * SEDENTARY_MULTIPLIER) + activityBurnedKcal;
}
