/**
 * engine/goal-engine/index.ts
 *
 * Public API for the goal-engine. Exports the classifier (what kind of goal?),
 * the realism checker (is it achievable in time?), and the path calculator (how
 * long will it take and what calorie offset is needed?).
 */

export type { BodyGoalType } from './goal-classifier';
export { classifyGoal } from './goal-classifier';

export type { GoalDirection, RealismResult } from './realism-check';
export { checkRealism } from './realism-check';

export { calcWeeksToGoal, calcDeficitForWeeklyLoss, calcSurplusForWeeklyGain } from './path-calculator';
