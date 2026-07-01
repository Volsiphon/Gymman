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

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityEntry, DayActivities } from '@/types/plan';


const KEY_DYNAMIC = 'gymman_calburn_dynamic';
const KEY_ACTS    = 'gymman_calburn_acts';

function dateKey(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${KEY_ACTS}_${y}-${m}-${da}`;
}

export async function saveDynamicMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_DYNAMIC, JSON.stringify(enabled));
}

export async function loadDynamicMode(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY_DYNAMIC);
  if (!raw) return false;
  try { return JSON.parse(raw) as boolean; } catch { return false; }
}

export async function saveTodayActivities(activities: ActivityEntry[]): Promise<void> {
  await AsyncStorage.setItem(dateKey(new Date()), JSON.stringify(activities));
}

export async function loadTodayActivities(): Promise<ActivityEntry[]> {
  const raw = await AsyncStorage.getItem(dateKey(new Date()));
  if (!raw) return [];
  try { return JSON.parse(raw) as ActivityEntry[]; } catch { return []; }
}

export async function loadActivityHistory(days = 7): Promise<DayActivities[]> {
  const result: DayActivities[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const raw = await AsyncStorage.getItem(dateKey(d));
    if (raw) {
      try {
        const acts = JSON.parse(raw) as ActivityEntry[];
        if (acts.length > 0) {
          const y  = d.getFullYear();
          const m  = String(d.getMonth() + 1).padStart(2, '0');
          const da = String(d.getDate()).padStart(2, '0');
          result.push({ date: `${y}-${m}-${da}`, activities: acts });
        }
      } catch {}
    }
  }
  return result;
}
