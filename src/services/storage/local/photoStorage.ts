/**
 * services/storage/local/photoStorage.ts
 *
 * Persists transformation photo entries, each belonging to a named section
 * (e.g. "General", "Chest", "Back"). Photos with no stored section default to
 * "General" for backward compatibility. Section names are stored separately
 * so the Photos screen can list them without loading all photo metadata.
 */

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';
import type { PhotoEntry } from '@/types/plan';

const PHOTOS_KEY   = 'photos';
const SECTIONS_KEY = 'photoSections';
const LEGACY_PHOTOS_KEYS   = ['gymman_progress_photos'];
const LEGACY_SECTIONS_KEYS = ['gymman_photo_sections'];

const DEFAULT_SECTION = 'General';

async function loadMap(): Promise<Record<string, PhotoEntry>> {
  return (await readLocal<Record<string, PhotoEntry>>(PHOTOS_KEY, LEGACY_PHOTOS_KEYS)) ?? {};
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
  await writeLocal(PHOTOS_KEY, map);
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
  await writeLocal(PHOTOS_KEY, map);
}

/** Records where a photo landed in cloud storage, once photoCloud.ts finishes an upload. */
export async function setPhotoCloudPath(id: string, cloudPath: string): Promise<void> {
  const map = await loadMap();
  if (!map[id]) return;
  map[id] = { ...map[id], cloudPath };
  await writeLocal(PHOTOS_KEY, map);
}

// ── Sections ──────────────────────────────────────────────────────────────────

export async function loadSections(): Promise<string[]> {
  const parsed = await readLocal<string[]>(SECTIONS_KEY, LEGACY_SECTIONS_KEYS);
  if (!parsed) return [DEFAULT_SECTION];
  if (!parsed.includes(DEFAULT_SECTION)) return [DEFAULT_SECTION, ...parsed];
  return parsed;
}

export async function addSection(name: string): Promise<string[]> {
  const sections = await loadSections();
  const trimmed  = name.trim();
  if (!trimmed || sections.includes(trimmed)) return sections;
  const updated = [...sections, trimmed];
  await writeLocal(SECTIONS_KEY, updated);
  return updated;
}

export async function deleteSection(name: string): Promise<string[]> {
  if (name === DEFAULT_SECTION) return loadSections();
  const sections = await loadSections();
  const updated  = sections.filter(s => s !== name);
  await writeLocal(SECTIONS_KEY, updated);
  return updated;
}
