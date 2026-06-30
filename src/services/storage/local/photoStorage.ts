import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PhotoEntry } from '@/types/plan';

// PhotoEntry is now defined in @/types/plan — re-exported here for backwards compatibility.
export type { PhotoEntry } from '@/types/plan';

const KEY = 'gymman_progress_photos';

async function loadMap(): Promise<Record<string, PhotoEntry>> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, PhotoEntry>; } catch { return {}; }
}

export async function savePhoto(uri: string): Promise<PhotoEntry> {
  const map = await loadMap();
  const now = new Date();
  const entry: PhotoEntry = {
    id: now.getTime().toString(),
    uri,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    timestamp: now.getTime(),
  };
  map[entry.id] = entry;
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
  return entry;
}

export async function loadPhotos(): Promise<PhotoEntry[]> {
  const map = await loadMap();
  return Object.values(map).sort((a, b) => b.timestamp - a.timestamp);
}

export async function deletePhoto(id: string): Promise<void> {
  const map = await loadMap();
  delete map[id];
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}
