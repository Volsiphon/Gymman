/**
 * engine/body-metrics/tdee.ts
 *
 * Calculates TDEE (Total Daily Energy Expenditure) — the total calories the body burns
 * in a day including all movement and exercise. It's simply BMR × an activity multiplier.
 * TDEE is the "maintenance" number: eat at TDEE to hold weight, below to lose, above to gain.
 */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  active:    1.725,
  extreme:   1.9,
};

export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55));
}
