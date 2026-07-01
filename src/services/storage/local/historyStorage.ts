/**
 * services/storage/local/historyStorage.ts
 *
 * Persists a log of routine change events — any time the AI trainer modifies the
 * user's workout plan (adds an exercise, changes sets/reps, swaps a day), an event
 * is appended here with a timestamp and a description. The HistoryView tab in the
 * Training screen reads this list to show the user a changelog of their routine's
 * evolution over time.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoutineChangeEvent } from '@/types/plan';

const KEY = '@gymman:routineChanges';

export async function loadRoutineChanges(): Promise<RoutineChangeEvent[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as RoutineChangeEvent[]) : [];
}

export async function saveRoutineChange(event: RoutineChangeEvent): Promise<void> {
  const list = await loadRoutineChanges();
  list.push(event);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function deleteRoutineChange(id: string): Promise<void> {
  const list = await loadRoutineChanges();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((e) => e.id !== id)));
}

export async function updateRoutineChangeSummary(id: string, summary: string): Promise<void> {
  const list = await loadRoutineChanges();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(list.map((e) => (e.id === id ? { ...e, summary } : e))),
  );
}
