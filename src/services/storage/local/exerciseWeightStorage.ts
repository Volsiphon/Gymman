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
