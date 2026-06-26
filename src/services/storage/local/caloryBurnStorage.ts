import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DYNAMIC = 'gymman_calburn_dynamic';
const KEY_ACTS    = 'gymman_calburn_acts';

export type ActivityEntry = {
  id: string;
  name: string;
  caloriesBurned: number;
};

export type DayActivities = {
  date: string;
  activities: ActivityEntry[];
};

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
