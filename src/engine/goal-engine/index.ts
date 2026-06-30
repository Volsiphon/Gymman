export type { BodyGoalType } from './goal-classifier';
export { classifyGoal } from './goal-classifier';

export type { GoalDirection, RealismResult } from './realism-check';
export { checkRealism } from './realism-check';

export { calcWeeksToGoal, calcDeficitForWeeklyLoss, calcSurplusForWeeklyGain } from './path-calculator';
