/**
 * engine/nutrition/index.ts
 *
 * Public API for the nutrition calculation engine. Exports calorie target functions
 * (maintenance, goal target, dynamic adjustment) and the macro breakdown calculator.
 */

export { calcMaintenanceCal } from './maintenance-cal';
export { calcCalorieTarget } from './target-cal';
export { calcDynamicTarget } from './dynamic-adjustor';
export type { MacroTargets } from './macros';
export { calcProteinGrams, calcFatGrams, calcCarbGrams, calcMacros } from './macros';
