/**
 * engine/nutrition/dynamic-adjustor.ts
 *
 * Recalculates the daily calorie target when Dynamic Mode is active.
 * Dynamic Mode means the user's calorie allowance rises with activity: every
 * calorie they burn and log in the Calory Burn section gets added back to their
 * sedentary baseline. The goal offset (deficit or surplus) is then applied on top.
 */

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
