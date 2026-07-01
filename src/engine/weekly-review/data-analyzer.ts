/**
 * engine/weekly-review/data-analyzer.ts
 *
 * The core of the 7-day weekly review feature. Takes a full week of diet logs and
 * weight entries, then works out:
 *   - What calories were actually consumed vs. the goal
 *   - Whether weight changed as the calories would predict, or if something's off
 *   - Whether the discrepancy looks like water retention (scale moved the wrong way)
 *   - What the user's real maintenance calories appear to be (reverse-engineered from
 *     actual weight change vs. calories eaten)
 *   - An updated maintenance estimate blended with the prior estimate
 *
 * The calibrated maintenance estimate is the key output — it feeds plan-adjustor.ts
 * which then nudges the user's daily calorie target to match their real metabolism.
 */

// 1 kg of body fat ≈ 7700 kcal
const KCAL_PER_KG = 7700;

// If actual weight change differs from expected by more than this AND moves
// in the opposite direction, we suspect water retention rather than fat change.
const WATER_RETENTION_THRESHOLD_KG = 0.6;

// Minimum logged diet days to attempt a maintenance recalibration.
const MIN_DIET_DAYS_FOR_CALIBRATION = 5;

// How much weight (0–1) we put on the implied maintenance vs the current
// estimate. Low early on; could increase as more weeks accumulate.
const CALIBRATION_BLEND = 0.3;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DailyLog {
  date: string;              // 'YYYY-MM-DD'
  caloriesEaten: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  weightKg: number | null;
  trainingDone: boolean;
}

export interface WeeklyAnalysisInput {
  weekStartDate: string;     // Monday of the week, 'YYYY-MM-DD'
  days: DailyLog[];          // exactly 7, index 0 = Monday
  currentMaintenanceCal: number;
  goalCaloriesPerDay: number;
}

export type InsightType = 'info' | 'warning' | 'success' | 'adjustment';

export interface Insight {
  type: InsightType;
  text: string;
}

export interface WeeklyAnalysisResult {
  weekStartDate: string;

  // ── Coverage
  dietLoggedDays: number;
  weightLoggedDays: number;
  confidence: 'low' | 'medium' | 'high';

  // ── Calorie summary
  totalCaloriesEaten: number;
  avgDailyCaloriesEaten: number;
  totalGoalCalories: number;
  totalSurplusDeficit: number;       // negative = deficit

  // ── Weight
  startWeightKg: number | null;
  endWeightKg: number | null;
  actualWeightChangeKg: number | null;
  expectedWeightChangeKg: number | null;  // derived from calorie math
  weightCalorieDeltaKg: number | null;    // actual − expected

  // ── Anomaly flags
  waterRetentionSuspected: boolean;
  dataIncomplete: boolean;

  // ── Calibration
  impliedMaintenanceCal: number | null;
  newMaintenanceEstimate: number;
  maintenanceDelta: number;

