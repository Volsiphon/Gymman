/**
 * services/storage/local/userProfileStorage.ts
 *
 * Persists the user's full profile as a single JSON blob keyed by 'gymman_user_profile'.
 * This is the most important storage file — the profile is the foundation that all AI
 * coaches and body composition calculations are built on.
 *
 * saveUserProfile() does a shallow merge, so you can update one field (e.g. a new
 * calorie target after a weekly review) without losing everything else.
 * profileToStats() converts a full UserProfile back to the leaner UserPhysicalStats
 * shape used by the body-metrics engine.
 */

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';
import type { UserProfile, UserPhysicalStats } from '@/types/user';


const KEY = 'userProfile';
const LEGACY_KEYS = ['gymman_user_profile'];

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
  await writeLocal(KEY, merged);
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  return readLocal<UserProfile>(KEY, LEGACY_KEYS);
}
