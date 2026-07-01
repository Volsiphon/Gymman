/**
 * services/storage/local/bodyWeightStorage.ts
 *
 * Persists body weight log entries over time. Each WeightLog has a date and a
 * weight in kg. The Progress screen charts these entries to show the user's
 * weight trend, and the weekly review engine reads the last 7 entries to
 * calculate whether the user is losing/gaining at the predicted rate.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeightLog } from '@/types/plan';


const KEY = 'gymman_body_weight_logs';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadMap(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, number>; } catch { return {}; }
}

export async function saveBodyWeight(kg: number): Promise<void> {
  const map = await loadMap();
  map[todayKey()] = kg;
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function loadBodyWeightLogs(): Promise<WeightLog[]> {
  const map = await loadMap();
  return Object.entries(map)
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTodayLog(): Promise<number | null> {
  const map = await loadMap();
  return map[todayKey()] ?? null;
}