  // ── Human-readable insights
  insights: Insight[];
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function analyzeWeek(input: WeeklyAnalysisInput): WeeklyAnalysisResult {
  const { days, currentMaintenanceCal, goalCaloriesPerDay, weekStartDate } = input;

  // ── Coverage ────────────────────────────────────────────────────────────────
  const dietLoggedDays   = days.filter(d => d.caloriesEaten !== null).length;
  const weightLoggedDays = days.filter(d => d.weightKg !== null).length;

  const confidence: 'low' | 'medium' | 'high' =
    dietLoggedDays >= 6 && weightLoggedDays >= 2 ? 'high'   :
    dietLoggedDays >= 4 && weightLoggedDays >= 1 ? 'medium' : 'low';

  // ── Calorie summary ─────────────────────────────────────────────────────────
  const totalCaloriesEaten = days.reduce(
    (sum, d) => sum + (d.caloriesEaten ?? 0), 0,
  );
  const avgDailyCaloriesEaten = dietLoggedDays > 0
    ? Math.round(totalCaloriesEaten / dietLoggedDays)
    : 0;
  const totalGoalCalories = goalCaloriesPerDay * 7;

  // Surplus/deficit is measured only against the days that were actually logged.
  // (We can't know what happened on unlogged days, so we scope the math.)
  const totalSurplusDeficit =
    totalCaloriesEaten - currentMaintenanceCal * dietLoggedDays;

  // ── Weight ──────────────────────────────────────────────────────────────────
  const weightLogs = days.filter(d => d.weightKg !== null);
  const startWeightKg = weightLogs.length > 0 ? weightLogs[0].weightKg : null;
  const endWeightKg   = weightLogs.length > 1 ? weightLogs[weightLogs.length - 1].weightKg : null;

  const actualWeightChangeKg =
    startWeightKg !== null && endWeightKg !== null
      ? parseFloat((endWeightKg - startWeightKg).toFixed(2))
      : null;

  // Expected change: if you're in X kcal surplus over logged days,
  // pure fat math says you should change by X/7700 kg.
  const expectedWeightChangeKg =
    dietLoggedDays > 0
      ? parseFloat((totalSurplusDeficit / KCAL_PER_KG).toFixed(2))
      : null;

  const weightCalorieDeltaKg =
    actualWeightChangeKg !== null && expectedWeightChangeKg !== null
      ? parseFloat((actualWeightChangeKg - expectedWeightChangeKg).toFixed(2))
      : null;

  // ── Anomaly detection ───────────────────────────────────────────────────────
  // Water retention is likely when the scale moved significantly in the
  // OPPOSITE direction to what calories would predict.
  const waterRetentionSuspected =
    weightCalorieDeltaKg !== null &&
    actualWeightChangeKg !== null &&
    expectedWeightChangeKg !== null &&
    Math.abs(weightCalorieDeltaKg) > WATER_RETENTION_THRESHOLD_KG &&
    Math.sign(actualWeightChangeKg) !== Math.sign(expectedWeightChangeKg);

  const dataIncomplete =
    dietLoggedDays < MIN_DIET_DAYS_FOR_CALIBRATION || weightLoggedDays < 2;

  // ── Calibration ─────────────────────────────────────────────────────────────
  // When we have enough data: reverse-engineer what maintenance actually was.
  // Logic: total_eaten − actual_fat_change_kcal = total_maintenance_calories_on_logged_days
  let impliedMaintenanceCal: number | null = null;
  if (!dataIncomplete && actualWeightChangeKg !== null) {
    const impliedTotal = totalCaloriesEaten - actualWeightChangeKg * KCAL_PER_KG;
    impliedMaintenanceCal = Math.round(impliedTotal / dietLoggedDays);
  }

  const newMaintenanceEstimate =
    impliedMaintenanceCal !== null
      ? Math.round(
          (1 - CALIBRATION_BLEND) * currentMaintenanceCal +
          CALIBRATION_BLEND * impliedMaintenanceCal,
        )
      : currentMaintenanceCal;

  const maintenanceDelta = newMaintenanceEstimate - currentMaintenanceCal;

  // ── Insights ─────────────────────────────────────────────────────────────────
  const insights: Insight[] = [];

  if (dietLoggedDays === 0) {
    insights.push({ type: 'warning', text: 'No diet logged this week. Start tracking to unlock calibration.' });
  } else if (dietLoggedDays < MIN_DIET_DAYS_FOR_CALIBRATION) {
    insights.push({ type: 'warning', text: `Only ${dietLoggedDays}/7 days logged. Log at least 5 days for accurate calibration.` });
  }

  if (waterRetentionSuspected) {
    insights.push({ type: 'warning', text: 'Your weight moved opposite to what calories predict — likely water retention. Stay the course.' });
  }

  if (!dataIncomplete && Math.abs(maintenanceDelta) > 50) {
    const dir = maintenanceDelta > 0 ? 'higher' : 'lower';
    insights.push({
      type: 'adjustment',
      text: `Real maintenance looks ${dir} than estimated. Targets adjusted by ${Math.abs(maintenanceDelta)} kcal/day.`,
    });
  }

  if (dietLoggedDays > 0 && totalSurplusDeficit < -2000 && !waterRetentionSuspected) {
    insights.push({ type: 'info', text: 'Large deficit this week. Make sure protein stays high to protect muscle.' });
  }

  if (dietLoggedDays > 0 && totalSurplusDeficit > 2000 && !waterRetentionSuspected) {
    insights.push({ type: 'info', text: 'Significant surplus this week. Check if this aligns with your bulk goal.' });
  }

  if (
    dietLoggedDays === 7 &&
    weightLoggedDays >= 2 &&
    !waterRetentionSuspected &&
    Math.abs(maintenanceDelta) <= 50
  ) {
    insights.push({ type: 'success', text: 'Solid week of data. Maintenance estimate is converging on your real number.' });
  }

  return {
    weekStartDate,
    dietLoggedDays,
    weightLoggedDays,
    confidence,
    totalCaloriesEaten,
    avgDailyCaloriesEaten,
    totalGoalCalories,
    totalSurplusDeficit,
    startWeightKg,
    endWeightKg,
    actualWeightChangeKg,
    expectedWeightChangeKg,
    weightCalorieDeltaKg,
    waterRetentionSuspected,
    dataIncomplete,
    impliedMaintenanceCal,
    newMaintenanceEstimate,
    maintenanceDelta,
    insights,
  };
}
