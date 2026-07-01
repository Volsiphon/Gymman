/**
 * services/storage/local/photoStorage.ts
 *
 * Persists transformation photo entries, each belonging to a named section
 * (e.g. "General", "Chest", "Back"). Photos with no stored section default to
 * "General" for backward compatibility. Section names are stored separately
 * so the Photos screen can list them without loading all photo metadata.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PhotoEntry } from '@/types/plan';

const PHOTOS_KEY   = 'gymman_progress_photos';
const SECTIONS_KEY = 'gymman_photo_sections';

const DEFAULT_SECTION = 'General';

async function loadMap(): Promise<Record<string, PhotoEntry>> {
  const raw = await AsyncStorage.getItem(PHOTOS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, PhotoEntry>; } catch { return {}; }
}

// ── Photos ────────────────────────────────────────────────────────────────────

export async function savePhoto(uri: string, section: string = DEFAULT_SECTION): Promise<PhotoEntry> {
  const map = await loadMap();
  const now  = new Date();
  const entry: PhotoEntry = {
    id: now.getTime().toString(),
    uri,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    timestamp: now.getTime(),
    section,
  };
  map[entry.id] = entry;
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(map));
  return entry;
}

export async function loadPhotos(section?: string): Promise<PhotoEntry[]> {
  const map = await loadMap();
  const all = Object.values(map)
    .map(p => ({ ...p, section: p.section ?? DEFAULT_SECTION }))
    .sort((a, b) => b.timestamp - a.timestamp);
  if (!section) return all;
  return all.filter(p => p.section === section);
}

export async function deletePhoto(id: string): Promise<void> {
  const map = await loadMap();
  delete map[id];
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(map));
}

// ── Sections ──────────────────────────────────────────────────────────────────

export async function loadSections(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SECTIONS_KEY);
  if (!raw) return [DEFAULT_SECTION];
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!parsed.includes(DEFAULT_SECTION)) return [DEFAULT_SECTION, ...parsed];
    return parsed;
  } catch {
    return [DEFAULT_SECTION];
  }
}

export async function addSection(name: string): Promise<string[]> {
  const sections = await loadSections();
  const trimmed  = name.trim();
  if (!trimmed || sections.includes(trimmed)) return sections;
  const updated = [...sections, trimmed];
  await AsyncStorage.setItem(SECTIONS_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteSection(name: string): Promise<string[]> {
  if (name === DEFAULT_SECTION) return loadSections();
  const sections = await loadSections();
  const updated  = sections.filter(s => s !== name);
  await AsyncStorage.setItem(SECTIONS_KEY, JSON.stringify(updated));
  return updated;
}
