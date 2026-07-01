/**
 * services/storage/local/planStorage.ts
 *
 * Persists the user's active workout routine — the full Routine object including
 * all days, exercises, sets, and reps. The AI trainer reads this on every chat
 * session and can issue [PATCH] commands that this storage applies via the
 * `applyPatchesToRoutine()` helper in trainerCoach.ts. The Training screen
 * loads the routine on focus to display the current workout plan.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Routine } from '@/types/plan';

const KEY = '@gymman:routines';

export async function loadRoutines(): Promise<Routine[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Routine[]) : [];
}

export async function saveRoutine(routine: Routine): Promise<void> {
  const list = await loadRoutines();
  list.push(routine);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function updateRoutine(routine: Routine): Promise<void> {
  const list = await loadRoutines();
  const idx = list.findIndex((r) => r.id === routine.id);
  if (idx >= 0) list[idx] = routine;
  else list.push(routine);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function deleteRoutine(id: string): Promise<void> {
  const list = await loadRoutines();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((r) => r.id !== id)));
}
