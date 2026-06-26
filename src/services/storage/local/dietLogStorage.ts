import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LogItem } from '@/services/ai/nutritionCoach';

const KEY = '@gymman:dietLog';

type PersistedLog = {
  date: string;      // YYYY-MM-DD
  items: LogItem[];
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadTodayLog(): Promise<LogItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const stored: PersistedLog = JSON.parse(raw);
  return stored.date === todayKey() ? stored.items : [];
}

export async function saveTodayLog(items: LogItem[]): Promise<void> {
  const payload: PersistedLog = { date: todayKey(), items };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}
