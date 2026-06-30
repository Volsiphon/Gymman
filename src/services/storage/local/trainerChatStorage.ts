import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedChatMessage, SavedChat } from '@/types/coaching';

// SavedChatMessage and SavedChat are now defined in @/types/coaching — re-exported here for backwards compatibility.
export type { SavedChatMessage, SavedChat } from '@/types/coaching';

const KEY = '@gymman:trainerChats';
const MAX_CHATS = 25;

export async function loadSavedChats(): Promise<SavedChat[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as SavedChat[]) : [];
}

export async function upsertSavedChat(chat: SavedChat): Promise<void> {
  const list = await loadSavedChats();
  const idx = list.findIndex((c) => c.id === chat.id);
  if (idx >= 0) list[idx] = chat;
  else list.unshift(chat);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_CHATS)));
}

export async function deleteSavedChat(id: string): Promise<void> {
  const list = await loadSavedChats();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((c) => c.id !== id)));
}
