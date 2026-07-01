/**
 * services/storage/local/workoutStorage.ts
 *
 * Persists completed workout session logs. Each WorkoutLog records the date, which
 * routine day was done, and the set-by-set result for every exercise (done / short /
 * skipped). The Trainer Coach reads this history to give smarter advice — if you keep
 * skipping leg day, it will notice. The Plan screen uses getLogForDate() to check
 * whether the gym flame is lit today.
 */

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';
import type { WorkoutLog } from '@/types/plan';

const KEY = 'workoutLogs';

export async function loadWorkoutLogs(): Promise<WorkoutLog[]> {
  return (await readLocal<WorkoutLog[]>(KEY)) ?? [];
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const list = await loadWorkoutLogs();
  list.push(log);
  await writeLocal(KEY, list);
}

export async function getLogForDate(dateStr: string): Promise<WorkoutLog | null> {
  const list = await loadWorkoutLogs();
  return list.find((l) => l.date === dateStr) ?? null;
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  const list = await loadWorkoutLogs();
  await writeLocal(KEY, list.filter((l) => l.id !== id));
}

export async function updateWorkoutLogFocus(id: string, focus: string): Promise<void> {
  const list = await loadWorkoutLogs();
  await writeLocal(KEY, list.map((l) => (l.id === id ? { ...l, focus } : l)));
}
