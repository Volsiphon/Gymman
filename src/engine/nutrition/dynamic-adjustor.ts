import { calcMaintenanceCal } from './maintenance-cal';

// Recalculates the user's calorie target when Dynamic Mode is active.
// goalOffset is the surplus/deficit the user is targeting (negative = deficit).
export function calcDynamicTarget(
  bmr: number,
  activityBurnedKcal: number,
  goalOffset: number,
): number {
  return calcMaintenanceCal(bmr, activityBurnedKcal) + goalOffset;
}
