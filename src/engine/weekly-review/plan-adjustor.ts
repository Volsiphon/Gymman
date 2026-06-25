import type { WeeklyAnalysisResult } from './data-analyzer';

export type GoalType = 'cut' | 'bulk' | 'maintain' | 'recomp';

export interface CurrentPlan {
  goalCaloriesPerDay: number;
  maintenanceCal: number;
  goalType: GoalType;
}

export interface AdjustedPlan {
  newGoalCaloriesPerDay: number;
  newMaintenanceCal: number;
  calorieDelta: number;   // kcal/day change from previous target
  reason: string;
}

export function adjustPlan(
  current: CurrentPlan,
  analysis: WeeklyAnalysisResult,
): AdjustedPlan {
  const newMaintenanceCal = analysis.newMaintenanceEstimate;

  // Preserve the same surplus/deficit offset the user was on.
  // When maintenance shifts, the target shifts with it — the user stays on the
  // same trajectory, just rebased on better data.
  const previousOffset = current.goalCaloriesPerDay - current.maintenanceCal;
  const newGoalCaloriesPerDay = newMaintenanceCal + previousOffset;
  const calorieDelta = newGoalCaloriesPerDay - current.goalCaloriesPerDay;

  if (analysis.dataIncomplete) {
    return {
      newGoalCaloriesPerDay,
      newMaintenanceCal,
      calorieDelta,
      reason: 'Partial week — maintenance estimate nudged, full calibration needs 5+ logged days.',
    };
  }

  if (analysis.waterRetentionSuspected) {
    return {
      newGoalCaloriesPerDay,
      newMaintenanceCal,
      calorieDelta,
      reason: 'Water retention detected — offset preserved, maintenance quietly rebased.',
    };
  }

  if (calorieDelta === 0) {
    return {
      newGoalCaloriesPerDay,
      newMaintenanceCal,
      calorieDelta,
      reason: 'Plan unchanged — maintenance estimate is stable.',
    };
  }

  const dir = calorieDelta > 0 ? 'up' : 'down';
  return {
    newGoalCaloriesPerDay,
    newMaintenanceCal,
    calorieDelta,
    reason: `Maintenance recalibrated ${dir} by ${Math.abs(analysis.maintenanceDelta)} kcal. Target updated to match.`,
  };
}
