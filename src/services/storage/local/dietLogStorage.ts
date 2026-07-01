/**
 * services/storage/local/dietLogStorage.ts
 *
 * Persists today's food log — the list of meals and their macros that the user
 * (or the AI coach) has added today. The log is date-keyed: if you load it on a
 * different day from when it was saved, you get an empty array. This is intentional
 * — diet logging is always for today only; historical data lives in dietChatStorage.ts.
 */

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';
import type { LogItem } from '@/services/ai/nutritionCoach';

const KEY = 'dietLog';

type PersistedLog = {
  date: string;      // YYYY-MM-DD
  items: LogItem[];
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadTodayLog(): Promise<LogItem[]> {
  const stored = await readLocal<PersistedLog | LogItem[]>(KEY);
  if (!stored) return [];
  if (Array.isArray(stored)) {
    // Stale shape from an earlier sync engine that pushed the raw items array
    // instead of the {date, items} wrapper this file actually stores under this
    // key. There's no way to recover which day it was for, so treat it as
    // expired rather than risk showing it as if it were today's log.
    return [];
  }
  return stored.date === todayKey() ? stored.items : [];
}

export async function saveTodayLog(items: LogItem[]): Promise<void> {
  const payload: PersistedLog = { date: todayKey(), items };
  await writeLocal(KEY, payload);
}
