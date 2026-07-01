/**
 * engine/body-metrics/bmr.ts
 *
 * Calculates BMR (Basal Metabolic Rate) — the calories the body burns at complete rest,
 * with no activity at all. This is the starting number every other calorie calculation
 * is built on. Uses the Mifflin-St Jeor formula, the most clinically validated option
 * for non-athletes.
 */

export type Sex = 'male' | 'female' | 'other';

// Mifflin-St Jeor formula. 'other' falls to the female intercept (-161).
export function calcBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161));
}
