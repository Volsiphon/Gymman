// 1 kg of body fat ≈ 7700 kcal
const KCAL_PER_KG_FAT = 7700;

// Sustainable default rates
const DEFAULT_FAT_LOSS_KG_PER_WEEK = 0.5;
const DEFAULT_MUSCLE_GAIN_KG_PER_WEEK = 0.25 / 4.33; // ~0.25 kg/month

export function calcWeeksToGoal(weightToChangeKg: number, weeklyRateKg: number): number {
  if (weeklyRateKg <= 0) return Infinity;
  return Math.ceil(Math.abs(weightToChangeKg) / weeklyRateKg);
}

export function calcDeficitForWeeklyLoss(targetWeeklyLossKg: number = DEFAULT_FAT_LOSS_KG_PER_WEEK): number {
  return Math.round((targetWeeklyLossKg * KCAL_PER_KG_FAT) / 7);
}

export function calcSurplusForWeeklyGain(targetWeeklyGainKg: number = DEFAULT_MUSCLE_GAIN_KG_PER_WEEK): number {
  return Math.round((targetWeeklyGainKg * KCAL_PER_KG_FAT) / 7);
}
