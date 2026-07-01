/**
 * services/storage/local/caloryBurnStorage.ts
 *
 * Persists two things: the per-day activity log (runs, walks, cycling, etc. that the
 * user logs to earn a calorie burn) and the Dynamic Mode flag (on/off toggle).
 *
 * When Dynamic Mode is on, GoalsContext reads the burn for today and adds it to the
 * baseline calorie target so the diet allowance rises automatically with activity.
 * Each day's activities are stored under a YYYY-MM-DD key so they never bleed across days.
 */

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';
import type { ActivityEntry, DayActivities } from '@/types/plan';


const KEY_DYNAMIC = 'calburnDynamic';
const KEY_ACTS    = 'calburnActs';
const LEGACY_KEY_DYNAMIC = ['gymman_calburn_dynamic'];

function dateKey(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${KEY_ACTS}_${y}-${m}-${da}`;
}

function legacyDateKey(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `gymman_calburn_acts_${y}-${m}-${da}`;
}

export async function saveDynamicMode(enabled: boolean): Promise<void> {
  await writeLocal(KEY_DYNAMIC, enabled);
}

export async function loadDynamicMode(): Promise<boolean> {
  return (await readLocal<boolean>(KEY_DYNAMIC, LEGACY_KEY_DYNAMIC)) ?? false;
}

export async function saveTodayActivities(activities: ActivityEntry[]): Promise<void> {
  await writeLocal(dateKey(new Date()), activities);
}

export async function loadTodayActivities(): Promise<ActivityEntry[]> {
  const d = new Date();
  return (await readLocal<ActivityEntry[]>(dateKey(d), [legacyDateKey(d)])) ?? [];
}

export async function loadActivityHistory(days = 7): Promise<DayActivities[]> {
  const result: DayActivities[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const acts = await readLocal<ActivityEntry[]>(dateKey(d), [legacyDateKey(d)]);
    if (acts && acts.length > 0) {
      const y  = d.getFullYear();
      const m  = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      result.push({ date: `${y}-${m}-${da}`, activities: acts });
    }
  }
  return result;
}
