/**
 * services/storage/local/exerciseWeightStorage.ts
 *
 * Persists the last-used weight per exercise (stored as a string, e.g. "60 kg").
 * When the user opens the TodayWorkoutView to log a set, the weight field pre-fills
 * with whatever they used last time for that exercise, so they don't have to type
 * it from scratch every session. Keyed by exercise name.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@gymman:exerciseWeights';

type WeightMap = Record<string, string>;

export async function loadWeights(): Promise<WeightMap> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as WeightMap) : {};
}

export async function saveWeight(routineId: string, exerciseName: string, kg: string): Promise<void> {
  const map = await loadWeights();
  const k = `${routineId}:${exerciseName}`;
  if (kg.trim()) {
    map[k] = kg.trim();
  } else {
    delete map[k];
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export function weightKey(routineId: string, exerciseName: string): string {
  return `${routineId}:${exerciseName}`;
}
