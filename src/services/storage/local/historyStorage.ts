import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoutineChangeEvent } from '@/types/workoutLog';

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
