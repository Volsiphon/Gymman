/**
 * engine/weekly-review/index.ts
 *
 * Public API for the weekly review engine. analyzeWeek() crunches the numbers;
 * adjustPlan() uses those numbers to update the user's calorie target.
 */

export { analyzeWeek } from './data-analyzer';
export { adjustPlan } from './plan-adjustor';

export type {
  DailyLog,
  WeeklyAnalysisInput,
  WeeklyAnalysisResult,
  Insight,
  InsightType,
} from './data-analyzer';

export type {
  GoalType,
  CurrentPlan,
  AdjustedPlan,
} from './plan-adjustor';
