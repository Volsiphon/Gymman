import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityLevel, Sex, UserPhysicalStats } from '@/modules/onboarding/utils/physicalStatsParser';
import type { BodyGoalType } from '@/engine/goal-engine';

const KEY = 'gymman_user_profile';

export type UserProfile = {
  // ── Raw onboarding inputs (saved after PhysicalStats) ─────────────────────
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

  // ── Computed body composition (saved after GoalAnalysis) ───────────────────
  bmr?: number;
  tdee?: number;
  bfPercent?: number;
  fatMassKg?: number;
  lbmKg?: number;

  // ── Computed nutrition plan (saved after GoalAnalysis) ────────────────────
  goalType?: BodyGoalType;
  calorieTarget?: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
  goalOffset?: number;        // calorieTarget − tdee
  targetWeightKg?: number;
  targetBFPercent?: number;
  goalPathChoice?: 'a' | 'b'; // Option A = optimised, B = keep original inspiration
};

export function profileToStats(profile: UserProfile): UserPhysicalStats {
  return {
    name: profile.name,
    age: profile.age,
    sex: profile.sex,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    neckCm: profile.neckCm,
    waistCm: profile.waistCm,
    hipCm: profile.hipCm,
    country: profile.country,
    dietary: profile.dietary,
    activityLevel: profile.activityLevel,
  };
}

export async function saveUserProfile(patch: Partial<UserProfile>): Promise<void> {
  const existing = await loadUserProfile();
  const merged = { ...(existing ?? {}), ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}
