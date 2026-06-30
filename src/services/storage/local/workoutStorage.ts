import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutLog } from '@/types/plan';

const KEY = '@gymman:workoutLogs';

export async function loadWorkoutLogs(): Promise<WorkoutLog[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as WorkoutLog[]) : [];
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const list = await loadWorkoutLogs();
  list.push(log);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function getLogForDate(dateStr: string): Promise<WorkoutLog | null> {
  const list = await loadWorkoutLogs();
  return list.find((l) => l.date === dateStr) ?? null;
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  const list = await loadWorkoutLogs();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((l) => l.id !== id)));
}

export async function updateWorkoutLogFocus(id: string, focus: string): Promise<void> {
  const list = await loadWorkoutLogs();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(list.map((l) => (l.id === id ? { ...l, focus } : l))),
  );
}
