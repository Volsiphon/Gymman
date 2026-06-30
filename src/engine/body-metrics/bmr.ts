export type Sex = 'male' | 'female' | 'other';

// Mifflin-St Jeor formula. 'other' falls to the female intercept (-161).
export function calcBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161));
}
