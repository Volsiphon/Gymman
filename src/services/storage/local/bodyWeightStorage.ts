/**
 * services/storage/local/bodyWeightStorage.ts
 *
 * Persists body weight log entries over time. Each WeightLog has a date and a
 * weight in kg. The Progress screen charts these entries to show the user's
 * weight trend, and the weekly review engine reads the last 7 entries to
 * calculate whether the user is losing/gaining at the predicted rate.
 */

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';
import type { WeightLog } from '@/types/plan';


const KEY = 'bodyWeightLogs';
const LEGACY_KEYS = ['gymman_body_weight_logs'];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for a real "YYYY-MM-DD" string — not just any string (e.g. "0", "1",
 * array-index-shaped keys left over from earlier corruption this session). */
function isValidDateKey(d: unknown): d is string {
  return typeof d === 'string' && ISO_DATE_RE.test(d);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Loads the date->kg map, defensively. Earlier this session a since-deleted sync
 * engine pushed this domain to the cloud as a list ({date,kg}[], via what
 * loadBodyWeightLogs() returns) instead of the map this file actually stores things
 * as — and that stale shape (or a partially-corrupted map from other transitional
 * bugs this session, including fake array-index date keys) can still be sitting in
 * the database or local cache. Rather than special-case one known shape, every
 * key/value pair is validated (real "YYYY-MM-DD" key, finite numeric value)
 * regardless of where the raw data came from; anything else is dropped. If anything
 * had to be dropped or reshaped, the cleaned map is saved back once so future reads
 * hit a fast, already-clean path.
 */
async function loadMap(): Promise<Record<string, number>> {
  const raw = await readLocal<unknown>(KEY, LEGACY_KEYS);
  if (!raw) return {};

  const isCleanMap = !Array.isArray(raw) && typeof raw === 'object' &&
    Object.entries(raw as Record<string, unknown>).every(
      ([date, kg]) => isValidDateKey(date) && typeof kg === 'number' && Number.isFinite(kg),
    );
  if (isCleanMap) return raw as Record<string, number>;

  const rawEntries: Array<{ date: unknown; kg: unknown }> = Array.isArray(raw)
    ? raw
    : Object.entries(raw as Record<string, unknown>).map(([date, kg]) => ({ date, kg }));

  const map: Record<string, number> = {};
  for (const entry of rawEntries) {
    if (isValidDateKey(entry?.date) && typeof entry?.kg === 'number' && Number.isFinite(entry.kg)) {
      map[entry.date] = entry.kg;
    }
  }
  await writeLocal(KEY, map);
  return map;
}

export async function saveBodyWeight(kg: number): Promise<void> {
  const map = await loadMap();
  map[todayKey()] = kg;
  await writeLocal(KEY, map);
}

export async function loadBodyWeightLogs(): Promise<WeightLog[]> {
  const map = await loadMap();
  return Object.entries(map)
    .filter((entry): entry is [string, number] =>
      isValidDateKey(entry[0]) && typeof entry[1] === 'number' && Number.isFinite(entry[1]))
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTodayLog(): Promise<number | null> {
  const map = await loadMap();
  return map[todayKey()] ?? null;
}
