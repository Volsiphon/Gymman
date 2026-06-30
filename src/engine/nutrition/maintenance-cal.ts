// Sedentary baseline multiplier applied to BMR before adding explicit activity calories.
// When Dynamic Mode is on, activity calories are logged separately and added to this base.
const SEDENTARY_MULTIPLIER = 1.2;

export function calcMaintenanceCal(bmr: number, activityBurnedKcal: number = 0): number {
  return Math.round(bmr * SEDENTARY_MULTIPLIER) + activityBurnedKcal;
}
