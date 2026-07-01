/**
 * engine/goal-engine/realism-check.ts
 *
 * Checks whether a user's weight-change goal is biologically achievable in the
 * timeframe they want. Used by the GoalAnalysis screen to decide whether to show
 * one optimised goal or an A/B choice (feasible path vs. aspirational path).
 * The limits here are for natural athletes — no steroids, no crash dieting.
 */

// Conservative upper bounds on achievable body change rates for natural athletes.
const MAX_FAT_LOSS_KG_PER_WEEK = 1.0;
const MAX_MUSCLE_GAIN_KG_PER_MONTH = 2.0;

export type GoalDirection = 'fat-loss' | 'muscle-gain';

export interface RealismResult {
  isRealistic: boolean;
  safeWeeklyRateKg: number;
  note: string;
}

export function checkRealism(
  weightChangeKg: number,
  timelineWeeks: number,
  direction: GoalDirection,
): RealismResult {
  if (timelineWeeks <= 0) {
    return { isRealistic: false, safeWeeklyRateKg: 0, note: 'Timeline must be at least 1 week.' };
  }

  const requiredRateKg = Math.abs(weightChangeKg) / timelineWeeks;

  if (direction === 'fat-loss') {
    const isRealistic = requiredRateKg <= MAX_FAT_LOSS_KG_PER_WEEK;
    return {
      isRealistic,
      safeWeeklyRateKg: MAX_FAT_LOSS_KG_PER_WEEK,
      note: isRealistic
        ? 'Timeline is achievable at a safe fat-loss pace.'
        : `Requires ${requiredRateKg.toFixed(2)} kg/week loss — above the safe maximum of ${MAX_FAT_LOSS_KG_PER_WEEK} kg/week.`,
    };
  } else {
    const maxGainPerWeek = MAX_MUSCLE_GAIN_KG_PER_MONTH / 4.33;
    const isRealistic = requiredRateKg <= maxGainPerWeek;
    return {
      isRealistic,
      safeWeeklyRateKg: maxGainPerWeek,
      note: isRealistic
        ? 'Timeline is achievable at a natural muscle-gain pace.'
        : `Requires ${requiredRateKg.toFixed(2)} kg/week — above what natural training produces.`,
    };
  }
}
