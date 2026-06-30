import type { Sex, ActivityLevel } from '@/engine/body-metrics';
import type { BodyGoalType } from '@/engine/goal-engine';

// ─── Engine primitives (re-exported so callers can import from one place) ─────
export type { Sex, ActivityLevel } from '@/engine/body-metrics';
export type { BodyGoalType } from '@/engine/goal-engine';

// ─── Language ─────────────────────────────────────────────────────────────────

export type Language = 'en' | 'ml' | 'manglish';

// ─── Onboarding ───────────────────────────────────────────────────────────────

export type QuestionKey =
  | 'name' | 'age' | 'sex' | 'weight' | 'height'
  | 'neck' | 'waist' | 'hip'
  | 'country' | 'dietary'
  | 'activityLevel' | 'activityDescription';

export interface UserPhysicalStats {
  name: string;
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  neckCm?: number;
  waistCm?: number;
  hipCm?: number;
  country: string;
  dietary: string;
  activityLevel: ActivityLevel;
}

// ─── Core user profile (persisted after onboarding) ───────────────────────────

export type UserProfile = {
  // Raw onboarding inputs
  name: string;
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  neckCm?: number;
  waistCm?: number;
  hipCm?: number;
  country: string;
  dietary: string;
  activityLevel: ActivityLevel;
  activityDescription?: string;
  goalText: string;

  // Computed body composition (populated after GoalAnalysis)
  bmr?: number;
  tdee?: number;
  bfPercent?: number;
  fatMassKg?: number;
  lbmKg?: number;

  // Computed nutrition plan (populated after GoalAnalysis)
  goalType?: BodyGoalType;
  calorieTarget?: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
  goalOffset?: number;
  targetWeightKg?: number;
  targetBFPercent?: number;
  goalPathChoice?: 'a' | 'b';
};

// ─── Nutrition targets ────────────────────────────────────────────────────────

export type NutritionGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  goalWeightKg?: number;
};
