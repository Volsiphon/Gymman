/**
 * engine/nutrition/target-cal.ts
 *
 * Applies the goal offset to TDEE to produce the daily calorie target.
 * Fat loss = TDEE minus 500 kcal (roughly 0.5 kg/week loss).
 * Muscle gain = TDEE plus 250 kcal (lean bulk — minimises fat gain).
 * Recomp and non-body-comp goals stay at maintenance (TDEE).
 */

import type { BodyGoalType } from '../goal-engine/goal-classifier';

const FAT_LOSS_DEFICIT   = 500; // kcal below maintenance
const MUSCLE_GAIN_SURPLUS = 250; // kcal above maintenance

export function calcCalorieTarget(tdee: number, goalType: BodyGoalType): number {
  if (goalType === 'fat-loss')    return tdee - FAT_LOSS_DEFICIT;
  if (goalType === 'muscle-gain') return tdee + MUSCLE_GAIN_SURPLUS;
  return tdee; // recomp and non-body-comp goals sit at maintenance
}
